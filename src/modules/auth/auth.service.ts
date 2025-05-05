// src/modules/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { Accounts } from '../../database/entities/Accounts';
import { AccountRepository } from '../account/account.repository';
import { UnauthorizedException } from '@nestjs/common';
import { calculateExpiryDate } from 'src/common/utils/date.util';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AuthService {
  constructor(
    private accountRepository: AccountRepository,

    private authRepository: AuthRepository,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;
    const account = await this.accountRepository.findByEmail(email);

    if (!account) {
      throw new HttpException(
        'Tài khoản không tồn tại',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      throw new HttpException('Mật khẩu không đúng', HttpStatus.BAD_REQUEST);
    }

    if (account.role === 'student' && !account.isActive) {
      throw new HttpException(
        'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email để xác nhận tài khoản.',
        HttpStatus.FORBIDDEN,
      );
    }

    return account;
  }

  async login(loginDto: LoginDto) {
    const account = await this.validateUser(loginDto);
    const accessToken = this.generateAccessToken(account);
    const refreshToken = await this.generateRefreshToken(account);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: account,
    };
  }

  generateAccessToken(account: Accounts) {
    const payload = {
      username: account.accountname,
      sub: account.id,
      role: account.role,
      email: account.email,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }

  async generateRefreshToken(account: Accounts) {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { sub: account.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn },
    );

    const expiresAt = calculateExpiryDate(expiresIn);

    await this.authRepository.saveRefreshToken(account.id, token, expiresAt);
    return token;
  }

  async logout(accessToken: string, refreshToken: string) {
    try {
      const decoded: any = jwt.decode(accessToken);
      const expiredAt = new Date(decoded.exp * 1000);
      await this.authRepository.blacklistAccessToken(accessToken, expiredAt);
    } catch (e) {
      console.warn('Cannot decode access token to blacklist:', e.message);
    }
    await this.authRepository.removeRefreshToken(refreshToken);
  }

  async verifyRefreshToken(token: string) {
    try {
      const storedToken = await this.authRepository.getRefreshToken(token);
      if (!storedToken) {
        throw new UnauthorizedException('Refresh token invalid.');
      }

      if (storedToken.expiresAt < new Date()) {
        await this.authRepository.removeRefreshToken(token);
        throw new UnauthorizedException('Refresh token expired.');
      }

      return storedToken.account;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async isAccessTokenBlacklisted(token: string): Promise<void> {
    const blacklisted = await this.authRepository.isAccessTokenBlacklisted(token);

    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked.');
    }
  }

  async blacklistAccessToken(token: string, expiredAt: Date): Promise<void> {
    await this.authRepository.blacklistAccessToken(token, expiredAt);
  }
}
