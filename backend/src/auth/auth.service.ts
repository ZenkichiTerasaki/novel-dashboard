import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import {
  SESSION_TTL_MS,
  generateSessionToken,
  hashSessionToken,
} from './session.constants';

export interface AuthenticatedUser {
  id: number;
  userId: number;
  name: string;
  email: string;
  sessionId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません。',
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません。',
      );
    }

    const now = new Date();
    // 期限切れの古いセッションをクリーンアップ
    await this.prisma.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: now },
      },
    });

    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    await this.prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      rawToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async validateSessionToken(token: string): Promise<AuthenticatedUser | null> {
    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
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

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.session
        .delete({ where: { id: session.id } })
        .catch(() => {});
      return null;
    }

    return {
      id: session.user.id,
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      sessionId: session.id,
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const tokenHash = hashSessionToken(token);
    await this.prisma.session.deleteMany({
      where: { tokenHash },
    });
  }
}
