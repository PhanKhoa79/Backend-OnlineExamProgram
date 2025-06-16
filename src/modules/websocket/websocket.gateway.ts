import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
@Injectable()
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WebsocketGateway.name);
  private userSocketMap = new Map<number, string[]>();

  constructor(private readonly redisService: RedisService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    try {
      // Cấu hình Redis Adapter nếu cần
      // Bạn có thể bỏ comment phần này nếu muốn sử dụng Redis Adapter
    } catch (error) {
      this.logger.error(
        `Error setting up WebSocket: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    try {
      // Remove socket from userSocketMap
      for (const [userId, sockets] of this.userSocketMap.entries()) {
        const index = sockets.indexOf(client.id);
        if (index !== -1) {
          sockets.splice(index, 1);
          if (sockets.length === 0) {
            this.userSocketMap.delete(userId);
          } else {
            this.userSocketMap.set(userId, sockets);
          }
          this.logger.log(`Removed socket ${client.id} from user ${userId}`);
          break;
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in handleDisconnect: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { userId: number }) {
    try {
      this.logger.log(`Attempting to register user with payload:`, payload);

      if (!payload || !payload.userId) {
        this.logger.warn('Invalid registration payload received');
        return {
          event: 'registered',
          data: { success: false, error: 'Invalid userId' },
        };
      }

      const { userId } = payload;
      this.logger.log(`User ${userId} registered with socket ${client.id}`);

      // Add socket to userSocketMap
      const userSockets = this.userSocketMap.get(userId) || [];
      userSockets.push(client.id);
      this.userSocketMap.set(userId, userSockets);

      this.logger.log(`Current userSocketMap size: ${this.userSocketMap.size}`);

      // Gửi phản hồi thành công
      return { event: 'registered', data: { success: true } };
    } catch (error) {
      this.logger.error(
        `Error in handleRegister: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        event: 'registered',
        data: { success: false, error: (error as Error).message },
      };
    }
  }

  // Send notification to specific users
  sendNotificationToUsers(userIds: number[], notification: any) {
    try {
      this.logger.log(`Sending notification to users: ${userIds.join(', ')}`);

      for (const userId of userIds) {
        const userSockets = this.userSocketMap.get(userId);
        if (userSockets && userSockets.length > 0) {
          this.logger.log(
            `Found ${userSockets.length} sockets for user ${userId}`,
          );
          userSockets.forEach((socketId) => {
            this.server.to(socketId).emit('notification', notification);
          });
        } else {
          this.logger.log(`No active sockets found for user ${userId}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in sendNotificationToUsers: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // Send notification to all users with a specific permission
  sendNotificationToPermission(permission: string, notification: any) {
    try {
      this.logger.log(
        `Sending notification for permission ${permission}:`,
        notification,
      );
      this.server.emit('notification-permission', { permission, notification });
      this.logger.log('Notification broadcast completed');
    } catch (error) {
      this.logger.error(
        `Error in sendNotificationToPermission: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // Send activity log realtime to all admin users
  sendActivityLogToAdmins(activityLog: any) {
    try {
      this.logger.log('Broadcasting new activity log to all admin users');
      // Emit to all connected clients with admin permissions
      this.server.emit('activity-log-new', {
        event: 'new-activity',
        data: activityLog,
        timestamp: new Date().toISOString(),
      });

      this.logger.log('Activity log broadcast completed');
    } catch (error) {
      this.logger.error(
        `Error in sendActivityLogToAdmins: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // Send activity log to specific users
  sendActivityLogToUsers(userIds: number[], activityLog: any) {
    try {
      this.logger.log(`Sending activity log to users: ${userIds.join(', ')}`);

      for (const userId of userIds) {
        const userSockets = this.userSocketMap.get(userId);
        if (userSockets && userSockets.length > 0) {
          this.logger.log(
            `Found ${userSockets.length} sockets for user ${userId}`,
          );
          userSockets.forEach((socketId) => {
            this.server.to(socketId).emit('activity-log-new', {
              event: 'new-activity',
              data: activityLog,
              timestamp: new Date().toISOString(),
            });
          });
        } else {
          this.logger.log(`No active sockets found for user ${userId}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in sendActivityLogToUsers: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
