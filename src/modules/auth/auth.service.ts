// src/modules/auth/auth.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
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
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { randomInt } from 'crypto';
import { EmailService } from '../email/email.service';
import { RoleService } from '../role/role.service';
import { LoginHistory } from 'src/database/entities/LoginHistory';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { LoginHistoryDto } from '../account/dto/loginHistory.dto';
dotenv.config();

@Injectable()
export class AuthService {
  constructor(
    private readonly accountRepository: AccountRepository,

    private readonly authRepository: AuthRepository,

    private readonly emailService: EmailService,

    private readonly roleService: RoleService,

    @InjectRepository(LoginHistory)
    private loginHistoryRepo: Repository<LoginHistory>,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<Accounts> {
    const { email, password } = loginDto;
    const account = await this.accountRepository.findByEmail(email);
    if (!account) {
      throw new HttpException(
        'Tài khoản không tồn tại',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!account.isActive) {
      throw new HttpException(
        'Tài khoản chưa được kích hoạt',
        HttpStatus.FORBIDDEN,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      throw new HttpException('Mật khẩu không đúng', HttpStatus.BAD_REQUEST);
    }

    if (account.role.name === 'student' && !account.isActive) {
      throw new HttpException(
        'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email để xác nhận tài khoản.',
        HttpStatus.FORBIDDEN,
      );
    }

    return account;
  }

  async login(loginDto: LoginDto, req: Request) {
    const account = await this.validateUser(loginDto);
    const accessToken = this.generateAccessToken(account);
    const refreshToken = await this.generateRefreshToken(account);

    await this.saveLoginHistory(account, req);

    const permissions = await this.roleService.getPermissionsByRoleId(
      account.role.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: account.id,
        accountname: account.accountname,
        email: account.email,
        role: {
          id: account.role.id,
          name: account.role.name,
        },
        permissions,
      },
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

  async generateRefreshToken(account: Accounts): Promise<string> {
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
    const blacklisted =
      await this.authRepository.isAccessTokenBlacklisted(token);

    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked.');
    }
  }

  async blacklistAccessToken(token: string, expiredAt: Date): Promise<void> {
    await this.authRepository.blacklistAccessToken(token, expiredAt);
  }

  async activateAccount(
    token: string,
    tempPassword: string,
    newPassword: string,
  ): Promise<void> {
    // 1. Lấy account theo activationToken
    const account = await this.accountRepository.findByActivationToken(token);
    if (
      !account ||
      !account.activationTokenExpiresAt ||
      account.activationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Link kích hoạt không hợp lệ hoặc đã hết hạn',
      );
    }

    // 2. So sánh mật khẩu tạm
    const match = await bcrypt.compare(tempPassword, account.password);
    if (!match) {
      throw new BadRequestException('Mật khẩu tạm thời không đúng');
    }

    // 3. Hash mật khẩu mới & cập nhật trạng thái
    account.password = await bcrypt.hash(newPassword, 10);
    account.isActive = true;
    account.activationToken = null;
    account.activationTokenExpiresAt = null;
    account.updatedAt = new Date();

    await this.accountRepository.saveAccount(account);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const acct = await this.accountRepository.findByEmail(dto.email);
    if (!acct) throw new BadRequestException('Email chưa đăng ký');

    if (!acct.isActive) {
      throw new BadRequestException('Tài khoản của bạn chưa được kích hoạt');
    }

    // sinh code 6 số và expires in 15 phút
    const code = Array.from({ length: 6 }, () => randomInt(0, 10)).join('');
    const expiresAt = calculateExpiryDate('5m');

    // lưu vào DB
    acct.resetPasswordCode = code;
    acct.resetPasswordExpiresAt = expiresAt;
    await this.accountRepository.saveAccount(acct);

    // gửi email
    await this.emailService.sendForgotPasswordCode(dto.email, code, '5 phút');
  }

  async verifyResetCode(code: string): Promise<void> {
    const acct = await this.accountRepository.findByCodeResetPassword(code);
    if (
      !acct ||
      !acct.resetPasswordExpiresAt ||
      acct.resetPasswordExpiresAt < new Date()
    ) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }
  }

  /** 2. Đặt lại mật khẩu */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // tìm account có mã khớp và chưa hết hạn
    const acct = await this.accountRepository.findByCodeResetPassword(dto.code);
    if (
      !acct ||
      !acct.resetPasswordExpiresAt ||
      acct.resetPasswordExpiresAt < new Date()
    ) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }
    // hash mật khẩu mới & xoá code
    acct.password = await bcrypt.hash(dto.newPassword, 10);
    acct.resetPasswordCode = null;
    acct.resetPasswordExpiresAt = null;
    acct.updatedAt = new Date();
    await this.accountRepository.saveAccount(acct);
  }

  //hàm ghi log đăng nhập
  async saveLoginHistory(account: Accounts, req: Request) {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const loginRecord = this.loginHistoryRepo.create({
      account,
      ipAddress: ip,
      userAgent,
    });

    await this.loginHistoryRepo.save(loginRecord);
  }

  async getLoginHistoryByAccountId(
    accountId: number,
  ): Promise<LoginHistoryDto[]> {
    const histories = await this.loginHistoryRepo.find({
      where: {
        account: { id: accountId },
      },
      relations: ['account'],
      order: { loginTime: 'DESC' },
    });

    return histories.map(h => ({
      accountId: h.account.id,
      loginTime: h.loginTime,
      ipAddress: h.ipAddress,
      userAgent: h.userAgent,
    }));
  }
}
