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
import { Accounts } from 'src/database/entities/Accounts';
import { AccountDto } from './dto/Account.dto';
import { In } from 'typeorm';
import { UpdateAccountDto } from './dto/updateAccount.dto';
import { generateRandomPassword } from 'src/common/utils/genderPasswordRandom.util';
import { StudentService } from '../student/student.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import * as fs from 'fs';
import * as csv from 'csv-parser';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly emailService: EmailService,

    private readonly studentService: StudentService,
  ) {}

  private async createAccount(
    data: CreateAccountDto,
    tempPassword: string,
    role: 'student' | 'teacher' | 'admin',
  ): Promise<Accounts> {
    const existingEmail = await this.accountRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Email đã tồn tại!');
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const toSave: Partial<Accounts> = {
      accountname: data.accountname,
      password: hashedPassword,
      email: data.email,
      role: role,
      isActive: data.isActive ?? false,
      urlAvatar: data.urlAvatar ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!toSave.isActive) {
      toSave.activationToken = uuidv4();
      toSave.activationTokenExpiresAt = calculateExpiryDate('24h');
    }

    const newAccount = await this.accountRepository.saveAccount(toSave);

    return newAccount;
  }
  async addAccount(data: CreateAccountDto) {
    const tempPassword = data.password;
    const newAccount = await this.createAccount(data, tempPassword, data.role);

    if (!newAccount.isActive) {
      const emailDto: SendEmailDto = {
        to: newAccount.email,
        username: newAccount.accountname,
        tempPassword,
        activationToken: newAccount.activationToken!,
        expiresIn: '24 giờ',
      };
      await this.emailService.sendEmail(emailDto);
    }

    return newAccount;
  }

  async addAccountsForStudents(studentAccounts: CreateAccountDto[]) {
    const results = {
      success: [] as {  id: string;
        accountname: string;
        email: string;
        role: string;
        isActive: boolean;
        urlAvatar: string;
        tempPassword: string;
      }[],
      failed: [] as { email: string; reason: string }[],
    };

    for (const data of studentAccounts) {
      const tempPassword = generateRandomPassword();

      try {
        const newAccount = await this.createAccount(
          data,
          tempPassword,
          'student',
        );

        const emailDto: SendEmailDto = {
          to: newAccount.email,
          username: newAccount.accountname,
          tempPassword,
          activationToken: newAccount.activationToken!,
          expiresIn: '24 giờ',
        };
        await this.emailService.sendEmail(emailDto);

        await this.studentService.attachAccountToStudentByEmail(
          newAccount.email,
          newAccount,
        );

        results.success.push({
          id: newAccount.id.toString(),
          accountname: newAccount.accountname,
          email: newAccount.email,
          role: newAccount.role,
          isActive: newAccount.isActive ?? false,
          urlAvatar: newAccount.urlAvatar ?? '',
          tempPassword,
        });
      } catch (err: any) {
        results.failed.push({
          email: data.email,
          reason: err.message || 'Lỗi khi lưu hoặc gửi email',
        });
      }
    }

    return results;
  }

  async updateAccount(id: number, data: UpdateAccountDto) {
    const account = await this.accountRepository.findOne({ where: { id } });

    if (!account) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      account.password = hashedPassword;
    }

    if (data.accountname) account.accountname = data.accountname;
    if (data.role) account.role = data.role;
    if (typeof data.isActive === 'boolean') account.isActive = data.isActive;
    if (data.urlAvatar) account.urlAvatar = data.urlAvatar;

    account.updatedAt = new Date();

    await this.accountRepository.save(account);

    return account;
  }

  async deleteAccountById(id: number): Promise<void> {
    const account = await this.accountRepository.findOne({ where: { id } });

    if (!account) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }

    await this.accountRepository.deleteById(id);
  }

  async deleteAccountsByIds(ids: number[]): Promise<void> {
    // Tìm các tài khoản theo danh sách id
    const accounts = await this.accountRepository.findBy({ id: In(ids) });

    if (accounts.length !== ids.length) {
      throw new HttpException(
        'Một số tài khoản không tồn tại',
        HttpStatus.NOT_FOUND,
      );
    }

    // Xóa nhiều tài khoản cùng lúc
    await this.accountRepository.delete(ids);
  }

  async getAllAccounts(): Promise<AccountDto[]> {
    return await this.accountRepository.getAllAccounts();
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

  async getAccountInfoById(id: number): Promise<Accounts> {
    const account = await this.accountRepository.findById(id);

    if (!account) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }
    return account;
  }
  async importAccountsFromFile(filePath: string, type: 'xlsx' | 'csv') {
    const accounts: CreateAccountDto[] = [];

    if (type === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error('Không tìm thấy worksheet!');
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; 

        const values = row.values as any[];
        const [accountname, email] = values.slice(1, 3);

        if (accountname && email) {
          accounts.push({
            accountname: accountname.toString(),
            email: typeof email === 'object' ? email.text : email.toString(),
          } as CreateAccountDto);
        }
      });
    } else if (type === 'csv') {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({ separator: '\t' }))
          .on('data', (data) => {
            if (data.accountname && data.email) {
              accounts.push({
                accountname: data.accountname,
                email: data.email,
              } as CreateAccountDto);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      throw new Error('Loại file không hỗ trợ!');
    }

    const result = await this.addAccountsForStudents(accounts);
    fs.unlinkSync(filePath);
    return result;
  }

  async exportAccounts(
    accounts: AccountDto[],
    res: Response,
    format: 'excel' | 'csv' = 'excel',
  ) {
    const bom = '\uFEFF';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accounts');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Account Name', key: 'accountname', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 10 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];

    accounts.forEach((account) => {
      worksheet.addRow(account);
    });

    if (format === 'excel') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=accounts.xlsx',
      );

      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=accounts.csv');

      const buffer = await workbook.csv.writeBuffer();

      res.write(bom);
      res.write(buffer);
      res.end();
    }
  }
}
