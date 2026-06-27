import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ReorderEventsDto } from './dto/reorder-events.dto';

@Controller()
export class EventController {

    constructor(
        private readonly eventService: EventService,
    ) {}


@Post('scenarios/:scenarioId/events')
    create(
        @Param('scenarioId', ParseIntPipe)
        scenarioId: number,

        @Body()
        dto: CreateEventDto,
    ) {
        return this.eventService.create(
        scenarioId,
        dto,
  );
}

@Get('scenarios/:scenarioId/events')
findAll(
    @Param('scenarioId', ParseIntPipe)
    scenarioId: number,
) {
    return this.eventService.findAll(
    scenarioId,
    );
}

@Patch('scenarios/:scenarioId/events/order')
reorder(
  @Param('scenarioId', ParseIntPipe)
  scenarioId: number,

  @Body()
  dto: ReorderEventsDto,
) {
  return this.eventService.reorder(
    scenarioId,
    dto.eventIds,
  );
}

}
