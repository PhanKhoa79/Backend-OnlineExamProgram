// src/modules/account/account.module.ts
import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { AccountRepository } from './account.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Accounts, AccountRepository])],
  providers: [AccountService, AccountRepository],
  controllers: [AccountController],
  exports: [AccountService, TypeOrmModule, AccountRepository],
})
export class AccountModule {}
