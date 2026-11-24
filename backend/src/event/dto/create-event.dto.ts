import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}