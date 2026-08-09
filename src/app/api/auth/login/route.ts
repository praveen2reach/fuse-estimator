import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import { setSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { ensureTables } from "@/lib/db-setup.mjs";

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