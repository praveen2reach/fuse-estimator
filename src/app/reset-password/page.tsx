"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = async () => {
    setError("");
    if (newPwd.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPwd !== confirmPwd) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      router.push("/");
    } catch (e) {
      setError("Connection error");
    }
    setLoading(false);
  };

  const P = { navy: "#1e3a5f", teal: "#0e7c6b", border: "#e2e8f0" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.navy}, #2d5a8e)`, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: P.teal, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: P.navy }}>Set Your Password</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Please change your temporary password to continue.</div>
        </div>

        {error && <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 12, marginBottom: 16 }}>{error}</div>}

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
            onKeyDown={(e) => e.key === "Enter" && handleChange()}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>

        <button onClick={handleChange} disabled={loading}
          style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: P.teal, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Saving..." : "Set Password & Continue"}
        </button>
      </div>
    </div>
  );
}
