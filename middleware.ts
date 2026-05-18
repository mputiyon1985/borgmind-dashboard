import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, AUTH_COOKIE_NAME, generateAuthToken, getDashboardPassword } from './lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and login page
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/login') ||
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

  // Check if authenticated
  const cookie = request.cookies.get(AUTH_COOKIE_NAME);
  const token = cookie?.value;
  const expectedToken = generateAuthToken(password);

  if (token === expectedToken) {
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
