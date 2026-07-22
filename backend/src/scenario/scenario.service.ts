import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { ProjectPermissionService } from '../project/project-permission.service';
import { UpdateScenarioDto } from './dto/update-scenario.dto';

@Injectable()
export class ScenarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: ProjectPermissionService,
  ) {}

  async create(
    projectId: number,
    dto: CreateScenarioDto,
    userId: number,
  ) {
    await this.permissionService.requireEditor(
        userId,
      projectId,
    );

    return this.prisma.scenario.create({
      data: {
        name: dto.name,
        projectId,
      },
    });
  }

  async findAll(
    projectId: number,
    userId: number,
  ) {

    await this.permissionService.requireViewer(
      userId,
      projectId,
    );

    return this.prisma.scenario.findMany({
      where: {
        projectId,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(
    id: number,
    userId: number,
  ) {
    const scenario =
      await this.prisma.scenario.findUnique({
        where: {
          id,
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

    return scenario;
  }

async update(
  id: number,
  dto: UpdateScenarioDto,
  userId: number,
) {
  const scenario =
    await this.prisma.scenario.findUnique({
      where: {
        id,
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

  return this.prisma.scenario.update({
    where: {
      id,
    },
    data: {
      name: dto.name,
    },
  });
  }


  async remove(
    id: number,
    userId: number,
  ) {
    const scenario =
      await this.prisma.scenario.findUnique({
        where: {
          id,
        },
      });

    if (!scenario) {
      throw new NotFoundException(
        'Scenarioが見つかりません。',
      );
    }

    await this.permissionService.requireOwner(
      userId,
      scenario.projectId,
    );

    return this.prisma.scenario.delete({
      where: {
        id,
      },
    });
  }
}