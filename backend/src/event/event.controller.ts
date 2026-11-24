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

import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ReorderEventsDto } from './dto/reorder-events.dto';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller()
export class EventController {

  //コンストラクタ
  constructor(
    private readonly eventService: EventService,
  ) {}

  @UseGuards(SessionAuthGuard)
  @Post('scenarios/:scenarioId/events')
  create(
      /*引数*/ 
      @Param('scenarioId', ParseIntPipe)
      scenarioId: number,

      @Body()
      dto: CreateEventDto,

      @CurrentUser() user: any,
      /*---*/ 
  ){
      return this.eventService.create(
        scenarioId,
        dto,
        user.userId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Get('scenarios/:scenarioId/events')
  findAll(
    /*引数*/ 
    @Param('scenarioId', ParseIntPipe) scenarioId: number,
    @CurrentUser() user: any,
    /*---*/ 
  ) {
    return this.eventService.findAll(
    scenarioId,
    user.userId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Patch('scenarios/:scenarioId/events/order')
  reorder(
    /*引数*/
    @Param('scenarioId', ParseIntPipe) scenarioId: number,
    @Body() dto: ReorderEventsDto,
    @CurrentUser() user: any,
    /*---*/ 
  ) {
    return this.eventService.reorder(
      scenarioId,
      dto.eventIds,
      user.userId,
    );
  }


  @UseGuards(SessionAuthGuard)
  @Patch('events/:id')
  update(
    /*引数*/
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: any,
    /*---*/
  ) {
    return this.eventService.update(
      id,
      dto,
      user.userId,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Delete('events/:id')
  remove(
    /*引数*/
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    /*---*/
  ) {
    return this.eventService.remove(
      id,
      user.userId,
    );
  }
}
