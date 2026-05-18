import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'borgmind_auth';
const AUTH_TOKEN_PREFIX = 'borgmind_';

// Inline auth helpers — avoid Edge Runtime issues with lib imports
function generateAuthToken(password: string): string {
  return `${AUTH_TOKEN_PREFIX}${Buffer.from(password).toString('base64')}`;
}

function verifyAuthToken(token: string | undefined, password: string): boolean {
  if (!token || !password) return false;
  const expected = generateAuthToken(password);
  return token === expected;
}

function getDashboardPassword(): string {
  return (process.env.DASHBOARD_PASSWORD || '').trim();
}

function isAuthenticated(request: NextRequest): boolean {
  const password = getDashboardPassword();
  if (!password) {
    console.warn('[Auth] DASHBOARD_PASSWORD not set — blocking all requests');
    return false;
  }

  // Check cookie
  const cookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (cookie && verifyAuthToken(cookie.value, password)) {
    return true;
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and login page
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/debug-env') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check auth
  const password = getDashboardPassword();
  
  // If no password configured, allow everything (dev convenience) but log warning
  if (!password) {
    console.warn('[Middleware] DASHBOARD_PASSWORD not set — auth disabled!');
    return NextResponse.next();
  }

  // Check if authenticated using all methods
  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login or return 401 for API
  if (pathname.startsWith('/api/')) {
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

  // UI routes: redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login).*)',
  ],
};
