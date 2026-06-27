import { Module } from '@nestjs/common';

import { ScenarioController } from './scenario.controller';
import { ScenarioService } from './scenario.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScenarioController],
  providers: [ScenarioService],
})
export class ScenarioModule {}