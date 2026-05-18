import { NextResponse } from 'next/server';

const TURSO_URL = process.env.TURSO_URL || process.env.BORGMIND_DB_URL?.replace('libsql://', 'https://') || '';
const TURSO_TOKEN = process.env.TURSO_TOKEN || process.env.BORGMIND_TOKEN || '';

function getCellValue(cell: any): string {
  if (!cell) return '';
  if (typeof cell === 'object' && 'value' in cell) {
    return String(cell.value);
  }
  return String(cell);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Ensure URL has protocol
    let url = TURSO_URL;
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    let sql = `
      SELECT 
        id,
        written_by,
        mem_key,
        value,
        created_at
      FROM memory 
      WHERE category = 'comms'
    `;
    
    const args: any[] = [];
    
    if (agent) {
      sql += ` AND (written_by = ? OR mem_key LIKE ?)`;
      args.push(agent, `%${agent}%`);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    args.push(limit);

    const response = await fetch(`${url}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql,
              args: args.map(arg => ({
                type: typeof arg === 'number' ? 'integer' : 'text',
                value: String(arg)
              }))
            }
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Turso API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse Turso response structure
    let rows: any[] = [];
    if (data.results && data.results[0] && data.results[0].response && data.results[0].response.result) {
      rows = data.results[0].response.result.rows || [];
    }
    
    const messages = rows.map((row: any) => {
      // Parse value column which contains JSON payload
      let payload: any = {};
      try {
        const valueStr = getCellValue(row[3]);
        payload = JSON.parse(valueStr);
      } catch (e) {
        payload = { text: getCellValue(row[3]) };
      }
      
      // Extract message text from nested payload structure
      // BorgComms stores: { payload: { text: "..." }, sender: "...", recipient: "..." }
      let messageText = '';
      if (payload.payload && payload.payload.text) {
        messageText = payload.payload.text;
      } else if (payload.text) {
        messageText = payload.text;
      } else if (payload.message) {
        messageText = payload.message;
      } else {
        messageText = JSON.stringify(payload);
      }
      
      return {
        id: getCellValue(row[0]),
        sender: payload.sender || getCellValue(row[1]),
        recipient: payload.recipient || payload.to || getCellValue(row[2]),
        msg_type: payload.msg_type || payload.type || 'chat',
        priority: payload.priority || 2,
        text: messageText,
        payload,
        timestamp: getCellValue(row[4]),
        read_by: payload.read_by || []
      };
    });

    return NextResponse.json({
      messages,
      count: messages.length,
      agent: agent || 'all'
    });
  } catch (error: any) {
    console.error('Comms API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages: ' + (error.message || 'Unknown error'), messages: [] },
      { status: 500 }
    );
  }
}
