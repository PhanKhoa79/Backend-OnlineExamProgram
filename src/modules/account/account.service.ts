// src/modules/account/account.service.ts
import { Injectable } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreateAccountDto } from './dto/createAccount.dto';
import { v4 as uuidv4 } from 'uuid';
import { AccountRepository } from './account.repository';
import { calculateExpiryDate } from 'src/common/utils/date.util';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { SendEmailDto } from '../email/dto/email.dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly emailService: EmailService,
  ) {}

  async addAccount(data: CreateAccountDto) {
    // Kiểm tra email
    const existingEmail = await this.accountRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Tài khoản đã tồn tại!');
    }

    const tempPassword = data.password;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Sinh activation token + tính hạn 24h
    const activationToken = uuidv4();
    const activationTokenExpiresAt = calculateExpiryDate('24h');

    // Tạo mới account
    const newAccount = await this.accountRepository.saveAccount({
      accountname: data.accountname,
      password: hashedPassword,
      email: data.email,
      role: data.role,
      activationToken,
      activationTokenExpiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const emailDto: SendEmailDto = {
      to: newAccount.email,
      username: newAccount.accountname,
      tempPassword,
      activationToken,
      expiresIn: '24 giờ',
    };

    try {
      await this.emailService.sendEmail(emailDto);
      console.log(`Activation email sent to ${newAccount.email}`);
    } catch (err) {
      console.error('Failed to send activation email', err);
    }

    return newAccount;
  }

  async getAccountInfoByEmail(
    email: string,
  ): Promise<{ accountname: string; role: string }> {
    const account = await this.accountRepository.findByEmail(email);

    if (!account) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }

    return {
      accountname: account.accountname,
      role: account.role,
    };
  }
}
