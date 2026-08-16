import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) return NextResponse.json({ error: "Token and new password required" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const client = createClient();
    await client.connect();

    // Find valid, unexpired, unused token
    const tokenResult = await client.query(
      "SELECT * FROM reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()",
      [token]
    );

    if (tokenResult.rows.length === 0) {
      await client.end();
      return NextResponse.json({ error: "Invalid or expired reset link. Please request a new one." }, { status: 400 });
    }

    const resetToken = tokenResult.rows[0];

    // Update password
    const hash = await bcrypt.hash(newPassword, 10);
    await client.query("UPDATE users SET password_hash = $1, temp_password = false WHERE id = $2", [hash, resetToken.user_id]);

    // Mark token as used
    await client.query("UPDATE reset_tokens SET used = true WHERE id = $1", [resetToken.id]);

    await client.end();
    return NextResponse.json({ success: true, message: "Password has been reset successfully." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
