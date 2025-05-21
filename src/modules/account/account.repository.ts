import { DataSource, Repository } from 'typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { Injectable } from '@nestjs/common';
import { AccountDto } from './dto/Account.dto';

@Injectable()
export class AccountRepository extends Repository<Accounts> {
  constructor(private dataSource: DataSource) {
    super(Accounts, dataSource.createEntityManager());
  }

  async getAllAccounts(): Promise<AccountDto[]> {
    const accounts = await this.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return accounts.map((account) => ({
      id: account.id,
      accountname: account.accountname,
      email: account.email,
      role: account.role,
      isActive: account.isActive ?? false,
      urlAvatar: account.urlAvatar,
    }));
  }

  async findByEmail(email: string): Promise<Accounts | null> {
    return this.findOne({ where: { email } });
  }

  async findById(id: number): Promise<Accounts | null> {
    return this.findOne({ where: { id } });
  }
  async saveAccount(account: Partial<Accounts>): Promise<Accounts> {
    const newAccount = this.create(account);
    return this.save(newAccount);
  }

  async deleteById(id: number): Promise<void> {
    await this.delete(id);
  }

  async findByActivationToken(token: string): Promise<Accounts | null> {
    return this.findOne({ where: { activationToken: token } });
  }

  async findByCodeResetPassword(code: string): Promise<Accounts | null> {
    return this.findOne({ where: { resetPasswordCode: code } });
  }

  async clearExpiredResetCodes(): Promise<number> {
    const result = await this.createQueryBuilder()
      .update(Accounts)
      .set({ resetPasswordCode: null, resetPasswordExpiresAt: null })
      .where('reset_password_expires_at < NOW()')
      .execute();

    return result.affected || 0;
  }

  async clearExpiredActivateCodes(): Promise<number> {
    const result = await this.createQueryBuilder()
      .update(Accounts)
      .set({ activationToken: null, activationTokenExpiresAt: null })
      .where('activationTokenExpiresAt < NOW()')
      .execute();

    // result.affected = số bản ghi đã cập nhật
    return result.affected || 0;
  }
}
