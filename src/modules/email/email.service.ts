import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { SendEmailDto } from './dto/email.dto';
import { join } from 'path';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { RedisService } from '../redis/redis.service';

interface QueuedEmail {
  options: nodemailer.SendMailOptions;
  id: string;
  timestamp: number;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templateCache: Record<string, handlebars.TemplateDelegate> = {};
  private readonly MAX_CONCURRENT_EMAILS = 5;
  private activeEmailCount = 0;
  private isProcessingQueue = false;
  private readonly REDIS_EMAIL_QUEUE_KEY = 'email:queue';
  private readonly REDIS_EMAIL_PROCESSING_KEY = 'email:processing';
  private readonly REDIS_EMAIL_FAILED_KEY = 'email:failed';
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Khởi tạo transporter khi module được khởi tạo
    this.initializeTransporter();
    // Tải sẵn các template
    this.preloadTemplates();
    // Bắt đầu xử lý hàng đợi
    this.startQueueProcessing();
    // Khôi phục các email đang xử lý (nếu có) khi server khởi động lại
    await this.recoverProcessingEmails();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'smtp',
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      pool: true, // Sử dụng connection pool
      maxConnections: 10, // Tăng số kết nối tối đa trong pool
      maxMessages: 200, // Tăng số email tối đa mỗi kết nối
      // Thêm các tùy chọn để tăng hiệu suất
      socketTimeout: 30000, // 30 giây timeout
      keepAlive: true,
      debug: process.env.NODE_ENV !== 'production',
    } as nodemailer.TransportOptions);

    // Kiểm tra kết nối
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection error:', error);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  private preloadTemplates() {
    try {
      // Preload template kích hoạt tài khoản
      const activateTemplatePath = this.getTemplatePath('activate-account.hbs');
      const activateTemplateSource = readFileSync(activateTemplatePath, 'utf8');
      this.templateCache['activate-account'] = handlebars.compile(
        activateTemplateSource,
      );

      // Preload template quên mật khẩu
      const forgotPasswordTemplatePath = this.getTemplatePath(
        'forgot-password.hbs',
      );
      const forgotPasswordTemplateSource = readFileSync(
        forgotPasswordTemplatePath,
        'utf8',
      );
      this.templateCache['forgot-password'] = handlebars.compile(
        forgotPasswordTemplateSource,
      );

      this.logger.log('Email templates preloaded successfully');
    } catch (error) {
      this.logger.error('Failed to preload email templates:', error);
    }
  }

  private getTemplatePath(templateName: string): string {
    const distPath = join(__dirname, 'templates', templateName);
    const srcPath = join(
      process.cwd(),
      'src',
      'modules',
      'email',
      'templates',
      templateName,
    );
    return process.env.NODE_ENV === 'production' && existsSync(distPath)
      ? distPath
      : srcPath;
  }

  private getCompiledTemplate(
    templateName: string,
  ): handlebars.TemplateDelegate {
    if (!this.templateCache[templateName]) {
      const templatePath = this.getTemplatePath(`${templateName}.hbs`);
      const templateSource = readFileSync(templatePath, 'utf8');
      this.templateCache[templateName] = handlebars.compile(templateSource);
    }
    return this.templateCache[templateName];
  }

  private startQueueProcessing() {
    this.processingInterval = setInterval(async () => {
      await this.processEmailQueue();
    }, 5000);
  }

  private async recoverProcessingEmails() {
    try {
      const processingEmails = await this.redisService.keys(
        `${this.REDIS_EMAIL_PROCESSING_KEY}:*`,
      );

      if (processingEmails.length > 0) {
        this.logger.log(
          `Found ${processingEmails.length} emails in processing state. Recovering...`,
        );

        for (const key of processingEmails) {
          const emailData = await this.redisService.get(key);
          if (emailData) {
            // Chuyển lại vào hàng đợi để xử lý lại
            const emailId = key.split(':')[2];
            await this.redisService.lpush(
              this.REDIS_EMAIL_QUEUE_KEY,
              emailData,
            );
            await this.redisService.del(key);
            this.logger.log(`Recovered email ${emailId} back to queue`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error recovering processing emails:', error);
    }
  }

  private async processEmailQueue() {
    if (
      this.isProcessingQueue ||
      this.activeEmailCount >= this.MAX_CONCURRENT_EMAILS
    ) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Lấy số lượng email cần xử lý (tối đa là MAX_CONCURRENT_EMAILS - activeEmailCount)
      const emailsToProcess =
        this.MAX_CONCURRENT_EMAILS - this.activeEmailCount;

      if (emailsToProcess <= 0) {
        return;
      }

      // Lấy email từ hàng đợi Redis
      for (let i = 0; i < emailsToProcess; i++) {
        const emailData = await this.redisService.rpop(
          this.REDIS_EMAIL_QUEUE_KEY,
        );

        if (!emailData) {
          // Không còn email trong hàng đợi
          break;
        }

        const queuedEmail: QueuedEmail = JSON.parse(emailData);
        this.activeEmailCount++;

        // Đánh dấu email đang được xử lý
        await this.redisService.set(
          `${this.REDIS_EMAIL_PROCESSING_KEY}:${queuedEmail.id}`,
          emailData,
          300, // TTL 5 phút, đề phòng email bị treo
        );

        // Xử lý email bất đồng bộ
        this.sendEmailWithRetry(queuedEmail)
          .catch((error) => {
            this.logger.error(
              `Failed to send email to ${queuedEmail.options.to}:`,
              error,
            );
            // Lưu email thất bại vào Redis để xem xét sau
            this.redisService
              .lpush(
                this.REDIS_EMAIL_FAILED_KEY,
                JSON.stringify({
                  ...queuedEmail,
                  error: error.message,
                  failedAt: Date.now(),
                }),
              )
              .catch((err) => {
                this.logger.error('Error saving failed email:', err);
              });
          })
          .finally(async () => {
            // Xóa khỏi danh sách đang xử lý
            await this.redisService.del(
              `${this.REDIS_EMAIL_PROCESSING_KEY}:${queuedEmail.id}`,
            );
            this.activeEmailCount--;
          });
      }
    } catch (error) {
      this.logger.error('Error processing email queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async sendEmailWithRetry(
    queuedEmail: QueuedEmail,
    retries = 3,
  ): Promise<void> {
    try {
      await this.transporter.sendMail(queuedEmail.options);
      this.logger.log(`Email sent successfully to ${queuedEmail.options.to}`);
    } catch (error) {
      if (retries > 0) {
        this.logger.warn(
          `Retrying to send email to ${queuedEmail.options.to}. Attempts left: ${retries - 1}`,
        );
        // Chờ một chút trước khi thử lại
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.sendEmailWithRetry(queuedEmail, retries - 1);
      }
      throw error;
    }
  }

  private async queueEmail(options: nodemailer.SendMailOptions): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const queuedEmail: QueuedEmail = {
      options,
      id,
      timestamp: Date.now(),
    };

    await this.redisService.lpush(
      this.REDIS_EMAIL_QUEUE_KEY,
      JSON.stringify(queuedEmail),
    );

    this.logger.log(`Email to ${options.to} queued with ID ${id}`);
  }

  async sendEmail(dto: SendEmailDto): Promise<void> {
    const { to, username, tempPassword, activationToken, expiresIn } = dto;
    const activationLink = `${process.env.CLIENT_URL}/activate?token=${activationToken}`;

    try {
      // Sử dụng template đã cache
      const template = this.getCompiledTemplate('activate-account');
      const html = template({
        username,
        activationLink,
        tempPassword,
        expiresIn,
      });

      const options: nodemailer.SendMailOptions = {
        from: this.configService.get<string>('EMAIL_USER'),
        to: to,
        subject: 'Kích hoạt tài khoản của bạn',
        html,
        // Thêm priority để ưu tiên email kích hoạt
        priority: 'high',
      };

      // Thêm vào hàng đợi Redis
      await this.queueEmail(options);
    } catch (error) {
      this.logger.error('Error preparing activation email:', error);
      throw error;
    }
  }

  async sendForgotPasswordCode(
    to: string,
    code: string,
    expiresIn: string,
  ): Promise<void> {
    try {
      // Sử dụng template đã cache
      const template = this.getCompiledTemplate('forgot-password');
      const html = template({ code, expiresIn });

      const mailOptions: nodemailer.SendMailOptions = {
        from: this.configService.get<string>('EMAIL_USER'),
        to,
        subject: 'Mã xác thực lấy lại mật khẩu',
        html,
        // Thêm priority để ưu tiên email quên mật khẩu
        priority: 'high',
      };

      // Thêm vào hàng đợi Redis
      await this.queueEmail(mailOptions);
    } catch (error) {
      this.logger.error('Error preparing forgot-password email:', error);
      throw error;
    }
  }

  // Phương thức để lấy thông tin hàng đợi (hữu ích cho việc giám sát)
  async getQueueStats(): Promise<{
    queuedCount: number;
    processingCount: number;
    failedCount: number;
  }> {
    try {
      const [queuedCount, processingKeys, failedCount] = await Promise.all([
        this.redisService.llen(this.REDIS_EMAIL_QUEUE_KEY),
        this.redisService.keys(`${this.REDIS_EMAIL_PROCESSING_KEY}:*`),
        this.redisService.llen(this.REDIS_EMAIL_FAILED_KEY),
      ]);

      return {
        queuedCount,
        processingCount: processingKeys.length,
        failedCount,
      };
    } catch (error) {
      this.logger.error('Error getting queue stats:', error);
      return {
        queuedCount: 0,
        processingCount: 0,
        failedCount: 0,
      };
    }
  }

  // Phương thức để thử gửi lại các email thất bại
  async retryFailedEmails(limit = 10): Promise<number> {
    try {
      let retried = 0;

      for (let i = 0; i < limit; i++) {
        const failedEmailData = await this.redisService.rpop(
          this.REDIS_EMAIL_FAILED_KEY,
        );
        if (!failedEmailData) {
          break;
        }

        const failedEmail = JSON.parse(failedEmailData);
        await this.queueEmail(failedEmail.options);
        retried++;
      }

      return retried;
    } catch (error) {
      this.logger.error('Error retrying failed emails:', error);
      return 0;
    }
  }
}
