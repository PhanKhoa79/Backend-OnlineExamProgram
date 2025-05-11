import { IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @IsString({ message: 'Token kích hoạt không hợp lệ' })
  token: string;

  @IsString({ message: 'Mật khẩu tạm thời không hợp lệ' })
  @MinLength(8, { message: 'Mật khẩu tạm thời phải có ít nhất 8 ký tự' })
  tempPassword: string;

  @IsString({ message: 'Mật khẩu mới không hợp lệ' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  newPassword: string;
}
