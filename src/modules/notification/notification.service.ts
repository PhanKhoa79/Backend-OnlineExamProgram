import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notifications } from 'src/database/entities/Notifications';
import { WebsocketService } from '../websocket/websocket.service';
import { RoleService } from '../role/role.service';
import { Accounts } from 'src/database/entities/Accounts';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notifications)
    private readonly notificationRepository: Repository<Notifications>,
    private readonly websocketService: WebsocketService,
    private readonly roleService: RoleService,
  ) {}

  // Lấy tất cả thông báo của một người dùng
  async getNotificationsByUserId(userId: number): Promise<Notifications[]> {
    return this.notificationRepository.find({
      where: { account: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  // Đánh dấu thông báo đã đọc
  async markAsRead(notificationId: number): Promise<Notifications> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  // Tạo thông báo cho người dùng cụ thể
  async createNotificationForUser(
    userId: number,
    message: string,
  ): Promise<Notifications> {
    const notification = this.notificationRepository.create({
      message,
      account: { id: userId },
      isRead: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Gửi thông báo real-time
    this.websocketService.sendNotificationToUsers([userId], {
      id: savedNotification.id,
      message: savedNotification.message,
      createdAt: savedNotification.createdAt,
      isRead: savedNotification.isRead,
    });

    return savedNotification;
  }

  // Tạo thông báo cho tất cả người dùng có quyền cụ thể
  async createNotificationForPermission(
    permission: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<Notifications[]> {
    try {
      // Lấy danh sách người dùng có quyền cụ thể
      const usersWithPermission =
        await this.roleService.getUsersWithPermission(permission);

      if (!usersWithPermission || usersWithPermission.length === 0) {
        this.logger.warn(`No users found with permission: ${permission}`);
        return [];
      }

      const notifications: Notifications[] = [];

      // Tạo thông báo cho từng người dùng
      for (const user of usersWithPermission) {
        const notification = this.notificationRepository.create({
          message,
          account: { id: user.id },
          isRead: false,
        });

        const savedNotification =
          await this.notificationRepository.save(notification);
        notifications.push(savedNotification);
      }

      // Gửi thông báo real-time với ID của thông báo đầu tiên (hoặc có thể gửi từng cái riêng)
      const firstNotification = notifications[0];
      if (firstNotification) {
        const notificationData = {
          id: firstNotification.id,
          message,
          createdAt: firstNotification.createdAt,
          isRead: false,
          metadata: metadata || {},
        };

        this.websocketService.sendNotificationToPermission(
          permission,
          notificationData,
        );
      }

      return notifications;
    } catch (error) {
      this.logger.error(
        `Error creating notifications for permission ${permission}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Đánh dấu tất cả thông báo của một tài khoản là đã đọc
  async markAllAsRead(userId: number): Promise<{ count: number }> {
    try {
      const result = await this.notificationRepository
        .createQueryBuilder()
        .update(Notifications)
        .set({ isRead: true })
        .where('account_id = :userId AND is_read = :isRead', {
          userId,
          isRead: false,
        })
        .execute();

      return { count: result.affected || 0 };
    } catch (error) {
      this.logger.error(
        `Error marking all notifications as read for user ${userId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // Xóa một thông báo
  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, account: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found or does not belong to this user`,
      );
    }

    await this.notificationRepository.remove(notification);
  }

  // Xóa tất cả thông báo của một tài khoản
  async deleteAllNotifications(userId: number): Promise<{ count: number }> {
    try {
      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .from(Notifications)
        .where('account_id = :userId', { userId })
        .execute();

      return { count: result.affected || 0 };
    } catch (error) {
      this.logger.error(
        `Error deleting all notifications for user ${userId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // Tạo thông báo yêu cầu kích hoạt lại tài khoản
  async createActivationRequestNotification(email: string): Promise<void> {
    const message = `Sinh viên với email ${email} yêu cầu kích hoạt lại tài khoản`;

    await this.createNotificationForPermission('account:create', message, {
      email,
    });
  }
}
