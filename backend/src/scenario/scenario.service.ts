import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';

@Injectable()
export class ScenarioService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    projectId: number,
    dto: CreateScenarioDto,
  ) {
    return this.prisma.scenario.create({
      data: {
        name: dto.name,
        projectId,
      },
    });
  }

  async findAll(
    projectId: number,
  ) {
    return this.prisma.scenario.findMany({
      where: {
        projectId,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }
}