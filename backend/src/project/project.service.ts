import { 
    Injectable,
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
    ForbiddenException,
    NotFoundException
 } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import {ProjectPermissionService} from './project-permission.service';
import { UserService } from '../user/user.service';

@Injectable()
export class ProjectService {
    constructor(
        private prisma: PrismaService,
        private readonly permissionService: ProjectPermissionService,
        private readonly userService: UserService,
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

    async findAll(userId: number) {
        return this.prisma.project.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
        });
    }

    async findOne(id: number, userId: number) {

        await this.permissionService.requireViewer(userId,id,);

        return this.prisma.project.findUnique({
        where: {
            id,
        },
        });
    }


    async update(
        id: number,
        dto: UpdateProjectDto,
        userId: number,
    ) {

        await this.permissionService.requireEditor(
            userId,
            id,
        );

        return this.prisma.project.update({
            where: {
                id,
            },
            data: {
                 name: dto.name,
            },
        });
    }


    async remove(id: number,userId: number,) {

        await this.permissionService.requireOwner(userId,id,);

        return this.prisma.project.delete({
            where: {
                id,
            },
        });
    }

    async inviteMember(
    projectId: number,
    dto: InviteMemberDto,
    userId: number,
    ) {
    await this.permissionService.requireOwner(
        userId,
        projectId,
    );

    const user =
        await this.userService.findByEmail(
        dto.email,
        );

    if (!user) {
        throw new NotFoundException(
        'ユーザが見つかりません。',
        );
    }

    return this.prisma.projectMember.create({
        data: {
        projectId,
        userId: user.id,
        role: dto.role,
        },
    });
    }
}