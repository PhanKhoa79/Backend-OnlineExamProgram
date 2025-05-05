// src/modules/account/account.repository.ts
import { DataSource, Repository } from 'typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountRepository extends Repository<Accounts> {
  constructor(private dataSource: DataSource) {
    super(Accounts, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<Accounts | null> {
    return this.findOne({ where: { email } });
  }
  async saveAccount(account: Partial<Accounts>): Promise<Accounts> {
    const newAccount = this.create(account);
    return this.save(newAccount);
  }
}
