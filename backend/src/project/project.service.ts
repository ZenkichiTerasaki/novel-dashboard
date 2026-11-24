import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectPermissionService } from './project-permission.service';

const ROLE_PRIORITY: Record<string, number> = {
  OWNER: 0,
  EDITOR: 1,
  VIEWER: 2,
};

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private readonly permissionService: ProjectPermissionService,
    private readonly userService: UserService,
  ) {}

  async create(dto: CreateProjectDto, userId: number) {
    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: dto.name,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: created.id,
          userId,
          role: 'OWNER',
        },
      });

      return created;
    });

    return {
      ...project,
      myRole: 'OWNER' as const,
      _count: { members: 1, scenarios: 0 },
    };
  }

  async findAll(userId: number) {
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
        _count: {
          select: {
            members: true,
            scenarios: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return projects.map(({ members, ...project }) => ({
      ...project,
      myRole: members[0]?.role ?? 'VIEWER',
    }));
  }

  async findOne(id: number, userId: number) {
    const membership = await this.permissionService.requireViewer(userId, id);

    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            members: true,
            scenarios: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('プロジェクトが見つかりません。');
    }

    return {
      ...project,
      myRole: membership.role,
    };
  }

  async update(id: number, dto: UpdateProjectDto, userId: number) {
    const membership = await this.permissionService.requireEditor(userId, id);

    const updated = await this.prisma.project.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.presets !== undefined
          ? { presets: dto.presets as Prisma.InputJsonValue }
          : {}),
      },
    });

    return {
      ...updated,
      myRole: membership.role,
    };
  }

  async remove(id: number, userId: number) {
    await this.permissionService.requireOwner(userId, id);

    return this.prisma.project.delete({
      where: {
        id,
      },
    });
  }

  async getMembers(projectId: number, userId: number) {
    await this.permissionService.requireViewer(userId, projectId);

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return members.sort(
      (a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99),
    );
  }

  async inviteMember(projectId: number, dto: InviteMemberDto, userId: number) {
    await this.permissionService.requireOwner(userId, projectId);

    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException(
        '指定されたメールアドレスのユーザーが見つかりません。先にアカウント登録を行ってください。',
      );
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'このユーザーは既にプロジェクトのメンバーです。',
      );
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    projectId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
    userId: number,
  ) {
    await this.permissionService.requireOwner(userId, projectId);

    const target = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });

    if (!target) {
      throw new NotFoundException('対象のメンバーが見つかりません。');
    }

    if (target.role === 'OWNER' && dto.role !== 'OWNER') {
      const ownerCount = await this.prisma.projectMember.count({
        where: { projectId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'プロジェクトには最低1人のOWNERが必要です。先に別のメンバーをOWNERに変更してください。',
        );
      }
    }

    return this.prisma.projectMember.update({
      where: { id: target.id },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async removeMember(projectId: number, memberId: number, userId: number) {
    const caller = await this.permissionService.requireViewer(
      userId,
      projectId,
    );

    const target = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });

    if (!target) {
      throw new NotFoundException('対象のメンバーが見つかりません。');
    }

    const isSelf = target.userId === userId;
    if (caller.role !== 'OWNER' && !isSelf) {
      throw new ForbiddenException(
        '他のメンバーを除名するにはOWNER権限が必要です。',
      );
    }

    if (target.role === 'OWNER') {
      const ownerCount = await this.prisma.projectMember.count({
        where: { projectId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          '最後のOWNERは除名・退出できません。先に別のメンバーをOWNERに変更するか、プロジェクト自体を削除してください。',
        );
      }
    }

    await this.prisma.projectMember.delete({
      where: { id: target.id },
    });

    return {
      message: isSelf
        ? 'プロジェクトから退出しました。'
        : 'メンバーを除名しました。',
    };
  }
}
