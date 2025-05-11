// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { JwtStrategy } from './jwt.stragegy';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import { AccountModule } from '../account/account.module';
import { BlacklistToken } from 'src/database/entities/BlacklistToken';
import { TokenCleanupService } from './token-cleanup.service';
import { forwardRef } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Accounts, BlacklistToken]),
    forwardRef(() => AccountModule),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthRepository, TokenCleanupService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
