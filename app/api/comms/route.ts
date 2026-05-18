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
  const sender = searchParams.get('sender') || null;
  const recipient = searchParams.get('recipient') || null;
  const sender_type = searchParams.get('sender_type') || null;
  const read_status = searchParams.get('read_status') || null;
  const channel = searchParams.get('channel') || null;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const client = getClient();

  try {
    let sql = `SELECT id, sender_id, sender_type, sender_name, recipient_id, recipient_name, recipient_type, message_text, timestamp, read_status, channel, priority, message_type FROM comms`;
    const conditions: string[] = [];
    const args: any[] = [];

    if (sender) { conditions.push('sender_name = ?'); args.push(sender); }
    if (recipient) { conditions.push('recipient_name = ?'); args.push(recipient); }
    if (sender_type) { conditions.push('sender_type = ?'); args.push(sender_type); }
    if (read_status) { conditions.push('read_status = ?'); args.push(read_status); }
    if (channel) { conditions.push('channel = ?'); args.push(channel); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await client.execute({ sql, args });

    // Stats
    const countResult = await client.execute(`SELECT COUNT(*) as total FROM comms`);
    const unreadResult = await client.execute(`SELECT COUNT(*) as unread FROM comms WHERE read_status = 'unread'`);
    const bySenderResult = await client.execute(`SELECT sender_name, COUNT(*) as count FROM comms GROUP BY sender_name ORDER BY count DESC`);

    return NextResponse.json({
      messages: result.rows,
      total: Number(countResult.rows[0]?.total ?? 0),
      unread: Number(unreadResult.rows[0]?.unread ?? 0),
      by_sender: bySenderResult.rows,
      limit,
      offset
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, messages: [], total: 0, unread: 0 }, { status: 500 });
  } finally {
    await client.close();
  }
}
