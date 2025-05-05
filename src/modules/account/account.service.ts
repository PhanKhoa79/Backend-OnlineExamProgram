// src/modules/account/account.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Accounts)
    private accountRepository: Repository<Accounts>, // Inject Repository<Accounts> thay vì AccountRepository
  ) {}

  async getAccountInfoByEmail(
    email: string,
  ): Promise<{ accountname: string; role: string }> {
    const account = await this.accountRepository.findOne({ where: { email } });

    if (!account) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }

    return {
      accountname: account.accountname,
      role: account.role,
    };
  }
}
