import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
    constructor(
        private prisma: PrismaService,
    ) {}

    async create(dto: CreateProjectDto, userId : number) {

        return this.prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                name: dto.name,
                },
            });

            await tx.projectMember.create({
                data: {
                    projectId: project.id,
                    userId,
                    role: 'OWNER',
                },
            });

            return project;
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