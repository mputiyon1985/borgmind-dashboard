import { NextResponse } from 'next/server';
import { generateAuthToken, getDashboardPassword, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const expectedPassword = getDashboardPassword();

    if (!expectedPassword) {
      return NextResponse.json(
        { error: 'Authentication not configured — set DASHBOARD_PASSWORD' },
        { status: 503 }
      );
    }

    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate auth token
    const token = generateAuthToken(password);

    // Set cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
