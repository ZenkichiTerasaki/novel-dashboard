import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Delete,
} from '@nestjs/common';

import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

// `/projects/`
@Controller('projects')
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService,
    ) {}


    //全プロジェクトを取得
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(
        @CurrentUser() user: any,
    ) {
        return this.projectService.findAll(
            user.userId,
        );
    }

    //プロジェクトの生成
    @UseGuards(JwtAuthGuard)
    @Post()
    create(
        @Body() dto: CreateProjectDto,
        @CurrentUser() user: any,
    ) {

        return this.projectService.create(
            dto, 
            user.userId,
        );
    }

    //プロジェクトのID検索
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: any,
    ) {

        console.log('request user:', user);
        return this.projectService.findOne(id, user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProjectDto,
        @CurrentUser() user: any,
    ) {
        return this.projectService.update(
        id,
        dto,
        user.userId,
        );
    }  
    
    
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: any,
    ) {

        return this.projectService.remove(
            id,
            user.userId,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post(':projectId/members')
    inviteMember(
    @Param('projectId', ParseIntPipe)
    projectId: number,

    @Body()
    dto: InviteMemberDto,

    @CurrentUser()
    user: any,
    ) {
    return this.projectService.inviteMember(
        projectId,
        dto,
        user.userId,
    );
    }
}