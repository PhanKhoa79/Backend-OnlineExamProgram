// src/modules/account/account.service.ts
import { Injectable, Logger } from '@nestjs/common';
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
import { RoleService } from '../role/role.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import * as fs from 'fs';
import csv from 'csv-parser';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly CACHE_KEYS = {
    ACCOUNT_LIST: 'account_list',
    ACCOUNT_DETAIL: 'account_detail_',
    ACCOUNT_BY_EMAIL: 'account_by_email_',
  };
  private readonly CACHE_TTL = 600; // 10 phút (giây)

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly emailService: EmailService,
    private readonly studentService: StudentService,
    private readonly roleService: RoleService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Xóa cache khi có thay đổi dữ liệu
   */
  private async invalidateCache(key?: string): Promise<void> {
    try {
      if (key) {
        await this.redisService.del(key);
      } else {
        // Xóa cache danh sách tài khoản
        await this.redisService.del(this.CACHE_KEYS.ACCOUNT_LIST);

        // Xóa cache chi tiết tài khoản
        const accountCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.ACCOUNT_DETAIL}*`,
        );
        for (const cacheKey of accountCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache tài khoản theo email
        const emailCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.ACCOUNT_BY_EMAIL}*`,
        );
        for (const cacheKey of emailCacheKeys) {
          await this.redisService.del(cacheKey);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async createAccount(
    data: CreateAccountDto,
    tempPassword: string,
    roleName: string,
  ): Promise<Accounts> {
    const existingEmail = await this.accountRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Email đã tồn tại!');
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const roleEntity = await this.roleService.findByName(roleName);
    if (!roleEntity) {
      throw new Error(`Role ${roleName} không tồn tại!`);
    }
    const toSave: Partial<Accounts> = {
      accountname: data.accountname,
      password: hashedPassword,
      email: data.email,
      role: roleEntity,
      isActive: data.isActive ?? false,
      urlAvatar: data.urlAvatar ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!toSave.isActive) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      toSave.activationToken = uuidv4();
      toSave.activationTokenExpiresAt = calculateExpiryDate('24h');
    }

    const newAccount = await this.accountRepository.saveAccount(toSave);

    // Xóa cache sau khi tạo mới
    await this.invalidateCache();

    return newAccount;
  }

  /**
   * Gửi lại link kích hoạt tài khoản qua email
   * @param email Email của tài khoản cần gửi lại link kích hoạt
   * @returns Thông tin về việc gửi email thành công
   */
  async resendActivationLink(email: string): Promise<{ message: string }> {
    // Tìm tài khoản theo email
    const account = await this.accountRepository.findByEmail(email);
    if (!account) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }

    // Kiểm tra xem tài khoản đã kích hoạt chưa
    if (account.isActive) {
      throw new HttpException(
        'Tài khoản đã được kích hoạt',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Tạo token kích hoạt mới
    account.activationToken = uuidv4();
    account.activationTokenExpiresAt = calculateExpiryDate('24h');
    account.updatedAt = new Date();

    // Lưu tài khoản với token mới
    await this.accountRepository.saveAccount(account);

    // Tạo mật khẩu tạm thời mới
    const tempPassword = generateRandomPassword();
    account.password = await bcrypt.hash(tempPassword, 10);
    await this.accountRepository.saveAccount(account);

    // Gửi email kích hoạt
    const emailDto: SendEmailDto = {
      to: account.email,
      username: account.accountname,
      tempPassword,
      activationToken: account.activationToken!,
      expiresIn: '24 giờ',
    };
    await this.emailService.sendEmail(emailDto);

    // Xóa cache liên quan đến tài khoản
    await this.invalidateCache(`${this.CACHE_KEYS.ACCOUNT_BY_EMAIL}${email}`);
    if (account.id) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.ACCOUNT_DETAIL}${account.id}`,
      );
    }

    return { message: 'Đã gửi lại link kích hoạt tài khoản qua email' };
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
      success: [] as {
        id: string;
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
          role: newAccount.role.name,
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
    if (data.role) {
      const roleEntity = await this.roleService.findByName(data.role);
      if (!roleEntity) {
        throw new HttpException(
          `Role ${data.role} không tồn tại`,
          HttpStatus.BAD_REQUEST,
        );
      }
      account.role = roleEntity;
    }
    if (typeof data.isActive === 'boolean') account.isActive = data.isActive;
    if (data.urlAvatar) account.urlAvatar = data.urlAvatar;

    account.updatedAt = new Date();

    await this.accountRepository.save(account);

    // Xóa cache sau khi cập nhật
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.ACCOUNT_DETAIL}${id}`);
    await this.invalidateCache(
      `${this.CACHE_KEYS.ACCOUNT_BY_EMAIL}${account.email}`,
    );

    return account;
  }

  async deleteAccountById(id: number): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!account) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }

    // Kiểm tra role không cho phép xóa
    if (account.role && account.role.name === 'moderator') {
      throw new HttpException(
        'Không thể xóa tài khoản có vai trò Moderator',
        HttpStatus.FORBIDDEN,
      );
    }

    const email = account.email;

    await this.accountRepository.deleteById(id);

    // Xóa cache sau khi xóa
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.ACCOUNT_DETAIL}${id}`);
    await this.invalidateCache(`${this.CACHE_KEYS.ACCOUNT_BY_EMAIL}${email}`);
  }

  async deleteAccountsByIds(ids: number[]): Promise<void> {
    // Tìm các tài khoản theo danh sách id với relations
    const accounts = await this.accountRepository.find({
      where: { id: In(ids) },
      relations: ['role'],
    });

    if (accounts.length !== ids.length) {
      throw new HttpException(
        'Một số tài khoản không tồn tại',
        HttpStatus.NOT_FOUND,
      );
    }

    // Kiểm tra xem có tài khoản nào có role moderator không
    const moderatorAccounts = accounts.filter(
      (account) => account.role && account.role.name === 'moderator',
    );

    if (moderatorAccounts.length > 0) {
      const moderatorAccountNames = moderatorAccounts
        .map((account) => account.accountname)
        .join(', ');

      throw new HttpException(
        `Không thể xóa các tài khoản có vai trò Moderator: ${moderatorAccountNames}`,
        HttpStatus.FORBIDDEN,
      );
    }

    // Xóa nhiều tài khoản cùng lúc
    await this.accountRepository.delete(ids);

    // Xóa cache sau khi xóa
    await this.invalidateCache();
    for (const account of accounts) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.ACCOUNT_DETAIL}${account.id}`,
      );
      await this.invalidateCache(
        `${this.CACHE_KEYS.ACCOUNT_BY_EMAIL}${account.email}`,
      );
    }
  }

  async getAllAccounts(): Promise<AccountDto[]> {
    const cacheKey = this.CACHE_KEYS.ACCOUNT_LIST;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as AccountDto[];
      }

      // Nếu không có trong cache, truy vấn database
      const accounts = await this.accountRepository.getAllAccounts();

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(accounts),
        this.CACHE_TTL,
      );
      return accounts;
    } catch (error) {
      this.logger.error(
        `Error in getAllAccounts: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.accountRepository.getAllAccounts();
    }
  }

  async getAccountInfoByEmail(
    email: string,
  ): Promise<{ accountname: string; role: string }> {
    const cacheKey = `${this.CACHE_KEYS.ACCOUNT_BY_EMAIL}${email}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as { accountname: string; role: string };
      }

      // Nếu không có trong cache, truy vấn database
      const account = await this.accountRepository.findByEmail(email);
      if (!account) {
        throw new HttpException(
          'Tài khoản không tồn tại',
          HttpStatus.NOT_FOUND,
        );
      }

      const result = {
        accountname: account.accountname,
        role: account.role.name,
      };

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.CACHE_TTL,
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error in getAccountInfoByEmail: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const account = await this.accountRepository.findByEmail(email);
      if (!account) {
        throw new HttpException(
          'Tài khoản không tồn tại',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        accountname: account.accountname,
        role: account.role.name,
      };
    }
  }

  async getAccountInfoById(id: number): Promise<Accounts> {
    const cacheKey = `${this.CACHE_KEYS.ACCOUNT_DETAIL}${id}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as Accounts;
      }

      // Nếu không có trong cache, truy vấn database
      const account = await this.accountRepository.findById(id);
      if (!account) {
        throw new HttpException(
          'Tài khoản không tồn tại',
          HttpStatus.NOT_FOUND,
        );
      }

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(account),
        this.CACHE_TTL,
      );

      return account;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error in getAccountInfoById: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const account = await this.accountRepository.findById(id);
      if (!account) {
        throw new HttpException(
          'Tài khoản không tồn tại',
          HttpStatus.NOT_FOUND,
        );
      }

      return account;
    }
  }

  // Không cache các hàm import/export vì chúng thường là thao tác không lặp lại nhiều
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
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      const buffer = await workbook.csv.writeBuffer();
      res.write(bom);
      res.write(buffer);
      res.end();
    }
  }
}
