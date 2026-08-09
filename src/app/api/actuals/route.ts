import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import { getSession } from "@/lib/auth";

async function ensureActualsTable() {
  const client = createClient();
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS actuals (
      id SERIAL PRIMARY KEY,
      estimate_id INTEGER,
      object_id VARCHAR(100),
      object_name VARCHAR(255),
      category VARCHAR(100),
      complexity VARCHAR(10),
      estimated_qty INTEGER DEFAULT 1,
      estimated_pd NUMERIC(10,2) DEFAULT 0,
      actual_pd NUMERIC(10,2),
      variance_pd NUMERIC(10,2),
      variance_pct NUMERIC(10,2),
      notes TEXT,
      recorded_by INTEGER,
      recorded_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.end();
}

// GET — fetch actuals, optionally filtered by estimate_id
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    await ensureActualsTable();

    const estimateId = req.nextUrl.searchParams.get("estimate_id");
    const objectId = req.nextUrl.searchParams.get("object_id");
    const client = createClient();
    await client.connect();
    let result;
    if (estimateId) {
      result = await client.query("SELECT a.*, u.name as recorded_by_name FROM actuals a LEFT JOIN users u ON a.recorded_by = u.id WHERE a.estimate_id = $1 ORDER BY a.recorded_at DESC", [Number(estimateId)]);
    } else if (objectId) {
      // Historical benchmarking — get all actuals for a specific object type
      result = await client.query("SELECT a.*, u.name as recorded_by_name FROM actuals a LEFT JOIN users u ON a.recorded_by = u.id WHERE a.object_id = $1 ORDER BY a.recorded_at DESC", [objectId]);
    } else {
      result = await client.query("SELECT a.*, u.name as recorded_by_name, e.client, e.opportunity_id FROM actuals a LEFT JOIN users u ON a.recorded_by = u.id LEFT JOIN estimates e ON a.estimate_id = e.id ORDER BY a.recorded_at DESC LIMIT 500");
    }
    await client.end();
    return NextResponse.json({ actuals: result.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — record actuals (bulk)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    await ensureActualsTable();

    const { entries } = await req.json();
    if (!entries || !entries.length) return NextResponse.json({ error: "No entries provided" }, { status: 400 });

    const client = createClient();
    await client.connect();
    for (const entry of entries) {
      const variance = entry.actual_pd - entry.estimated_pd;
      const variancePct = entry.estimated_pd > 0 ? ((variance / entry.estimated_pd) * 100) : 0;
      await client.query(
        "INSERT INTO actuals (estimate_id, object_id, object_name, category, complexity, estimated_qty, estimated_pd, actual_pd, variance_pd, variance_pct, notes, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        [entry.estimate_id, entry.object_id, entry.object_name, entry.category, entry.complexity, entry.qty, entry.estimated_pd, entry.actual_pd, variance.toFixed(2), variancePct.toFixed(2), entry.notes || "", session.id]
      );
    }
    await client.end();
    return NextResponse.json({ success: true, count: entries.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET historical benchmarks — aggregated by object_id
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    await ensureActualsTable();

    const client = createClient();
    await client.connect();
    const result = await client.query(`
      SELECT object_id, object_name, category, complexity,
        COUNT(*) as sample_count,
        ROUND(AVG(estimated_pd)::numeric, 2) as avg_estimated,
        ROUND(AVG(actual_pd)::numeric, 2) as avg_actual,
        ROUND(AVG(variance_pct)::numeric, 2) as avg_variance_pct,
        ROUND(MIN(actual_pd)::numeric, 2) as min_actual,
        ROUND(MAX(actual_pd)::numeric, 2) as max_actual
      FROM actuals
      WHERE actual_pd IS NOT NULL
      GROUP BY object_id, object_name, category, complexity
      ORDER BY sample_count DESC
    `);
    await client.end();
    return NextResponse.json({ benchmarks: result.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
