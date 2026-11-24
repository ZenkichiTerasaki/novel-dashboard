import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  SESSION_COOKIE_NAME,
  parseCookieHeader,
} from './session.constants';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookies = parseCookieHeader(request.headers.cookie);
    const token = cookies[SESSION_COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException('ログインが必要です。');
    }

    const sessionUser = await this.authService.validateSessionToken(token);
    if (!sessionUser) {
      throw new UnauthorizedException(
        'セッションが無効または期限切れです。再ログインしてください。',
      );
    }

    (request as Request & { user?: typeof sessionUser }).user = sessionUser;
    return true;
  }
}
