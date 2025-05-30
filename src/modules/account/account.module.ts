// src/modules/account/account.module.ts
import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { AccountRepository } from './account.repository';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthModule } from '../auth/auth.module';
import { forwardRef } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { CleanupService } from './clearnupCodeReset.service';
import { StudentModule } from '../student/student.module';
import { RoleModule } from '../role/role.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Accounts]),
    MailerModule,
    EmailModule,
    StudentModule,
    RoleModule,
    forwardRef(() => AuthModule),
  ],
  providers: [AccountService, AccountRepository, CleanupService],
  controllers: [AccountController],
  exports: [AccountService, TypeOrmModule, AccountRepository],
})
export class AccountModule {}
