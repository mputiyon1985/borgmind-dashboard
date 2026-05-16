import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

function getClient() {
  return createClient({
    url: process.env.BORGMIND_DB_URL!,
    authToken: process.env.BORGMIND_TOKEN!,
  });
}

export async function GET() {
  const client = getClient();
  
  try {
    // Memory stats
    const memTotalResult = await client.execute("SELECT COUNT(*) as total FROM memory");
    const memTotal = Number(memTotalResult.rows[0]?.total ?? 0);

    const memTierResult = await client.execute("SELECT tier, COUNT(*) as count FROM memory GROUP BY tier");
    const tierMap: Record<string, number> = {};
    for (const row of memTierResult.rows) {
      tierMap[String(row.tier)] = Number(row.count);
    }

    const memCategoryResult = await client.execute(
      "SELECT category as name, COUNT(*) as count FROM memory GROUP BY category ORDER BY count DESC LIMIT 10"
    );
    const categories = memCategoryResult.rows.map(r => ({
      name: String(r.name),
      count: Number(r.count),
    }));

    // Souls
    const soulsResult = await client.execute(
      "SELECT soul_id, display_name, version, last_sync_at FROM souls"
    );
    const souls = soulsResult.rows.map(r => ({
      soul_id: String(r.soul_id),
      display_name: String(r.display_name),
      version: Number(r.version),
      last_sync: r.last_sync_at ? String(r.last_sync_at) : null,
    }));

    // Knowledge graph stats
    const graphTotalResult = await client.execute("SELECT COUNT(*) as total FROM knowledge_graph");
    const graphTotal = Number(graphTotalResult.rows[0]?.total ?? 0);

    const graphSubjectsResult = await client.execute(
      "SELECT subject, COUNT(*) as count FROM knowledge_graph GROUP BY subject ORDER BY count DESC LIMIT 10"
    );
    const topSubjects = graphSubjectsResult.rows.map(r => ({
      subject: String(r.subject),
      count: Number(r.count),
    }));

    // Recent activity (last 10)
    const activityResult = await client.execute(
      "SELECT soul_id, action, table_name, timestamp FROM memory_log ORDER BY timestamp DESC LIMIT 10"
    );
    const recentActivity = activityResult.rows.map(r => ({
      soul_id: String(r.soul_id),
      action: String(r.action),
      table_name: String(r.table_name),
      timestamp: String(r.timestamp),
    }));

    // Sync health
    const syncResult = await client.execute(
      "SELECT soul_id, table_name, last_sync_at, last_sync_status, consecutive_failures FROM sync_state ORDER BY soul_id, table_name"
    );
    const syncHealth = syncResult.rows.map(r => ({
      soul_id: String(r.soul_id),
      table_name: String(r.table_name),
      last_sync_at: r.last_sync_at ? String(r.last_sync_at) : null,
      status: String(r.last_sync_status ?? 'pending'),
      consecutive_failures: Number(r.consecutive_failures ?? 0),
    }));

    return NextResponse.json({
      db: {
        connected: true,
        url: process.env.BORGMIND_DB_URL,
      },
      memory: {
        total: memTotal,
        hot: tierMap['hot'] ?? 0,
        warm: tierMap['warm'] ?? 0,
        cold: tierMap['cold'] ?? 0,
        categories,
      },
      souls,
      graph: {
        total_relationships: graphTotal,
        top_subjects: topSubjects,
      },
      recent_activity: recentActivity,
      sync_health: syncHealth,
      fetched_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        db: { connected: false, url: process.env.BORGMIND_DB_URL, error: message },
        memory: { total: 0, hot: 0, warm: 0, cold: 0, categories: [] },
        souls: [],
        graph: { total_relationships: 0, top_subjects: [] },
        recent_activity: [],
        sync_health: [],
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
