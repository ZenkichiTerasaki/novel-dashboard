import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { SessionAuthGuard } from './session-auth.guard';
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  parseCookieHeader,
} from './session.constants';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private isSecureCookie(): boolean {
    const cookieSecure = this.configService.get<string>('COOKIE_SECURE');
    if (cookieSecure !== undefined) {
      return cookieSecure === 'true';
    }
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { rawToken, user } = await this.authService.login(
      dto.email,
      dto.password,
    );

    res.cookie(
      SESSION_COOKIE_NAME,
      rawToken,
      getSessionCookieOptions(this.isSecureCookie()),
    );

    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = parseCookieHeader(req.headers.cookie);
    const token = cookies[SESSION_COOKIE_NAME];

    await this.authService.logout(token);

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'ログアウトしました。' };
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
