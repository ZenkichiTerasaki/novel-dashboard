import { Module } from '@nestjs/common';

import { ScenarioController } from './scenario.controller';
import { ScenarioService } from './scenario.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [PrismaModule, ProjectModule,],
  controllers: [ScenarioController],
  providers: [ScenarioService],
})
export class ScenarioModule {}