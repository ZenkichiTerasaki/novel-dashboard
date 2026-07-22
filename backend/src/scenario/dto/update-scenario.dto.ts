import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateScenarioDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}