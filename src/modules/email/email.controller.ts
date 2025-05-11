import { Body, Controller, Post } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/email.dto';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorator/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async sendMail(@Body() dto: SendEmailDto) {
    await this.emailService.sendEmail(dto);
    return { meesage: 'Email sent success' };
  }
}
