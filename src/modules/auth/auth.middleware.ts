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
      if (error.name === 'TokenExpiredError') {
        const decoded: any = jwt.decode(accessToken);
        if (decoded?.exp) {
          const expiredAt = new Date(decoded.exp * 1000);
          await this.authService.blacklistAccessToken(accessToken, expiredAt);
        }
        return res.status(401).json({ message: 'Token expired' });
      }

      return res.status(401).json({ message: 'Invalid token' });
    }
  }
}
