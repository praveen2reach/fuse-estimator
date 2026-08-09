import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureTables } from "@/lib/db-setup.mjs";

// GET — list all estimates (team-visible)
export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const search = req.nextUrl.searchParams.get("search") || "";
    let result;
    if (search) {
      const q = `%${search}%`;
      result = await sql`
        SELECT e.*, u.name as created_by_name 
        FROM estimates e 
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.client ILIKE ${q} OR e.opportunity_id ILIKE ${q} OR e.region ILIKE ${q} OR e.module ILIKE ${q}
        ORDER BY e.updated_at DESC
      `;
    } else {
      result = await sql`
        SELECT e.*, u.name as created_by_name 
        FROM estimates e 
        LEFT JOIN users u ON e.created_by = u.id
        ORDER BY e.updated_at DESC
      `;
    }

    return NextResponse.json({ estimates: result.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create a new estimate
export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const {
      opportunity_id, client, region, module, approach, start_date, currency,
      contingency, ai_efficiency, raw_pd, net_pd, total_weeks, total_cost,
      lines, stages, roles,
    } = body;

    const result = await sql`
      INSERT INTO estimates (
        opportunity_id, client, region, module, approach, start_date, currency,
        contingency, ai_efficiency, raw_pd, net_pd, total_weeks, total_cost,
        lines_json, stages_json, roles_json, created_by
      ) VALUES (
        ${opportunity_id}, ${client}, ${region}, ${module}, ${approach}, ${start_date}, ${currency},
        ${contingency}, ${ai_efficiency}, ${raw_pd}, ${net_pd}, ${total_weeks}, ${total_cost},
        ${JSON.stringify(lines)}, ${JSON.stringify(stages)}, ${JSON.stringify(roles)}, ${session.id as number}
      )
      RETURNING id
    `;

    return NextResponse.json({ id: result.rows[0].id, success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT — update an existing estimate
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "Estimate ID required" }, { status: 400 });

    await sql`
      UPDATE estimates SET
        opportunity_id = ${data.opportunity_id}, client = ${data.client}, region = ${data.region},
        module = ${data.module}, approach = ${data.approach}, start_date = ${data.start_date},
        currency = ${data.currency}, contingency = ${data.contingency}, ai_efficiency = ${data.ai_efficiency},
        raw_pd = ${data.raw_pd}, net_pd = ${data.net_pd}, total_weeks = ${data.total_weeks},
        total_cost = ${data.total_cost},
        lines_json = ${JSON.stringify(data.lines)}, stages_json = ${JSON.stringify(data.stages)},
        roles_json = ${JSON.stringify(data.roles)},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove an estimate
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await sql`DELETE FROM estimates WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
