import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const soul = searchParams.get('soul') || null;
  const action = searchParams.get('action') || null;
  const table = searchParams.get('table') || null;

  const client = createClient({
    url: process.env.BORGMIND_DB_URL!,
    authToken: process.env.BORGMIND_TOKEN!,
  });

  try {
    let sql = `SELECT id, soul_id, action, table_name, record_key, new_value, timestamp, synced 
               FROM memory_log`;
    const conditions = [];
    const args: any[] = [];
    
    if (soul) { conditions.push('soul_id = ?'); args.push(soul); }
    if (action) { conditions.push('action = ?'); args.push(action); }
    if (table) { conditions.push('table_name = ?'); args.push(table); }
    
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    args.push(limit);

    const result = await client.execute({ sql, args });
    
    // Get total count
    const countResult = await client.execute('SELECT COUNT(*) as total FROM memory_log');
    const total = Number(countResult.rows[0]?.total ?? 0);

    await client.close();
    
    return NextResponse.json({
      events: result.rows.map(row => ({
        id: row.id,
        soul_id: row.soul_id,
        action: row.action,
        table_name: row.table_name,
        record_key: row.record_key,
        new_value: row.new_value,
        timestamp: row.timestamp,
        synced: row.synced
      })),
      total,
      showing: result.rows.length
    });
  } catch (e: any) {
    await client.close();
    return NextResponse.json({ error: e.message, events: [], total: 0, showing: 0 }, { status: 500 });
  }
}
