"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResetForm() {
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleReset = async () => {
    setError("");
    if (!token) { setError("Invalid reset link. Please request a new one."); return; }
    if (newPwd.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPwd !== confirmPwd) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: newPwd }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const P = { navy: "#1e3a5f", teal: "#0e7c6b", border: "#e2e8f0" };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.navy}, #2d5a8e)`, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: P.navy }}>Invalid Reset Link</div>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>This link is invalid or has expired.</p>
          <button onClick={() => router.push("/forgot-password")}
            style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, border: "none", background: P.teal, color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.navy}, #2d5a8e)`, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: P.teal, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: P.navy }}>
            {success ? "Password Reset!" : "Set New Password"}
          </div>
        </div>

        {error && <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 12, marginBottom: 16 }}>{error}</div>}

        {success ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <p style={{ color: "#1e293b", fontSize: 14 }}>Your password has been reset successfully.</p>
            <button onClick={() => router.push("/login")}
              style={{ marginTop: 20, width: "100%", padding: "12px", borderRadius: 8, border: "none", background: P.teal, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Sign In with New Password
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>New Password</label>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 6 characters"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Confirm Password</label>
              <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter password"
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <button onClick={handleReset} disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: P.teal, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordTokenPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ResetForm />
    </Suspense>
  );
}
