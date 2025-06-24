import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notifications } from 'src/database/entities/Notifications';
import { Accounts } from 'src/database/entities/Accounts';
import { WebsocketModule } from '../websocket/websocket.module';
import { RoleModule } from '../role/role.module';
import { ExamScheduleModule } from '../exam-schedule/exam-schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notifications, Accounts]),
    WebsocketModule,
    RoleModule,
    forwardRef(() => ExamScheduleModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
