// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
  HttpCode,
  Param,
  Get,
  ParseIntPipe,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { ResendActivationDto } from './dto/resend-activation.dto';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './decorator/permissions.decotator';
import { NotificationService } from '../notification/notification.service';
import { ActivityLog } from '../../common/decorators/activity-log.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ActivityLog({
    action: 'LOGIN',
    module: 'auth',
    description: 'đã đăng nhập hệ thống',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { access_token, refresh_token, user } = await this.authService.login(
      loginDto,
      req,
    );

    res.cookie('accessToken', access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refresh_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user };
  }

  @Post('refresh-token')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    const oldAccessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (oldAccessToken) {
      const decoded: any = jwt.decode(oldAccessToken);
      const expiredAt = new Date(decoded.exp * 1000);
      await this.authService.blacklistAccessToken(oldAccessToken, expiredAt);
    }

    const account = await this.authService.verifyRefreshToken(refreshToken);
    const newAccessToken = this.authService.generateAccessToken(account);

    res.cookie('accessToken', newAccessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return { accessToken: newAccessToken };
  }

  @Post('/logout')
  @ActivityLog({
    action: 'LOGOUT',
    module: 'auth',
    description: 'đã đăng xuất khỏi hệ thống',
  })
  async logout(@Req() req: Request, @Res() res: Response) {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken || !refreshToken) {
      throw new UnauthorizedException('Missing token');
    }

    await this.authService.logout(accessToken, refreshToken);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(200).json({ message: 'Logged out successfully' });
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ActivityLog({
    action: 'FORGOT_PASSWORD',
    module: 'auth',
    description: 'đã yêu cầu đặt lại mật khẩu',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'Sent email successfully' };
  }

  @Post('reset-password')
  @HttpCode(200)
  @ActivityLog({
    action: 'RESET_PASSWORD',
    module: 'auth',
    description: 'đã đặt lại mật khẩu',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Đổi mật khẩu thành công' };
  }

  @Post('verify-reset-code')
  @HttpCode(200)
  @ActivityLog({
    action: 'VERIFY_RESET_CODE',
    module: 'auth',
    description: 'đã xác minh mã đặt lại mật khẩu',
  })
  async verifyResetCode(@Body() body: { code: string }) {
    await this.authService.verifyResetCode(body.code);
    return { message: 'Mã hợp lệ' };
  }

  @Get('verify-activation-token/:token')
  @HttpCode(200)
  async verifyActivationToken(@Param('token') token: string) {
    try {
      await this.authService.verifyActivationToken(token);
      return { valid: true, message: 'Token kích hoạt hợp lệ' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ActivityLog({
    action: 'CHANGE_PASSWORD',
    module: 'auth',
    description: 'đã đổi mật khẩu',
  })
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    const accountId = (req as any).user?.userId;
    if (!accountId) throw new UnauthorizedException();

    return this.authService.changePassword(accountId, dto);
  }

  @Get('login-history/:accountId')
  @UseGuards(JwtAuthGuard)
  async getLoginHistoryByAccountId(
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    const histories =
      await this.authService.getLoginHistoryByAccountId(accountId);
    return histories;
  }

  @Post('resend-activation')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:create')
  @ActivityLog({
    action: 'RESEND_ACTIVATION',
    module: 'auth',
    description: 'đã gửi lại link kích hoạt tài khoản',
  })
  @HttpCode(HttpStatus.OK)
  async resendActivationLink(@Body() dto: ResendActivationDto) {
    return await this.authService.resendActivationLink(dto.email);
  }

  @Post('request-activation')
  @ActivityLog({
    action: 'REQUEST_ACTIVATION',
    module: 'auth',
    description: 'đã gửi yêu cầu kích hoạt tài khoản',
  })
  @HttpCode(HttpStatus.OK)
  async requestActivation(@Body() dto: ResendActivationDto) {
    await this.notificationService.createActivationRequestNotification(
      dto.email,
    );
    return {
      message: 'Yêu cầu kích hoạt tài khoản đã được gửi đến quản trị viên',
    };
  }

  @Get('find-email-by-token/:token')
  @HttpCode(HttpStatus.OK)
  async findEmailByActivationToken(@Param('token') token: string) {
    try {
      const result = await this.authService.findEmailByActivationToken(token);
      return {
        found: true,
        email: result.email,
        isExpired: result.isExpired,
      };
    } catch (error) {
      return {
        found: false,
        message: error instanceof Error ? error.message : 'Lỗi không xác định',
      };
    }
  }
}
