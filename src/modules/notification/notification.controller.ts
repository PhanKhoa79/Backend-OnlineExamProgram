import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Body,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
    role: string;
  };
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyNotifications(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    return this.notificationService.getNotificationsByUserId(userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(Number(id));
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const result = await this.notificationService.markAllAsRead(userId);

    return {
      message: `Đã đánh dấu ${result.count} thông báo là đã đọc`,
      count: result.count,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    await this.notificationService.deleteNotification(Number(id), userId);

    return {
      message: 'Đã xóa thông báo thành công',
    };
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAllNotifications(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const result = await this.notificationService.deleteAllNotifications(userId);

    return {
      message: `Đã xóa ${result.count} thông báo`,
      count: result.count,
    };
  }

  @Post('request-activation')
  @HttpCode(HttpStatus.OK)
  async requestActivation(@Body() body: { email: string }) {
    await this.notificationService.createActivationRequestNotification(
      body.email,
    );
    return {
      message: 'Yêu cầu kích hoạt tài khoản đã được gửi đến quản trị viên',
    };
  }
}
