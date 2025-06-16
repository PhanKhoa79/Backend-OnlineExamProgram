import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../../modules/activity-log/activity-log.service';
import { Reflector } from '@nestjs/core';
import { ACTIVITY_LOG_KEY } from '../decorators/activity-log.decorator';

export interface ActivityLogData {
  action: string;
  module: string;
  targetName?: string;
  description?: string;
}

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Lấy metadata từ decorator
    const logData = this.reflector.get<ActivityLogData>(
      ACTIVITY_LOG_KEY,
      context.getHandler(),
    );

    if (!logData) {
      return next.handle();
    }

    // Đối với các route công khai (không có user), sử dụng accountId = null
    const accountId = user?.userId || null;

    // Lưu thông tin trước khi thực thi (cho DELETE/UPDATE)
    const preExecutionData = this.extractPreExecutionData(request, logData);

    return next.handle().pipe(
      tap(async (response) => {
        try {
                      // Chỉ log nếu response thành công
            if (response && response.success !== false) {
              let targetName = logData.targetName;
              let targetId: number | undefined;

              // Ưu tiên sử dụng dữ liệu từ pre-execution (cho DELETE/UPDATE)
              if (preExecutionData.targetName) {
                targetName = preExecutionData.targetName;
                targetId = preExecutionData.targetId;
              } else if (response.data) {
                // Lấy targetId từ response
                if (response.data.id) {
                  targetId = response.data.id;
                }
                // Thử lấy tên từ response
                targetName = this.extractTargetName(response.data, logData.module) || targetName;
              }

            // Tạo description tự động nếu không có
            const description =
              logData.description ||
              this.activityLogService.generateDescription(
                logData.action,
                logData.module,
                targetName,
              );

            await this.activityLogService.createLog({
              accountId: user.userId,
              action: logData.action,
              module: logData.module,
              targetId,
              targetName,
              description,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            });
          }
        } catch (error) {
          // Log error nhưng không ảnh hưởng đến response chính
          console.error('Activity log error:', error);
        }
      }),
    );
  }

  /**
   * Trích xuất tên target từ response data dựa trên module
   * @param data Response data
   * @param module Module name
   * @returns Target name or null
   */
  private extractTargetName(data: any, module: string): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Mapping các trường tên theo module
    const moduleFieldMap: Record<string, string[]> = {
      subject: ['subjectName', 'name', 'title'],
      exam: ['title', 'name', 'examTitle'],
      class: ['className', 'name', 'title'],
      student: ['fullName', 'name', 'studentName'],
      question: ['content', 'title', 'name'],
      account: ['accountname', 'username', 'email', 'name'],
      role: ['name', 'roleName', 'title'],
      'exam-schedule': ['title', 'name', 'scheduleName'],
      'exam-schedule-assignment': ['roomName', 'name', 'title'],
      notification: ['title', 'message', 'content'],
    };

    // Lấy danh sách trường ưu tiên cho module
    const fields = moduleFieldMap[module] || [
      'name',
      'title',
      'fullName',
      'accountname',
    ];

    // Thử lấy giá trị từ các trường theo thứ tự ưu tiên
    for (const field of fields) {
      if (data[field] && typeof data[field] === 'string') {
        return data[field];
      }
    }

    // Fallback: tìm trong các trường phổ biến
    const commonFields = [
      'name',
      'title',
      'fullName',
      'accountname',
      'username',
      'email',
      'content',
    ];
    for (const field of commonFields) {
      if (data[field] && typeof data[field] === 'string') {
        return data[field];
      }
    }

    return null;
  }

  /**
   * Trích xuất thông tin trước khi thực thi (cho DELETE/UPDATE)
   * @param request HTTP request
   * @param logData Activity log data
   * @returns Pre-execution data
   */
  private extractPreExecutionData(request: any, logData: ActivityLogData): { targetName?: string; targetId?: number } {
    const method = request.method;
    
    // Chỉ xử lý cho DELETE và UPDATE (PUT/PATCH)
    if (!['DELETE', 'PUT', 'PATCH'].includes(method)) {
      return {};
    }

    // Lấy ID từ route params
    const targetId = request.params?.id ? Number(request.params.id) : undefined;
    
    // Với UPDATE, có thể lấy tên từ request body
    if (['PUT', 'PATCH'].includes(method) && request.body) {
      const targetName = this.extractTargetName(request.body, logData.module);
      if (targetName) {
        return { targetName, targetId };
      }
    }

    // TODO: Với DELETE, cần query database để lấy tên trước khi xóa
    // Hiện tại trả về targetId để ít nhất có thông tin ID
    return { targetId };
  }
}
