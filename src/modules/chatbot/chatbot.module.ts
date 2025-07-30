import { Module, Logger } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { IntentChatResponseService } from './intent-respone.service';
import { UIChatResponseService } from './UI-chat-respone.service';
import { ExamScheduleModule } from '../exam-schedule/exam-schedule.module';
import { ClassesModule } from '../classes/classes.module';
import { SubjectModule } from '../subject/subject.module';

@Module({
  imports: [ExamScheduleModule, ClassesModule, SubjectModule],
  controllers: [ChatbotController],
  providers: [IntentChatResponseService, UIChatResponseService, Logger],
  exports: [IntentChatResponseService, UIChatResponseService],
})
export class ChatbotModule {}
