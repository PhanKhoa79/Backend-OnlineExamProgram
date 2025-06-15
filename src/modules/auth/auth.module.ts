// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { JwtStrategy } from './jwt.stragegy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { AccountModule } from '../account/account.module';
import { BlacklistToken } from 'src/database/entities/BlacklistToken';
import { TokenCleanupService } from './token-cleanup.service';
import { forwardRef } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { RoleModule } from '../role/role.module';
import { LoginHistory } from 'src/database/entities/LoginHistory';
import { NotificationModule } from '../notification/notification.module';
import { PassportModule } from '@nestjs/passport';
@Module({
  imports: [
    TypeOrmModule.forFeature([Accounts, BlacklistToken, LoginHistory]),
    forwardRef(() => AccountModule),
    RoleModule,
    EmailModule,
    NotificationModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthRepository, TokenCleanupService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
