import { createHash, randomBytes } from 'crypto';
import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'novel_dashboard_sid';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = part.slice(0, eqIndex).trim();
    const rawValue = part.slice(eqIndex + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }

  return cookies;
}

export function getSessionCookieOptions(isSecure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}
