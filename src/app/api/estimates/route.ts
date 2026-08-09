import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import { getSession } from "@/lib/auth";
import { ensureTables } from "@/lib/db-setup.mjs";

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const search = req.nextUrl.searchParams.get("search") || "";
    const client = createClient();
    await client.connect();
    let result;
    if (search) {
      const q = `%${search}%`;
      result = await client.query("SELECT e.*, u.name as created_by_name FROM estimates e LEFT JOIN users u ON e.created_by = u.id WHERE e.client ILIKE $1 OR e.opportunity_id ILIKE $1 OR e.region ILIKE $1 OR e.module ILIKE $1 ORDER BY e.updated_at DESC", [q]);
    } else {
      result = await client.query("SELECT e.*, u.name as created_by_name FROM estimates e LEFT JOIN users u ON e.created_by = u.id ORDER BY e.updated_at DESC");
    }
    await client.end();
    return NextResponse.json({ estimates: result.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const b = await req.json();

    const client = createClient();
    await client.connect();
    const result = await client.query(
      "INSERT INTO estimates (opportunity_id, client, region, module, approach, start_date, currency, contingency, ai_efficiency, raw_pd, net_pd, total_weeks, total_cost, lines_json, stages_json, roles_json, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id",
      [b.opportunity_id, b.client, b.region, b.module, b.approach, b.start_date, b.currency, b.contingency, b.ai_efficiency, b.raw_pd, b.net_pd, b.total_weeks, b.total_cost, JSON.stringify(b.lines), JSON.stringify(b.stages), JSON.stringify(b.roles), session.id]
    );
    await client.end();
    return NextResponse.json({ id: result.rows[0].id, success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const client = createClient();
    await client.connect();
    await client.query(
      "UPDATE estimates SET opportunity_id=$1, client=$2, region=$3, module=$4, approach=$5, start_date=$6, currency=$7, contingency=$8, ai_efficiency=$9, raw_pd=$10, net_pd=$11, total_weeks=$12, total_cost=$13, lines_json=$14, stages_json=$15, roles_json=$16, updated_at=NOW() WHERE id=$17",
      [b.opportunity_id, b.client, b.region, b.module, b.approach, b.start_date, b.currency, b.contingency, b.ai_efficiency, b.raw_pd, b.net_pd, b.total_weeks, b.total_cost, JSON.stringify(b.lines), JSON.stringify(b.stages), JSON.stringify(b.roles), b.id]
    );
    await client.end();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const client = createClient();
    await client.connect();
    await client.query("DELETE FROM estimates WHERE id = $1", [Number(id)]);
    await client.end();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}