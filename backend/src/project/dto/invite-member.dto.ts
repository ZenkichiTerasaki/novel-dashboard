import {
  IsEmail,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsIn(['EDITOR', 'VIEWER'])
  role: 'EDITOR' | 'VIEWER';
}