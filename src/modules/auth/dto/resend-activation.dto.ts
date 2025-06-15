import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendActivationDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
