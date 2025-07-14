import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountModule } from './modules/account/account.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from './modules/email/email.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { StudentModule } from './modules/student/student.module';
import { RoleModule } from './modules/role/role.module';
import { SubjectModule } from './modules/subject/subject.module';
import { ClassesModule } from './modules/classes/classes.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AnswerModule } from './modules/answer/answer.module';
import { ExamModule } from './modules/exam/exam.module';
import { ExamScheduleModule } from './modules/exam-schedule/exam-schedule.module';
import { ExamScheduleAssignmentModule } from './modules/exam-schedule-assignment/exam-schedule-assignment.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { RedisModule } from './modules/redis/redis.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { ActivityLogInterceptor } from './common/interceptors/activity-log.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ReportModule } from './modules/report/report.module';

const modules = [
  AuthModule,
  AccountModule,
  EmailModule,
  CloudinaryModule,
  StudentModule,
  RoleModule,
  SubjectModule,
  ClassesModule,
  QuestionsModule,
  AnswerModule,
  ExamModule,
  ExamScheduleModule,
  ExamScheduleAssignmentModule,
  SchedulerModule,
  RedisModule,
  WebsocketModule,
  NotificationModule,
  ActivityLogModule,
  ReportModule,
];

@Module({
  imports: [
    ...modules,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'postgres'),
        entities: [__dirname + '/database/entities/*.{js,ts}'],
        synchronize: configService.get('DB_SYNC', 'false') === 'true',
        logging: configService.get('DB_LOGGING', 'false') === 'true',
      }),
    }),
    ScheduleModule.forRoot(),
    CloudinaryModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 600,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh-token', method: RequestMethod.POST },
        { path: 'account/activate', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'auth/verify-reset-code', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'auth/request-activation', method: RequestMethod.POST },
        {
          path: 'auth/verify-activation-token/(.*)',
          method: RequestMethod.GET,
        },
        { path: 'auth/find-email-by-token/(.*)', method: RequestMethod.GET}
      )
      .forRoutes('*');
  }
}
