import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountModule } from './modules/account/account.module';
import { ScheduleModule } from '@nestjs/schedule';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { EmailModule } from './modules/email/email.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { StudentModule } from './modules/student/student.module';
import { RoleModule } from './modules/role/role.module';
import { SubjectModule } from './modules/subject/subject.module';
import { ClassesModule } from './modules/classes/classes.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AnswerModule } from './modules/answer/answer.module';

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
];

@Module({
  imports: [
    ...modules,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...databaseConfig,
      autoLoadEntities: true,
    }),
    ScheduleModule.forRoot(),
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
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
      )
      .forRoutes('*');
  }
}
