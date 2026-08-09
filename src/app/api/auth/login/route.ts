import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import { setSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function ensureTables() {
  const client = createClient();
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'member', temp_password BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`);
  await client.query(`CREATE TABLE IF NOT EXISTS estimates (id SERIAL PRIMARY KEY, opportunity_id VARCHAR(100), client VARCHAR(255), region VARCHAR(50), module VARCHAR(100), approach VARCHAR(50), start_date VARCHAR(20), currency VARCHAR(10) DEFAULT 'USD', contingency NUMERIC(5,2) DEFAULT 10, ai_efficiency NUMERIC(5,2) DEFAULT 0, raw_pd NUMERIC(10,2) DEFAULT 0, net_pd NUMERIC(10,2) DEFAULT 0, total_weeks INTEGER DEFAULT 0, total_cost NUMERIC(12,2) DEFAULT 0, lines_json TEXT DEFAULT '[]', stages_json TEXT DEFAULT '[]', roles_json TEXT DEFAULT '[]', status VARCHAR(20) DEFAULT 'draft', created_by INTEGER, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  const existing = await client.query("SELECT id FROM users WHERE email = 'admin@fuse.app'");
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await client.query("INSERT INTO users (name, email, password_hash, role, temp_password) VALUES ($1, $2, $3, $4, $5)", ["Admin", "admin@fuse.app", hash, "admin", true]);
  }
  await client.end();
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    const client = createClient();
    await client.connect();
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    await client.end();
    const user = result.rows[0];

    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    await setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, tempPassword: user.temp_password });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}