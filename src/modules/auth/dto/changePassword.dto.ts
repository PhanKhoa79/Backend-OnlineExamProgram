// src/modules/auth/dto/change-password.dto.ts
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString({ message: 'Mật khẩu mới không hợp lệ' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @Matches(/^[A-Z][A-Za-z\d!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]{7,}$/, {
    message:
      'Mật khẩu phải bắt đầu bằng chữ cái in hoa, có ít nhất 8 ký tự và bao gồm chữ cái, số và ký tự đặc biệt',
  })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).+$/, {
    message: 'Mật khẩu phải bao gồm cả chữ cái, số và ký tự đặc biệt',
  })
  newPassword: string;
}
