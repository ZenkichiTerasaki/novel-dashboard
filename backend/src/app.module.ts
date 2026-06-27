import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { ScenarioModule } from './scenario/scenario.module';
import { EventModule } from './event/event.module';

@Module({
  imports: [PrismaModule, ProjectModule, ScenarioModule, EventModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
