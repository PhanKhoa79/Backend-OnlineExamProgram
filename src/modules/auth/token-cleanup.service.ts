// src/modules/auth/token-cleanup.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthRepository } from './auth.repository';

@Injectable()
export class TokenCleanupService {
  constructor(private readonly authRepository: AuthRepository) {}

  @Cron('43 20 * * *')
  async cleanUpExpiredTokens() {
    const now = new Date();
    await this.authRepository.deleteExpiredRefreshTokens(now);
    console.log(
      `[CRON] Đã xóa các refresh token hết hạn vào ${now.toISOString()}`,
    );
  }
}
