import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class WebsocketService {
  constructor(private readonly websocketGateway: WebsocketGateway) {}

  sendNotificationToUsers(userIds: number[], notification: any) {
    return this.websocketGateway.sendNotificationToUsers(userIds, notification);
  }

  sendNotificationToPermission(permission: string, notification: any) {
    return this.websocketGateway.sendNotificationToPermission(
      permission,
      notification,
    );
  }

  sendActivityLogToAdmins(activityLog: any) {
    return this.websocketGateway.sendActivityLogToAdmins(activityLog);
  }

  sendActivityLogToUsers(userIds: number[], activityLog: any) {
    return this.websocketGateway.sendActivityLogToUsers(userIds, activityLog);
  }
}
