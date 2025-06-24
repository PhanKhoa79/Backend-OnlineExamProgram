import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;
    if (!accessToken) throw new UnauthorizedException('Missing access token');

    try {
      jwt.verify(accessToken, process.env.JWT_SECRET!);
      await this.authService.isAccessTokenBlacklisted(accessToken);
      await this.authService.verifyRefreshToken(refreshToken);
      return next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError' && refreshToken) {
        try {
          // Tự động làm mới access token khi nó hết hạn
          const decoded: any = jwt.decode(accessToken);
          if (decoded?.exp) {
            const expiredAt = new Date(decoded.exp * 1000);
            await this.authService.blacklistAccessToken(accessToken, expiredAt);
          }

          // Tạo access token mới từ refresh token
          const account =
            await this.authService.verifyRefreshToken(refreshToken);
          const newAccessToken = this.authService.generateAccessToken(account);

          // Đặt cookie mới
          res.cookie('accessToken', newAccessToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
          });

          // Thay thế token trong request để request hiện tại có thể tiếp tục
          req.cookies.accessToken = newAccessToken;

          return next();
        } catch (refreshError) {
          // Nếu không thể làm mới token, trả về lỗi 401
          return res.status(401).json({ message: 'Unable to refresh token' });
        }
      }

      return res.status(401).json({ message: 'Invalid token' });
    }
  }
}
