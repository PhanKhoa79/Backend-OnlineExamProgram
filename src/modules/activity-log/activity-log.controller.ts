import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get('recent')
  async getRecentActivities(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const activities = await this.activityLogService.getRecentActivities(limit);
    return {
      success: true,
      data: activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        module: activity.module,
        targetName: activity.targetName,
        description: activity.description,
        // Tạo message đẹp cho dashboard
        displayMessage: this.formatDisplayMessage(activity),
        createdAt: activity.createdAt,
        account: {
          id: activity.account.id,
          accountname: activity.account.accountname,
          email: activity.account.email,
        },
      })),
    };
  }

  @Get('all')
  async getAllActivities() {
    const activities = await this.activityLogService.getAllActivities();
    return {
      success: true,
      total: activities.length,
      data: activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        module: activity.module,
        targetName: activity.targetName,
        description: activity.description,
        displayMessage: this.formatDisplayMessage(activity),
        createdAt: activity.createdAt,
        account: {
          id: activity.account.id,
          accountname: activity.account.accountname,
          email: activity.account.email,
        },
      })),
    };
  }

  @Get()
  async getActivitiesWithPagination(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('module') module?: string,
    @Query('accountId') accountId?: string,
  ) {
    let result;
    if (module) {
      const activities = await this.activityLogService.getActivitiesByModule(
        module,
        limit,
      );
      result = {
        data: activities,
        total: activities.length,
        page: 1,
        limit,
      };
    } else if (accountId) {
      const activities = await this.activityLogService.getActivitiesByAccount(
        Number(accountId),
        limit,
      );
      result = {
        data: activities,
        total: activities.length,
        page: 1,
        limit,
      };
    } else {
      result = await this.activityLogService.getActivitiesWithPagination(
        page,
        limit,
      );
    }

    return {
      success: true,
      data: result.data.map((activity) => ({
        id: activity.id,
        action: activity.action,
        module: activity.module,
        targetName: activity.targetName,
        description: activity.description,
        ipAddress: activity.ipAddress,
        createdAt: activity.createdAt,
        account: {
          id: activity.account.id,
          accountname: activity.account.accountname,
          email: activity.account.email,
        },
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Tạo message hiển thị đẹp cho dashboard
   * @param activity Activity log entity
   * @returns Formatted display message
   */
  private formatDisplayMessage(activity: any): string {
    const accountName = activity.account?.accountname || 'Người dùng';
    const timestamp = activity.createdAt
      ? new Date(activity.createdAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';

    // Nếu có description sẵn, sử dụng nó
    if (activity.description) {
      return `Người dùng ${accountName} ${activity.description} vào ${timestamp}`;
    }

    // Tạo description từ action và module
    const description = this.activityLogService.generateDescription(
      activity.action,
      activity.module,
      activity.targetName,
    );
    return `${accountName} ${description} vào ${timestamp}`;
  }
}
