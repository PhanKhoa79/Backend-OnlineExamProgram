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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
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

  @Post('logout')
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
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'Sent email successfully' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Đổi mật khẩu thành công' };
  }

  @Post('verify-reset-code')
  @HttpCode(200)
  async verifyResetCode(@Body() body: { code: string }) {
    await this.authService.verifyResetCode(body.code);
    return { message: 'Mã hợp lệ' };
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
}
