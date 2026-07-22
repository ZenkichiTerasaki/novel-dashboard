import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [PrismaModule, ProjectModule],
  controllers: [EventController],
  providers: [EventService]
})
export class EventModule {}
