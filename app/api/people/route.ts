import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

function getClient() {
  return createClient({
    url: process.env.BORGMIND_DB_URL!,
    authToken: process.env.BORGMIND_TOKEN!,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || null;
  const source = searchParams.get('source') || null;
  const search = searchParams.get('search') || null;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const client = getClient();

  try {
    let sql = `SELECT id, name, email, phone, role, status, created_at, last_seen, source, telegram_id, discord_id, notes FROM people`;
    const conditions: string[] = [];
    const args: any[] = [];

    if (status) { conditions.push('status = ?'); args.push(status); }
    if (source) { conditions.push('source = ?'); args.push(source); }
    if (search) { conditions.push('(name LIKE ? OR email LIKE ? OR notes LIKE ?)'); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY last_seen DESC NULLS LAST, created_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await client.execute({ sql, args });

    // Get counts by status
    const statusResult = await client.execute(`SELECT status, COUNT(*) as count FROM people GROUP BY status`);
    const sourceResult = await client.execute(`SELECT source, COUNT(*) as count FROM people GROUP BY source`);
    const countResult = await client.execute(`SELECT COUNT(*) as total FROM people`);
    const total = Number(countResult.rows[0]?.total ?? 0);

    return NextResponse.json({
      people: result.rows,
      total,
      by_status: statusResult.rows,
      by_source: sourceResult.rows,
      limit,
      offset
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, people: [], total: 0 }, { status: 500 });
  } finally {
    await client.close();
  }
}
