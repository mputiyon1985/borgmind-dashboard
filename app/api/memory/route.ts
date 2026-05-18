import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  if (!isAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || null;
  const search = searchParams.get('search') || null;
  const tier = searchParams.get('tier') || null;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const client = createClient({
    url: process.env.BORGMIND_DB_URL!,
    authToken: process.env.BORGMIND_TOKEN!,
  });

  try {
    let sql = `SELECT id, category, mem_key, value, written_by, confidence, source, tier, access_count, created_at, updated_at FROM memory`;
    const conditions: string[] = [];
    const args: any[] = [];

    if (category) { conditions.push('category = ?'); args.push(category); }
    if (tier) { conditions.push('tier = ?'); args.push(tier); }
    if (search) { conditions.push('(mem_key LIKE ? OR value LIKE ?)'); args.push(`%${search}%`, `%${search}%`); }
    
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await client.execute({ sql, args });
    const countResult = await client.execute('SELECT COUNT(*) as total FROM memory');
    const total = Number(countResult.rows[0]?.total ?? 0);

    // Get categories list
    const catsResult = await client.execute('SELECT category, COUNT(*) as count FROM memory GROUP BY category ORDER BY count DESC');

    await client.close();

    return NextResponse.json({
      entries: result.rows,
      total,
      categories: catsResult.rows
    });
  } catch (e: any) {
    await client.close();
    return NextResponse.json({ error: e.message, entries: [], total: 0, categories: [] }, { status: 500 });
  }
}
