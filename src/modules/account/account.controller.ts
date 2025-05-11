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
} from '@nestjs/common';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/role.guard';
import { CreateAccountDto } from './dto/createAccount.dto';
import { ActivateAccountDto } from './dto/activateAccount';
import { AuthService } from '../auth/auth.service';

@Controller('account')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly authService: AuthService,
  ) {}

  @Get('info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async getAccountInfo(@Req() req) {
    console.log('User:', req.user);
    return await this.accountService.getAccountInfoByEmail(req.user.email);
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
