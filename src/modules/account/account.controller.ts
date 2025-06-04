// src/modules/account/account.controller.ts
import {
  Controller,
  Get,
  Req,
  UseGuards,
  Post,
  Body,
  HttpException,
  HttpStatus,
  HttpCode,
  Delete,
  Param,
  Put,
  Res,
  Query,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import { CreateAccountDto } from './dto/createAccount.dto';
import { ActivateAccountDto } from './dto/activateAccount.dto';
import { AuthService } from '../auth/auth.service';
import { AccountDto } from './dto/Account.dto';
import { DeleteAccountsDto } from './dto/deleteAccounts.dto';
import { UpdateAccountDto } from './dto/updateAccount.dto';
import { Response } from 'express';
import { join } from 'path';
import * as fs from 'fs';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('account')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly authService: AuthService,
  ) {}

  @Get('all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:view')
  async getAllAccounts(): Promise<AccountDto[]> {
    return await this.accountService.getAllAccounts();
  }

  @Get('info')
  @UseGuards(JwtAuthGuard)
  async getAccountInfo(@Req() req) {
    return await this.accountService.getAccountInfoByEmail(req.user.email);
  }

  @Get('info/:id')
  @UseGuards(JwtAuthGuard)
  async getAccountInfoById(@Param('id') id: string) {
    const numericId = Number(id);

    if (isNaN(numericId)) {
      throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    return await this.accountService.getAccountInfoById(numericId);
  }

  @Post('/add/user')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:create')
  async addAccount(@Body() body: CreateAccountDto) {
    try {
      const result = await this.accountService.addAccount(body);
      return { message: 'Account created successfully!', data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('/add/users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:create')
  async addAccountStudents(@Body() body: CreateAccountDto[]) {
    try {
      const result = await this.accountService.addAccountsForStudents(body);
      return {
        message: 'Create list account for student successful !',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:update')
  async updateAccount(@Param('id') id: number, @Body() body: UpdateAccountDto) {
    try {
      const result = await this.accountService.updateAccount(Number(id), body);
      return { message: 'Cập nhật tài khoản thành công!', data: result };
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:delete')
  async deleteAccount(@Param('id') id: number) {
    try {
      await this.accountService.deleteAccountById(Number(id));
      return { message: 'Xóa tài khoản thành công' };
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('delete-many')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:delete')
  async deleteManyAccounts(@Body() body: DeleteAccountsDto) {
    try {
      await this.accountService.deleteAccountsByIds(body.ids);
      return { message: 'Xóa nhiều tài khoản thành công' };
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Body() dto: ActivateAccountDto,
  ): Promise<{ message: string }> {
    await this.authService.activateAccount(
      dto.token,
      dto.tempPassword,
      dto.newPassword,
    );
    return { message: 'Kích hoạt tài khoản thành công!' };
  }

  @Post('/import')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedExtensions = /\.(xlsx|csv)$/;
        if (!file.originalname.match(allowedExtensions)) {
          return callback(
            new HttpException(
              'Chỉ chấp nhận file .xlsx hoặc .csv',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async importAccountsFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'xlsx' | 'csv',
  ) {
    if (!file) {
      throw new HttpException(
        'Vui lòng upload file .xlsx hoặc .csv.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (type !== 'xlsx' && type !== 'csv') {
      throw new HttpException(
        'Query type phải là "xlsx" hoặc "csv"',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.accountService.importAccountsFromFile(
      file.path,
      type,
    );

    return {
      message: 'Import tài khoản thành công',
      data: result,
    };
  }

  @Post('/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:view')
  async exportAccounts(
    @Body() body: { accounts: AccountDto[] },
    @Query('format') format: 'excel' | 'csv',
    @Res() res: Response,
  ) {
    return this.accountService.exportAccounts(body.accounts, res, format);
  }

  @Get('/download-template')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:view')
  downloadStaticTemplate(
    @Query('type') type: 'xlsx' | 'csv',
    @Res() res: Response,
  ) {
    if (type !== 'xlsx' && type !== 'csv') {
      throw new HttpException(
        'Query param "type" phải là "xlsx" hoặc "csv"',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fileName = `account_template.${type}`;
    const filePath = join(
      process.cwd(),
      'uploads/templates',
      `account_template.${type}`,
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File mẫu không tồn tại!');
    }
    res.download(filePath, fileName, (err) => {
      if (err) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send('Không thể tải file mẫu');
      }
    });
  }
}
