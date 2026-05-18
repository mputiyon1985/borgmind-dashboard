import { NextResponse } from 'next/server';

export async function GET() {
  const pwd = process.env.DASHBOARD_PASSWORD || '';
  return NextResponse.json({
    hasPassword: !!pwd,
    passwordLength: pwd.length,
    pwdBase64: Buffer.from(pwd).toString('base64'),
    expectedBase64: Buffer.from('TipInc2026!').toString('base64'),
    match: pwd === 'TipInc2026!',
  });
}
