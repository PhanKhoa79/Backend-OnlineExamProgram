import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ' })
  to: string;

  @IsString({ message: 'Username phải là chuỗi' })
  @IsNotEmpty({ message: 'Username không được để trống' })
  username: string;

  @IsString({ message: 'Mật khẩu tạm thời không hợp lệ' })
  @MinLength(8, { message: 'Mật khẩu tạm thời phải có ít nhất 8 ký tự' })
  tempPassword: string;

  @IsString({ message: 'Token kích hoạt không hợp lệ' })
  @IsNotEmpty({ message: 'Token không được để trống' })
  activationToken: string;

  @IsString({ message: 'Thời gian hiệu lực không hợp lệ' })
  @IsNotEmpty({ message: 'expiresIn không được để trống' })
  expiresIn: string;
}
