import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { SendEmailDto } from './dto/email.dto';
import { join } from 'path';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}
  emailTransport() {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
    return transporter;
  }

  async sendEmail(dto: SendEmailDto) {
    const { to, username, tempPassword, activationToken, expiresIn } = dto;

    const activationLink = `${process.env.CLIENT_URL}/activate?token=${activationToken}`;

    const transport = this.emailTransport();

    const distPath = join(__dirname, 'templates', 'activate-account.hbs');
    const srcPath = join(
      process.cwd(),
      'src',
      'modules',
      'email',
      'templates',
      'activate-account.hbs',
    );
    const templatePath = 
      process.env.NODE_ENV === 'production' && existsSync(distPath)
        ? distPath
        : srcPath;

    const templateSource = readFileSync(templatePath, 'utf8');

    const template = handlebars.compile(templateSource);
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
    };
    try {
      await transport.sendMail(options);
      console.log('Email sent successfully');
    } catch (error) {
        console.log('Error sending email: ', error);
    }
  }

  async sendForgotPasswordCode(
    to: string,
    code: string,
    expiresIn: string,
  ): Promise<void> {
    // 1. Khởi tạo transporter
    const transport = this.emailTransport();

    // 2. Xác định đường dẫn template .hbs trong dist hoặc src
    const distPath = join(__dirname, 'templates', 'forgot-password.hbs');
    const srcPath = join(
      process.cwd(),
      'src',
      'modules',
      'email',
      'templates',
      'forgot-password.hbs',
    );
    const templatePath =
      process.env.NODE_ENV === 'production' && existsSync(distPath)
        ? distPath
        : srcPath;

    // 3. Đọc nội dung file template
    const templateSource = readFileSync(templatePath, 'utf8');

    // 4. Compile Handlebars template với context { code, expiresIn }
    const template = handlebars.compile(templateSource);
    const html = template({ code, expiresIn });

    // 5. Chuẩn bị các tuỳ chọn gửi mail
    const mailOptions: nodemailer.SendMailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject: 'Mã xác thực lấy lại mật khẩu',
      html,
    };

    // 6. Gửi mail và log kết quả
    try {
      await transport.sendMail(mailOptions);
      console.log(`✅ Forgot-password code sent to ${to}`);
    } catch (error) {
      console.error('❌ Error sending forgot-password code:', error);
    }
}
}
