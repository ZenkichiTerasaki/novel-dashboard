import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ReorderEventsDto } from './dto/reorder-events.dto';
@Injectable()
export class EventService {

    constructor(
        private readonly prisma: PrismaService,
    ) {}


    async create(
    scenarioId: number,
    dto: CreateEventDto,
    ) {

        const count = await this.prisma.event.count({
            where: {
            scenarioId,
            },
        });



        return this.prisma.event.create({
    data: {
        scenarioId,
        orderIndex: count,
        eventType: dto.eventType,
        param1: dto.param1,
        param2: dto.param2,
        param3: dto.param3,
        param4: dto.param4,
        param5: dto.param5,
        param6: dto.param6,
        },
    });
}

    async findAll(
    scenarioId: number,
    ) {
        return this.prisma.event.findMany({
            where: {
                scenarioId,
            },
            orderBy: {
            orderIndex: 'asc',
            },
        });
    }

async reorder(
  scenarioId: number,
  eventIds: number[],
) {
  return this.prisma.$transaction(async (tx) => {
    // Scenario内のイベントを取得
    const events = await tx.event.findMany({
      where: { scenarioId },
    });

    // 件数チェック
    if (events.length !== eventIds.length) {
      throw new Error("eventIdsの件数が一致しません。");
    }

    // IDチェック
    const existingIds = new Set(events.map((e) => e.id));
    for (const id of eventIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Event ${id} はScenario ${scenarioId}に存在しません。`);
      }
    }

    // ① 一旦負の値へ退避
    for (const event of events) {
      await tx.event.update({
        where: { id: event.id },
        data: {
          orderIndex: -(event.orderIndex + 1),
        },
      });
    }

    // ② 新しい順番を設定
    for (let index = 0; index < eventIds.length; index++) {
      await tx.event.update({
        where: { id: eventIds[index] },
        data: {
          orderIndex: index,
        },
      });
    }

    return { message: "Reordered successfully" };
  });
}



}
