import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  eventType?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}