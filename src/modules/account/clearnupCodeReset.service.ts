// src/modules/account/cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountRepository } from './account.repository';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly accountRepo: AccountRepository) {}

  /**
   * Chạy mỗi phút:
   * Xoá mọi resetPasswordCode đã hết hạn
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredResetCodes() {
    const count = await this.accountRepo.clearExpiredResetCodes();
    if (count > 0) {
      this.logger.log(`Cleared ${count} expired reset codes`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredActivateCodes() {
    const count = await this.accountRepo.clearExpiredActivateCodes();
    if (count > 0) {
      this.logger.log(`Cleared ${count} expired active codes`);
    }
  }
}
