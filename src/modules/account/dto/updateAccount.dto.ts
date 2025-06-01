// src/modules/account/dto/create-account.dto.ts
import {
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class UpdateAccountDto {
  @IsString({ message: 'Tên tài khoản phải là chuỗi' })
  @MinLength(4, { message: 'Tên tài khoản phải có ít nhất 4 ký tự' })
  @IsOptional()
  accountname: string;

  @IsOptional()
  @IsString({ message: 'Mật khẩu mới không hợp lệ' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @Matches(/^[A-Z][A-Za-z\d!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]{7,}$/, {
    message:
      'Mật khẩu phải bắt đầu bằng chữ cái in hoa, có ít nhất 8 ký tự và bao gồm chữ cái, số và ký tự đặc biệt',
  })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).+$/, {
    message: 'Mật khẩu phải bao gồm cả chữ cái, số và ký tự đặc biệt',
  })
  password?: string;

  @IsOptional()
  role: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsString()
  urlAvatar?: string;
}
