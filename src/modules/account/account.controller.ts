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
} from '@nestjs/common';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/role.guard';
import { CreateAccountDto } from './dto/createAccount.dto';
import { ActivateAccountDto } from './dto/activateAccount.dto';
import { AuthService } from '../auth/auth.service';
import { AccountDto } from './dto/Account.dto';
import { DeleteAccountsDto } from './dto/deleteAccounts.dto';
import { UpdateAccountDto } from './dto/updateAccount.dto';

@Controller('account')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly authService: AuthService,
  ) {}

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllAccounts(): Promise<AccountDto[]> {
    return await this.accountService.getAllAccounts();
  }

  @Get('info')
  @UseGuards(JwtAuthGuard)
  async getAccountInfo(@Req() req) {
    return await this.accountService.getAccountInfoByEmail(req.user.email);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAccountInfoById(@Param('id') id: number) {
    return await this.accountService.getAccountInfoById(id);
  }

  @Post('/add/user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async addAccount(@Body() body: CreateAccountDto) {
    try {
      const result = await this.accountService.addAccount(body);
      return { message: 'Account created successfully!', data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('/add/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
}
