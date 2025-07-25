// src/modules/account/dto/create-account.dto.ts
import {
  IsString,
  MinLength,
  IsEmail,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateAccountDto {
  @IsString({ message: 'Tên tài khoản phải là chuỗi' })
  @MinLength(4, { message: 'Tên tài khoản phải có ít nhất 4 ký tự' })
  accountname: string;

  @IsString({ message: 'Mật khẩu không hợp lệ' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsOptional()
  role: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  urlAvatar?: string;
}
