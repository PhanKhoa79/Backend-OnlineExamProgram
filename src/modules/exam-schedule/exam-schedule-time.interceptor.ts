import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as moment from 'moment-timezone';

@Injectable()
export class ExamScheduleTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Trường hợp là mảng
        if (Array.isArray(data)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return data.map((item) => this.convertTimes(item));
        }
        // Trường hợp là 1 object
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.convertTimes(data);
      }),
    );
  }

  private convertTimes(item: any) {
    if (!item) return item;
    if (item.startTime)
      item.startTime = moment(item.startTime)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss');
    if (item.endTime)
      item.endTime = moment(item.endTime)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss');
    if (item.createdAt)
      item.createdAt = moment(item.createdAt)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss');
    if (item.updatedAt)
      item.updatedAt = moment(item.updatedAt)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss');

    return item;
  }
}
