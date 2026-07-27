import { IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  eventType?: string;

  @IsString()
  @IsOptional()
  param1?: string;

  @IsString()
  @IsOptional()
  param2?: string;

  @IsString()
  @IsOptional()
  param3?: string;

  @IsString()
  @IsOptional()
  param4?: string;

  @IsString()
  @IsOptional()
  param5?: string;

  @IsString()
  @IsOptional()
  param6?: string;
}