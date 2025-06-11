import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  // eslint-disable-next-line prettier/prettier
  @Matches(/^[a-zA-Z]+:[a-zA-Z]+$/, {
    each: true,
    message: 'Each permission must be in format "resource:action"',
  })
  permissions: string[];
}
