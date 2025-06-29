import { IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';

export class RoomStatusDto {
  @IsNumber()
  id: number;

  @IsEnum(['waiting', 'open', 'closed'])
  status: 'waiting' | 'open' | 'closed';

  @IsString()
  @IsOptional()
  message?: string;
} 