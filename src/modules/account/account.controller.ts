// src/modules/account/account.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Import JwtAuthGuard
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/role.guard';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async getAccountInfo(@Req() req) {
    console.log('User:', req.user);
    return await this.accountService.getAccountInfoByEmail(req.user.email);
  }
}
