import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';


// `/projects/`
@Controller('projects')
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService,
    ) {}


    //全プロジェクトを取得
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.projectService.findAll();
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
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe)
        id: number,
    ) {
        return this.projectService.findOne(id);
    }
}