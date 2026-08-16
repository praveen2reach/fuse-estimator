"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setSent(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const P = { navy: "#1e3a5f", teal: "#0e7c6b", border: "#e2e8f0" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.navy}, #2d5a8e)`, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: P.teal, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: P.navy }}>Forgot Password?</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
            {sent ? "Check your email for the reset link." : "Enter your email and we'll send you a link to reset your password."}
          </div>
        </div>

        {error && <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 12, marginBottom: 16 }}>{error}</div>}
        {message && <div style={{ padding: "10px 14px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, color: "#059669", fontSize: 12, marginBottom: 16 }}>{message}</div>}

        {!sent ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <button onClick={handleSubmit} disabled={loading || !email}
              style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: P.teal, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading || !email ? 0.6 : 1 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📧</div>
            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
              We've sent a password reset link to <strong>{email}</strong>. The link expires in 1 hour.
            </div>
            <button onClick={() => { setSent(false); setMessage(""); setEmail(""); }}
              style={{ marginTop: 16, padding: "8px 20px", borderRadius: 6, border: `1px solid ${P.border}`, background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Didn't receive it? Try again
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => router.push("/login")}
            style={{ background: "none", border: "none", color: P.teal, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
