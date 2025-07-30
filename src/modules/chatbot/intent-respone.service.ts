/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { UIChatResponseService } from './UI-chat-respone.service';
import { ExamScheduleService } from '../exam-schedule/exam-schedule.service';
import { ClassesService } from '../classes/classes.service';
import { SubjectService } from '../subject/subject.service';

@Injectable()
export class IntentChatResponseService extends UIChatResponseService {
  // === INTENT CONSTANTS FOR QUIZ WEBSITE ===
  static readonly WELCOME_INTENT = 'WelcomeIntent';
  static readonly FALLBACK_INTENT = 'FallbackIntent';
  static readonly GOODBYE_INTENT = 'GoodbyeIntent';

  static readonly GET_EXAM_SCHEDULE_INTENT = 'GetExamScheduleIntent';
  static readonly PROVIDE_EXAM_SCHEDULE_DETAILS_INTENT =
    'ProvideExamScheduleDetailsIntent';
  static readonly GET_EXAM_INFO_INTENT = 'GetExamInfoIntent';
  static readonly GET_EXAM_DURATION_INTENT = 'GetExamDurationIntent';
  static readonly GET_EXAM_QUESTIONS_INTENT = 'GetExamQuestionsIntent';
  static readonly GET_EXAM_SUBJECTS_INTENT = 'GetExamSubjectsIntent';
  static readonly GET_EXAM_ROOMS_INTENT = 'GetExamRoomsIntent';

  static readonly CHECK_EXAM_RESULT_INTENT = 'CheckExamResultIntent';
  static readonly GET_RESULT_DETAILS_INTENT = 'GetResultDetailsIntent';
  static readonly GET_SCORE_BREAKDOWN_INTENT = 'GetScoreBreakdownIntent';
  static readonly GET_RESULT_HISTORY_INTENT = 'GetResultHistoryIntent';
  static readonly GET_PASSING_SCORE_INTENT = 'GetPassingScoreIntent';

  constructor(
    private readonly examScheduleService: ExamScheduleService,
    private readonly classService: ClassesService,
    private readonly subjectService: SubjectService,
  ) {
    super();
  }

  // === BASIC INTENTS ===
  getWelcomeIntentResponse(): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          `Xin chào! Tôi là trợ lý AI của website thi trắc nghiệm. Tôi có thể giúp gì cho bạn? 👋`,
        ]),
        {
          payload: {
            richContent: [
              [
                this.getSuggestionChipResponseComponent([
                  { text: 'Xem lịch thi 📅' },
                  { text: 'Thông tin bài thi 📋' },
                  { text: 'Kết quả thi 🏆' },
                  { text: 'Cấu trúc đề thi 📝' },
                  { text: 'Môn thi 📚' },
                  { text: 'Phòng thi 🏫' },
                ]),
              ],
            ],
          },
        },
      ],
    };
  }

  getFallbackIntentResponse(): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          'Xin lỗi, tôi chưa hiểu câu hỏi của bạn. Bạn có thể hỏi về lịch thi, thông tin bài thi, hoặc kết quả thi.',
        ]),
      ],
    };
  }

  getGoodbyeIntentResponse(): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          'Chúc bạn thi tốt! Hẹn gặp lại bạn! 😊',
        ]),
      ],
    };
  }

  // === EXAM INFO INTENTS ===
  async getExamScheduleIntentResponse(
    queryResult: any,
    outputContextName?: string,
  ): Promise<any> {
    const { parameters } = queryResult;
    const classCode = parameters?.classCode || '';
    const subjectName = parameters?.subjectName || '';

    if (!classCode || !subjectName) {
      const sessionId =
        queryResult.session?.split('/').pop() || 'default-session';
      const projectId = 'mychatbot-volx';
      const fullContextName = `projects/${projectId}/agent/sessions/${sessionId}/contexts/${outputContextName?.replace('/', '') || 'examschedule'}`;

      return {
        fulfillmentMessages: [
          this.getTextResponseComponent([
            'Bạn vui lòng cung cấp thêm mã lớp, môn học để tôi có thể tìm lịch thi cho bạn.',
          ]),
          {
            payload: {
              richContent: [
                [
                  {
                    type: 'list',
                    title: 'Bạn có thể nhập theo dạng:',
                    items: [
                      { text: '➤: Mã lớp là ABC, môn là Toán' },
                      { text: '➤: ABC - Toán' },
                      { text: '➤: Lớp ABC, môn Toán' },
                      { text: '➤: ABC, Toán' },
                    ],
                  },
                ],
              ],
            },
          },
        ],
        outputContexts: outputContextName
          ? [{ name: fullContextName, lifespanCount: 1 }]
          : [],
      };
    }

    try {
      const classEntity = await this.classService.findByCodeOrName(classCode);
      if (!classEntity) {
        return {
          fulfillmentMessages: [
            this.getTextResponseComponent([
              `Không tìm thấy lớp với mã/tên "${classCode}". Vui lòng kiểm tra lại.`,
            ]),
          ],
        };
      }

      const subject = await this.subjectService.findByCodeOrName(subjectName);
      if (!subject) {
        return {
          fulfillmentMessages: [
            this.getTextResponseComponent([
              `Không tìm thấy môn học với mã/tên "${subjectName}". Vui lòng kiểm tra lại.`,
            ]),
          ],
        };
      }

      const today = new Date(); // 04:44 PM +07, 30/07/2025
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      const schedules =
        await this.examScheduleService.findByClassAndSubjectToday(
          classEntity.id,
          subject.id,
          startOfDay,
        );

      if (!schedules || schedules.length === 0) {
        return {
          fulfillmentMessages: [
            this.getTextResponseComponent([
              'Hiện tại chưa có lịch thi nào tương ứng với thông tin bạn cung cấp.',
            ]),
          ],
        };
      }

      const scheduleList = schedules
        .map(
          (schedule) =>
            `${schedule.startTime.toLocaleString('vi-VN')} đến ${schedule.endTime.toLocaleString('vi-VN')}`,
        )
        .join('\n');

      return {
        fulfillmentMessages: [
          this.getTextResponseComponent([
            `Bạn có lịch thi môn ${subject.name}`,
            `Mã lịch thi: ${schedules[0].code}`,
            'Thời gian:',
            scheduleList,
          ]),
        ],
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        fulfillmentMessages: [
          this.getTextResponseComponent([
            'Có lỗi xảy ra khi tìm lịch thi. Vui lòng thử lại sau.',
          ]),
        ],
      };
    }
  }

  async getProvideExamScheduleDetailsResponse(queryResult: any): Promise<any> {
    return await this.getExamScheduleIntentResponse(queryResult);
  }

  getExamInfoIntentResponse(params: Record<string, any> = {}): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          'Bạn muốn xem thông tin chi tiết bài thi nào? Tôi có thể cung cấp thông tin về cấu trúc đề thi, thời gian làm bài, số câu hỏi.',
        ]),
      ],
    };
  }

  getExamDurationIntentResponse(params: Record<string, any> = {}): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          'Thời gian làm bài thi thường là 60 phút. Bạn muốn hỏi về bài thi nào cụ thể không?',
        ]),
      ],
    };
  }

  getExamQuestionsIntentResponse(params: Record<string, any> = {}): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          'Một đề thi thường có 40 câu hỏi trắc nghiệm. Bạn muốn biết về cấu trúc đề thi môn nào?',
        ]),
      ],
    };
  }

  getExamSubjectsIntentResponse(params: Record<string, any> = {}): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          'Các môn thi bao gồm: Toán, Văn, Lý, Hóa, Sinh, Anh, Sử, Địa. Bạn muốn xem lịch thi hoặc đề thi môn nào?',
        ]),
      ],
    };
  }

  getExamRoomsIntentResponse(params: Record<string, any> = {}): any {
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          'Bạn muốn biết thông tin phòng thi của môn nào? Vui lòng cung cấp mã sinh viên hoặc mã bài thi.',
        ]),
      ],
    };
  }

  // === EXAM RESULT INTENTS ===
  getCheckExamResultIntentResponse(params: Record<string, any> = {}): any {
    const { student_id, exam_code } = params;

    if (!student_id || student_id === '---') {
      return {
        fulfillmentMessages: [
          this.getTextResponseComponent([
            'Bạn muốn xem kết quả bài thi nào? Vui lòng cung cấp mã sinh viên hoặc mã bài thi.',
          ]),
        ],
      };
    }

    // Logic để lấy kết quả thi theo student_id và exam_code
    return {
      fulfillmentMessages: [
        this.getTextResponseComponent([
          `Đang tìm kết quả thi cho sinh viên ${student_id}${exam_code !== '---' ? ` - Mã bài thi: ${exam_code}` : ''}...`,
        ]),
      ],
    };
  }

  public getErrorIntentResponse(errorMessage: string | null = null): any {
    const message = errorMessage || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    return {
      fulfillmentMessages: [this.getTextResponseComponent([message])],
    };
  }
}
