import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectPermissionService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async requireViewer(
    userId: number,
    projectId: number,
  ) {
    const member =
      await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
      });

    if (!member) {
      throw new ForbiddenException(
        'このプロジェクトへのアクセス権限がありません。',
      );
    }

    return member;
  }

  async requireEditor(
    userId: number,
    projectId: number,
  ) {
    const member =
      await this.requireViewer(
        userId,
        projectId,
      );

    if (
      member.role !== 'OWNER' &&
      member.role !== 'EDITOR'
    ) {
      throw new ForbiddenException(
        'このプロジェクトを編集する権限がありません。',
      );
    }

    return member;
  }

  async requireOwner(
    userId: number,
    projectId: number,
  ) {
    const member =
      await this.requireViewer(
        userId,
        projectId,
      );

    if (member.role !== 'OWNER') {
      throw new ForbiddenException(
        'この操作にはOWNER権限が必要です。',
      );
    }

    return member;
  }
}