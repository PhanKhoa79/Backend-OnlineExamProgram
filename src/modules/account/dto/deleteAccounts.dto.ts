import { IsArray, ArrayNotEmpty, IsNumber } from 'class-validator';

export class DeleteAccountsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  ids: number[];
}
