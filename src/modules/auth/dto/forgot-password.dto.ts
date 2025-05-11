// src/modules/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
