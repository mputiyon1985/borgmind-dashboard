import { NextResponse } from 'next/server';

export async function GET() {
  const pwd = process.env.DASHBOARD_PASSWORD || '';
  return NextResponse.json({
    hasPassword: !!pwd,
    passwordLength: pwd.length,
    first3: pwd.slice(0, 3),
    last3: pwd.slice(-3),
    expectedToken: 'borgmind_' + Buffer.from('TipInc2026!').toString('base64'),
    actualToken: 'borgmind_' + Buffer.from(pwd).toString('base64'),
  });
}
