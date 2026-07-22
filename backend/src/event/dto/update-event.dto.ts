import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class UpdateEventDto {
  eventType: string;

  param1?: string;
  param2?: string;
  param3?: string;
  param4?: string;
  param5?: string;
  param6?: string;
}