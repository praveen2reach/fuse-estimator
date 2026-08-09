import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const hash = await bcrypt.hash(newPassword, 10);
    const client = createClient();
    await client.connect();
    await client.query("UPDATE users SET password_hash = $1, temp_password = false WHERE id = $2", [hash, session.id]);
    await client.end();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}