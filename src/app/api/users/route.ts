import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const client = createClient();
  await client.connect();
  const result = await client.query("SELECT id, name, email, role, temp_password, created_at FROM users ORDER BY created_at DESC");
  await client.end();
  return NextResponse.json({ users: result.rows });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const { name, email, role = "member" } = await req.json();
    if (!name || !email) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

    const tempPwd = Math.random().toString(36).slice(2, 10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const client = createClient();
    await client.connect();
    await client.query("INSERT INTO users (name, email, password_hash, role, temp_password) VALUES ($1, $2, $3, $4, $5)", [name, email.toLowerCase(), hash, role, true]);
    await client.end();
    return NextResponse.json({ success: true, tempPassword: tempPwd });
  } catch (e: any) {
    if (e.message?.includes("unique")) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}