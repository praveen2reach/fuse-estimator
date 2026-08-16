import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const client = createClient();
    await client.connect();

    // Ensure reset_tokens table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Check if user exists
    const userResult = await client.query("SELECT id, name, email FROM users WHERE email = $1", [email.toLowerCase()]);
    if (userResult.rows.length === 0) {
      await client.end();
      // Don't reveal if email exists or not (security best practice)
      return NextResponse.json({ success: true, message: "If this email is registered, a reset link has been sent." });
    }

    const user = userResult.rows[0];

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store the token
    await client.query(
      "INSERT INTO reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt.toISOString()]
    );
    await client.end();

    // Send email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fuse-estimator.vercel.app";
    const resetLink = `${appUrl}/reset-password-token?token=${token}`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "FUSE <onboarding@resend.dev>",
          to: [user.email],
          subject: "FUSE — Password Reset Request",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 50px; height: 50px; background: #0e7c6b; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; color: white; font-weight: 800;">⚡</div>
                <h2 style="color: #1e3a5f; margin: 10px 0 5px;">FUSE</h2>
                <p style="color: #64748b; font-size: 12px; margin: 0;">Fusion Unified Smart Estimator</p>
              </div>
              
              <p style="color: #1e293b; font-size: 14px;">Hi ${user.name},</p>
              <p style="color: #1e293b; font-size: 14px;">We received a request to reset your FUSE password. Click the button below to set a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: #0e7c6b; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">Reset My Password</a>
              </div>
              
              <p style="color: #64748b; font-size: 12px;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
              <p style="color: #94a3b8; font-size: 11px; text-align: center;">FUSE — From effort to execution, one intelligent workflow</p>
            </div>
          `,
        }),
      });
    } else {
      // No Resend key configured — log the link for development
      console.log(`[FUSE] Password reset link for ${user.email}: ${resetLink}`);
    }

    return NextResponse.json({ success: true, message: "If this email is registered, a reset link has been sent." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
