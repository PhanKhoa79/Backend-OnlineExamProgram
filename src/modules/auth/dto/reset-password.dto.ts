// src/modules/auth/dto/reset-password.dto.ts
import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Mã xác thực không hợp lệ' })
  @Matches(/^\d{6}$/, { message: 'Mã xác thực phải gồm 6 chữ số' })
  code: string;

  @IsString({ message: 'Mật khẩu mới không hợp lệ' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  newPassword: string;
}
