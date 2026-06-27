import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ScenarioService } from './scenario.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';

@Controller()
export class ScenarioController {
  constructor(
    private readonly scenarioService: ScenarioService,
  ) {}

  @Post('projects/:projectId/scenarios')
  create(
    @Param('projectId', ParseIntPipe)
    projectId: number,

    @Body()
    dto: CreateScenarioDto,
  ) {
    return this.scenarioService.create(
      projectId,
      dto,
    );
  }

  @Get('projects/:projectId/scenarios')
  findAll(
    @Param('projectId', ParseIntPipe)
    projectId: number,
  ) {
    return this.scenarioService.findAll(
      projectId,
    );
  }
}