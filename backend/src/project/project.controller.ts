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

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
  ) {}

@Get()
findAll() {
    return this.projectService.findAll();
}

@Post()
create(
    @Body() dto: CreateProjectDto,
) {
    return this.projectService.create(dto);
}

@Get(':id')
findOne(
    @Param('id', ParseIntPipe)
    id: number,
) {
    return this.projectService.findOne(id);
}
}