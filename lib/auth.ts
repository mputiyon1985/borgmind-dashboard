import { NextResponse } from 'next/server';

// Simple env-based auth for BorgMind Dashboard
// No complex auth system — single password via DASHBOARD_PASSWORD env var

export const AUTH_COOKIE_NAME = 'borgmind_auth';
export const AUTH_TOKEN_PREFIX = 'borgmind_';

export function generateAuthToken(password: string): string {
  // Simple hash: borgmind_<sha256-like-hash> — in production this would be crypto
  // For our needs, a consistent token derived from password is sufficient
  return `${AUTH_TOKEN_PREFIX}${Buffer.from(password).toString('base64')}`;
}

export function verifyAuthToken(token: string | undefined, password: string): boolean {
  if (!token || !password) return false;
  const expected = generateAuthToken(password);
  return token === expected;
}

export function getDashboardPassword(): string {
  return process.env.DASHBOARD_PASSWORD || '';
}

export function isAuthenticated(request: Request): boolean {
  const password = getDashboardPassword();
  if (!password) {
    // If no password configured, deny all (safe default)
    console.warn('[Auth] DASHBOARD_PASSWORD not set — blocking all requests');
    return false;
  }

  // Check cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const token = cookies[AUTH_COOKIE_NAME];
    if (verifyAuthToken(token, password)) {
      return true;
    }
  }

  // Check Authorization header (Bearer token for API access)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    if (verifyAuthToken(bearerToken, password)) {
      return true;
    }
  }

  // Check query param (for testing / curl)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('auth');
  if (queryToken && verifyAuthToken(queryToken, password)) {
    return true;
  }

  return false;
}

export function unauthorizedResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: 'Unauthorized — provide valid Bearer token or auth cookie' }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer'
      }
    }
  );
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) cookies[name] = rest.join('=');
  });
  return cookies;
}
