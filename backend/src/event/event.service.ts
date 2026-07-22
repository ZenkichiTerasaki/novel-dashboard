import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ReorderEventsDto } from './dto/reorder-events.dto';
import { ProjectPermissionService } from '../project/project-permission.service';


import { UpdateEventDto } from './dto/update-event.dto';


@Injectable()
export class EventService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly permissionService: ProjectPermissionService,
    ) {}


    async create(
    scenarioId: number,
    dto: CreateEventDto,
    userId: number,
    ) {

      const scenario =
        await this.prisma.scenario.findUnique({
          where: {
            id: scenarioId,
          },
        });

      if (!scenario) {
        throw new NotFoundException(
          'Scenarioが見つかりません。',
        );
      }

      await this.permissionService.requireEditor(
        userId,
        scenario.projectId,
      );

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
    userId: number,
  ) {
    const scenario = await this.prisma.scenario.findUnique({
      where: {
        id: scenarioId,
      },
    });

  if (!scenario) {
    throw new NotFoundException(
      'Scenarioが見つかりません。',
    );
  }

  await this.permissionService.requireViewer(
    userId,
    scenario.projectId,
  );

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

async update(
  id: number,
  dto: UpdateEventDto,
  userId: number,
) {
  const event =
    await this.prisma.event.findUnique({
      where: {
        id,
      },
      include: {
        scenario: true,
      },
    });

  if (!event) {
    throw new NotFoundException(
      'Eventが見つかりません。',
    );
  }

  await this.permissionService.requireEditor(
    userId,
    event.scenario.projectId,
  );

  return this.prisma.event.update({
    where: {
      id,
    },
    data: {
      eventType: dto.eventType,
      param1: dto.param1,
      param2: dto.param2,
    },
  });
}

async remove(
  id: number,
  userId: number,
) {
  const event =
    await this.prisma.event.findUnique({
      where: {
        id,
      },
      include: {
        scenario: true,
      },
    });

  if (!event) {
    throw new NotFoundException(
      'Eventが見つかりません。',
    );
  }

  await this.permissionService.requireOwner(
    userId,
    event.scenario.projectId,
  );

  return this.prisma.event.delete({
    where: {
      id,
    },
  });
}


}
