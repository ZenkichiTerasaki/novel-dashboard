import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { type AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@Controller('projects')
@UseGuards(SessionAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projectService.findAll(user.userId);
  }

  @Post()
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.create(dto, user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.remove(id, user.userId);
  }

  @Get(':projectId/members')
  getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.getMembers(projectId, user.userId);
  }

  @Post(':projectId/members')
  inviteMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.inviteMember(projectId, dto, user.userId);
  }

  @Patch(':projectId/members/:memberId')
  updateMemberRole(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.updateMemberRole(
      projectId,
      memberId,
      dto,
      user.userId,
    );
  }

  @Delete(':projectId/members/:memberId')
  removeMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectService.removeMember(projectId, memberId, user.userId);
  }
}
