import { SetMetadata } from '@nestjs/common';
import { ActivityLogData } from '../interceptors/activity-log.interceptor';

export const ACTIVITY_LOG_KEY = 'activity-log';

export function ActivityLog(data: ActivityLogData) {
  return SetMetadata(ACTIVITY_LOG_KEY, data);
}
