// src/event/dto/reorder-events.dto.ts
import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class ReorderEventsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  eventIds: number[];
}