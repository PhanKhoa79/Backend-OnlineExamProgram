/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Post, Body, Logger } from '@nestjs/common';
import { IntentChatResponseService } from './intent-respone.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly intentChatResponse: IntentChatResponseService,
    private readonly logger: Logger,
  ) {}

  @Post('webhook')
  webhook(@Body() body: any) {
    try {
      const { queryResult } = body;
      const intent = queryResult?.intent?.displayName;

      if (!intent) {
        return this.intentChatResponse.getErrorIntentResponse();
      }

      let response: any;

      switch (intent) {
        case IntentChatResponseService.WELCOME_INTENT:
          response = this.handleWelcomeIntent();
          break;
        case IntentChatResponseService.FALLBACK_INTENT:
          response = this.handleFallbackIntent();
          break;
        case IntentChatResponseService.GOODBYE_INTENT:
          response = this.handleGoodbyeIntent();
          break;
        case IntentChatResponseService.GET_EXAM_SCHEDULE_INTENT:
          response = this.handleExamScheduleIntent(queryResult);
          break;
        case IntentChatResponseService.PROVIDE_EXAM_SCHEDULE_DETAILS_INTENT:
          response = this.handleProvideExamScheduleDetailsIntent(queryResult);
          break;
        case IntentChatResponseService.GET_EXAM_INFO_INTENT:
          response = this.handleExamInfoIntent();
          break;
        case IntentChatResponseService.GET_EXAM_DURATION_INTENT:
          response = this.handleExamDurationIntent();
          break;
        case IntentChatResponseService.GET_EXAM_QUESTIONS_INTENT:
          response = this.handleExamQuestionsIntent();
          break;
        case IntentChatResponseService.GET_EXAM_SUBJECTS_INTENT:
          response = this.handleExamSubjectsIntent();
          break;
        case IntentChatResponseService.GET_EXAM_ROOMS_INTENT:
          response = this.handleExamRoomsIntent(queryResult);
          break;
        case IntentChatResponseService.CHECK_EXAM_RESULT_INTENT:
          response = this.handleCheckExamResultIntent(queryResult);
          break;
        default:
          response = this.intentChatResponse.getFallbackIntentResponse();
      }

      return response;
    } catch (error) {
      this.logger.error('Error in webhook endpoint:', error);
      return this.intentChatResponse.getErrorIntentResponse(
        'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.',
      );
    }
  }

  private handleWelcomeIntent(): any {
    return this.intentChatResponse.getWelcomeIntentResponse();
  }

  private handleFallbackIntent(): any {
    return this.intentChatResponse.getFallbackIntentResponse();
  }

  private handleGoodbyeIntent(): any {
    return this.intentChatResponse.getGoodbyeIntentResponse();
  }

  private async handleExamScheduleIntent(queryResult: any): Promise<any> {
    const outputContextName = '/examschedule';
    return await this.intentChatResponse.getExamScheduleIntentResponse(
      queryResult,
      outputContextName,
    );
  }

  private async handleProvideExamScheduleDetailsIntent(
    queryResult: any,
  ): Promise<any> {
    return await this.intentChatResponse.getProvideExamScheduleDetailsResponse(
      queryResult,
    );
  }

  private handleCheckExamResultIntent(queryResult: any): any {
    const outputContextName = '/examresult';
    const examResultInfo = this.getExamResultInfo(
      queryResult,
      outputContextName,
    );
    if (!examResultInfo) {
      return this.intentChatResponse.getErrorIntentResponse();
    }
    return this.intentChatResponse.getCheckExamResultIntentResponse({
      student_id: examResultInfo['student_id.original'] || '---',
      exam_code: examResultInfo['exam_code.original'] || '---',
    });
  }

  private handleExamInfoIntent(): any {
    return this.intentChatResponse.getExamInfoIntentResponse({});
  }

  private handleExamDurationIntent(): any {
    return this.intentChatResponse.getExamDurationIntentResponse();
  }

  private handleExamQuestionsIntent(): any {
    return this.intentChatResponse.getExamQuestionsIntentResponse({});
  }

  private handleExamSubjectsIntent(): any {
    return this.intentChatResponse.getExamSubjectsIntentResponse({});
  }

  private handleExamRoomsIntent(queryResult: any): any {
    const outputContextName = '/examinfo';
    const examInfo = this.getExamInfo(queryResult, outputContextName);
    if (!examInfo) {
      return this.intentChatResponse.getErrorIntentResponse();
    }
    return this.intentChatResponse.getExamRoomsIntentResponse({
      student_id: examInfo['student_id.original'] || '---',
      exam_code: examInfo['exam_code.original'] || '---',
    });
  }
  private getExamInfo(queryResult: any, outputContextName: string): any {
    const outputContexts = queryResult?.outputContexts || [];
    const examInfoOutputContext = outputContexts.find((context: any) =>
      context.name?.endsWith(outputContextName),
    );
    return examInfoOutputContext ? examInfoOutputContext.parameters : null;
  }

  private getExamResultInfo(queryResult: any, outputContextName: string): any {
    const outputContexts = queryResult?.outputContexts || [];
    const examResultInfoOutputContext = outputContexts.find((context: any) =>
      context.name?.endsWith(outputContextName),
    );
    return examResultInfoOutputContext
      ? examResultInfoOutputContext.parameters
      : null;
  }

  private getExamScheduleInfo(queryResult: any, contextName: string): any {
    const contexts = queryResult.outputContexts || [];
    const context = contexts.find((ctx: any) => ctx.name.includes(contextName));
    return context?.parameters || null;
  }
}
