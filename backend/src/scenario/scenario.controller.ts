import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  UseGuards
} from '@nestjs/common';

import { ScenarioService } from './scenario.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateScenarioDto } from './dto/update-scenario.dto';

@Controller()
export class ScenarioController {
  constructor(
    private readonly scenarioService: ScenarioService,
  ) {}

  @UseGuards(SessionAuthGuard)
  @Post('projects/:projectId/scenarios')
  create(
    @Param('projectId', ParseIntPipe)
    projectId: number,

    @Body()
    dto: CreateScenarioDto,

    @CurrentUser()
    user: any,
  ) {
    return this.scenarioService.create(
      projectId,
      dto,
      user.userId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Get('projects/:projectId/scenarios')
  findAll(
    @Param('projectId', ParseIntPipe)
    projectId: number,
    @CurrentUser() user: any,
  ) {
    return this.scenarioService.findAll(
      projectId,
      user.userId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Get('scenarios/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.scenarioService.findOne(
      id,
      user.userId,
    );
  } 
  

  @UseGuards(SessionAuthGuard)
  @Patch('scenarios/:id')
  update(
    @Param('id', ParseIntPipe) id: number,

    @Body()
    dto: UpdateScenarioDto,

    @CurrentUser()
    user: any,
  ) {
    return this.scenarioService.update(
      id,
      dto,
      user.userId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Delete('scenarios/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.scenarioService.remove(
      id,
      user.userId,
    );
  }
}