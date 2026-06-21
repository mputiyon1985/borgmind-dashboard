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
    // Old comms table
    let sqlOld = `SELECT id, sender_id, sender_type, sender_name, recipient_id, recipient_name, recipient_type, message_text, timestamp, read_status, channel, priority, message_type FROM comms`;
    const conditionsOld: string[] = [];
    const argsOld: any[] = [];

    if (sender) { conditionsOld.push('sender_name = ?'); argsOld.push(sender); }
    if (recipient) { conditionsOld.push('recipient_name = ?'); argsOld.push(recipient); }
    if (sender_type) { conditionsOld.push('sender_type = ?'); argsOld.push(sender_type); }
    if (read_status) { conditionsOld.push('read_status = ?'); argsOld.push(read_status); }
    if (channel) { conditionsOld.push('channel = ?'); argsOld.push(channel); }

    if (conditionsOld.length > 0) sqlOld += ' WHERE ' + conditionsOld.join(' AND ');
    sqlOld += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    argsOld.push(limit * 2, offset); // fetch more to merge

    const resultOld = await client.execute({ sql: sqlOld, args: argsOld });

    // New memory-based comms (from borgmind.send)
    let sqlNew = `SELECT id, mem_key, value, created_at FROM memory WHERE category = 'comms'`;
    const conditionsNew: string[] = [];
    const argsNew: any[] = [];

    if (sender) { conditionsNew.push("json_extract(value, '$.from') = ?"); argsNew.push(sender); }
    if (recipient) { conditionsNew.push("json_extract(value, '$.to') = ?"); argsNew.push(recipient); }

    if (conditionsNew.length > 0) sqlNew += ' AND ' + conditionsNew.join(' AND ');
    sqlNew += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    argsNew.push(limit * 2, offset);

    let resultNew;
    try {
      resultNew = await client.execute({ sql: sqlNew, args: argsNew });
    } catch {
      resultNew = { rows: [] };
    }

    // Transform memory-based comms to match old schema
    const memoryMessages = resultNew.rows.map((r: any) => {
      const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      const key = r.mem_key || '';
      const ts = new Date(val.timestamp || r.created_at).toISOString();
      return {
        id: r.id,
        sender_id: null,
        sender_type: 'agent',
        sender_name: val.from || 'unknown',
        recipient_id: null,
        recipient_name: val.to || 'broadcast',
        recipient_type: val.to === 'broadcast' ? 'broadcast' : 'agent',
        message_text: val.message || '',
        timestamp: ts,
        read_status: 'unread',
        channel: 'borgmind',
        priority: 1,
        message_type: 'chat'
      };
    });

    // Merge and sort by timestamp descending
    const allMessages = [...(resultOld.rows as any[]), ...memoryMessages]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);

    // Stats
    const countResult = await client.execute(`SELECT COUNT(*) as total FROM comms`);
    const countMemory = await client.execute(`SELECT COUNT(*) as total FROM memory WHERE category = 'comms'`);
    const totalAll = Number(countResult.rows[0]?.total ?? 0) + Number(countMemory.rows[0]?.total ?? 0);

    return NextResponse.json({
      messages: allMessages,
      total: totalAll,
      unread: totalAll, // memory msgs are always unread
      by_sender: [],
      limit,
      offset
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, messages: [], total: 0, unread: 0 }, { status: 500 });
  } finally {
    await client.close();
  }
}
