import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
  ) {}

    async create(dto: CreateProjectDto) {

        console.log(dto);
        return this.prisma.project.create({
            data: {
                name: dto.name,
            },
        });
    }

    async findAll() {
        return this.prisma.project.findMany();
    }

    async findOne(id: number) {
        return this.prisma.project.findUnique({
        where: {
            id,
        },
        });
    }
}