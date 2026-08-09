"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      if (data.tempPassword) {
        router.push("/reset-password");
      } else {
        router.push("/");
      }
    } catch (e) {
      setError("Connection error");
    }
    setLoading(false);
  };

  const P = { navy: "#1e3a5f", teal: "#0e7c6b", bg: "#f1f5f9", border: "#e2e8f0" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.navy}, #2d5a8e)`, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, background: P.teal, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: P.navy }}>FUSE</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Fusion Unified Smart Estimator</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontStyle: "italic" }}>From effort to execution — one intelligent workflow</div>
        </div>

        {error && <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 12, marginBottom: 16 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: P.teal, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.15s" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#94a3b8" }}>
          First time? Use the temporary password sent by your admin.
        </div>
      </div>
    </div>
  );
}
