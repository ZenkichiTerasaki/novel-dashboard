import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsNotEmpty()
  @IsIn(['OWNER', 'EDITOR', 'VIEWER'])
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
}
