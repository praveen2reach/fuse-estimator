import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET — list all users (admin only)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await sql`SELECT id, name, email, role, temp_password, created_at FROM users ORDER BY created_at DESC`;
  return NextResponse.json({ users: result.rows });
}

// POST — create a new user with temp password (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { name, email, role = "member" } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    // Generate a random 8-char temp password
    const tempPwd = Math.random().toString(36).slice(2, 10);
    const hash = await bcrypt.hash(tempPwd, 10);

    await sql`INSERT INTO users (name, email, password_hash, role, temp_password) VALUES (${name}, ${email.toLowerCase()}, ${hash}, ${role}, true)`;

    return NextResponse.json({
      success: true,
      message: `User created. Temporary password: ${tempPwd}`,
      tempPassword: tempPwd,
    });
  } catch (e: any) {
    if (e.message?.includes("unique")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
