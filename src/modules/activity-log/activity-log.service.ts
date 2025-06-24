import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogs } from '../../database/entities/ActivityLogs';
import { RedisService } from '../redis/redis.service';
import { WebsocketService } from '../websocket/websocket.service';

export interface CreateActivityLogDto {
  accountId: number;
  action: string;
  module: string;
  targetId?: number;
  targetName?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  private readonly CACHE_KEYS = {
    RECENT_ACTIVITIES: 'activity_logs:recent:',
    ALL_ACTIVITIES: 'activity_logs:all',
    BY_ACCOUNT: 'activity_logs:account:',
    BY_MODULE: 'activity_logs:module:',
    PAGINATION: 'activity_logs:page:',
  };
  private readonly CACHE_TTL = 300; // 5 phút (giây)

  constructor(
    @InjectRepository(ActivityLogs)
    private activityLogRepository: Repository<ActivityLogs>,
    private readonly redisService: RedisService,
    private readonly websocketService: WebsocketService,
  ) {}

  async createLog(data: CreateActivityLogDto): Promise<ActivityLogs> {
    const log = this.activityLogRepository.create(data);
    const savedLog = await this.activityLogRepository.save(log);

    // Xóa cache sau khi tạo mới để đảm bảo dữ liệu fresh
    await this.invalidateCache();

    // Load activity log với relations để gửi qua WebSocket
    const activityLogWithRelations = await this.activityLogRepository.findOne({
      where: { id: savedLog.id },
      relations: ['account'],
    });

    if (activityLogWithRelations) {
      // Tạo formatted activity log để gửi realtime
      const formattedActivityLog = {
        ...activityLogWithRelations,
        displayMessage: this.formatDisplayMessage(activityLogWithRelations),
      };

      // Gửi realtime update đến tất cả admin users
      try {
        this.websocketService.sendActivityLogToAdmins(formattedActivityLog);
        this.logger.log(`Sent realtime activity log: ${savedLog.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to send realtime activity log: ${(error as Error).message}`,
        );
      }
    }

    return savedLog;
  }

  /**
   * Format display message cho activity log
   */
  private formatDisplayMessage(activityLog: ActivityLogs): string {
    const userName = activityLog.account?.accountname || 'Hệ thống';
    const timestamp = activityLog.createdAt 
      ? new Date(activityLog.createdAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }) 
      : '';
    return `Người dùng ${userName} ${activityLog.description} vào ${timestamp}`;
  }

  /**
   * Xóa cache khi có thay đổi dữ liệu
   */
  private async invalidateCache(): Promise<void> {
    try {
      // Xóa cache recent activities
      const recentKeys = await this.redisService.keys(
        `${this.CACHE_KEYS.RECENT_ACTIVITIES}*`,
      );
      for (const key of recentKeys) {
        await this.redisService.del(key);
      }

      // Xóa cache all activities
      await this.redisService.del(this.CACHE_KEYS.ALL_ACTIVITIES);

      // Xóa cache by account
      const accountKeys = await this.redisService.keys(
        `${this.CACHE_KEYS.BY_ACCOUNT}*`,
      );
      for (const key of accountKeys) {
        await this.redisService.del(key);
      }

      // Xóa cache by module
      const moduleKeys = await this.redisService.keys(
        `${this.CACHE_KEYS.BY_MODULE}*`,
      );
      for (const key of moduleKeys) {
        await this.redisService.del(key);
      }

      // Xóa cache pagination
      const paginationKeys = await this.redisService.keys(
        `${this.CACHE_KEYS.PAGINATION}*`,
      );
      for (const key of paginationKeys) {
        await this.redisService.del(key);
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating cache: ${(error as Error).message}`,
      );
    }
  }

  async getRecentActivities(limit: number = 10): Promise<ActivityLogs[]> {
    const cacheKey = `${this.CACHE_KEYS.RECENT_ACTIVITIES}${limit}`;

    try {
      // Kiểm tra cache trước
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(
          `Cache hit for recent activities with limit ${limit}`,
        );
        return JSON.parse(cached) as ActivityLogs[];
      }
    } catch (error) {
      this.logger.warn(`Redis cache error: ${(error as Error).message}`);
    }

    // Nếu không có cache, query từ database
    const activities = await this.activityLogRepository.find({
      relations: ['account'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Lưu vào cache
    try {
      await this.redisService.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(activities),
      );
      this.logger.debug(`Cached recent activities with limit ${limit}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cache activities: ${(error as Error).message}`,
      );
    }

    return activities;
  }

  async getAllActivities(): Promise<ActivityLogs[]> {
    const cacheKey = this.CACHE_KEYS.ALL_ACTIVITIES;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit for all activities');
        return JSON.parse(cached) as ActivityLogs[];
      }
    } catch (error) {
      this.logger.warn(`Redis cache error: ${(error as Error).message}`);
    }

    const activities = await this.activityLogRepository.find({
      relations: ['account'],
      order: { createdAt: 'DESC' },
    });

    try {
      await this.redisService.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(activities),
      );
      this.logger.debug('Cached all activities');
    } catch (error) {
      this.logger.warn(
        `Failed to cache all activities: ${(error as Error).message}`,
      );
    }

    return activities;
  }

  async getActivitiesByAccount(
    accountId: number,
    limit: number = 20,
  ): Promise<ActivityLogs[]> {
    return await this.activityLogRepository.find({
      where: { accountId },
      relations: ['account'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getActivitiesByModule(
    module: string,
    limit: number = 20,
  ): Promise<ActivityLogs[]> {
    return await this.activityLogRepository.find({
      where: { module },
      relations: ['account'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getActivitiesWithPagination(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: ActivityLogs[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = `${this.CACHE_KEYS.PAGINATION}${page}_${limit}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(
          `Cache hit for pagination: page ${page}, limit ${limit}`,
        );
        return JSON.parse(cached) as {
          data: ActivityLogs[];
          total: number;
          page: number;
          limit: number;
        };
      }
    } catch (error) {
      this.logger.warn(`Redis cache error: ${(error as Error).message}`);
    }

    const [data, total] = await this.activityLogRepository.findAndCount({
      relations: ['account'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = {
      data,
      total,
      page,
      limit,
    };

    try {
      await this.redisService.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(result),
      );
      this.logger.debug(`Cached pagination: page ${page}, limit ${limit}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cache pagination: ${(error as Error).message}`,
      );
    }

    return result;
  }

  // Helper methods để tạo description dễ đọc
  generateDescription(
    action: string,
    module: string,
    targetName?: string,
  ): string {
    const actionMap = {
      // CRUD cơ bản
      CREATE: 'đã thêm',
      UPDATE: 'đã cập nhật',
      DELETE: 'đã xóa',
      // Hành động đặc biệt
      LOGIN: 'đã đăng nhập',
      LOGOUT: 'đã đăng xuất',
      ACTIVATE: 'đã kích hoạt',
      DEACTIVATE: 'đã vô hiệu hóa',
      IMPORT: 'đã import',
      EXPORT: 'đã export',
      PUBLISH: 'đã xuất bản',
      UNPUBLISH: 'đã hủy xuất bản',
      APPROVE: 'đã phê duyệt',
      REJECT: 'đã từ chối',
      ASSIGN: 'đã phân công',
      UNASSIGN: 'đã hủy phân công',
      RESET_PASSWORD: 'đã đặt lại mật khẩu',
      CHANGE_PASSWORD: 'đã đổi mật khẩu',
      FORGOT_PASSWORD: 'đã yêu cầu đặt lại mật khẩu',
      VERIFY_RESET_CODE: 'đã xác minh mã đặt lại mật khẩu',
      CHANGE_STATUS: 'đã thay đổi trạng thái',
      VIEW: 'đã xem',
      DOWNLOAD: 'đã tải xuống',
      UPLOAD: 'đã tải lên',
      START_EXAM: 'đã bắt đầu thi',
      SUBMIT_EXAM: 'đã nộp bài thi',
      GRADE_EXAM: 'đã chấm điểm',
      SEND_EMAIL: 'đã gửi email',
      MARK_READ: 'đã đánh dấu đã đọc',
      REQUEST_ACTIVATION: 'đã yêu cầu kích hoạt',
    };

    const moduleMap = {
      subject: 'môn học',
      exam: 'đề thi',
      class: 'lớp học',
      student: 'học sinh',
      question: 'câu hỏi',
      'exam-schedule': 'lịch thi',
      'exam-schedule-assignment': 'phân công coi thi',
      account: 'tài khoản',
      role: 'vai trò',
      notification: 'thông báo',
      auth: 'hệ thống',
      email: 'email',
      system: 'hệ thống',
      answer: 'câu trả lời',
      permission: 'quyền',
    };

    const actionText = actionMap[action] || action.toLowerCase();
    const moduleText = moduleMap[module] || module;
    if (targetName) {
      return `${actionText} ${moduleText} ${targetName}`;
    }
    return `${actionText} ${moduleText}`;
  }
}
