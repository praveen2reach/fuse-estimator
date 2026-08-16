import { NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export async function GET() {
  const client = createClient();
  await client.connect();
  const hash = await bcrypt.hash("admin123", 10);
  await client.query("UPDATE users SET password_hash = $1, temp_password = true WHERE email = 'admin@fuse.app'", [hash]);
  await client.end();
  return NextResponse.json({ success: true, message: "Admin password reset to admin123" });
}