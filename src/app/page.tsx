"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FuseEstimator from "@/components/FuseEstimator";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) { router.push("/login"); return; }
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontFamily: "'Inter',system-ui,sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, background: "#0e7c6b", borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e3a5f" }}>Loading FUSE...</div>
        </div>
      </div>
    );
  }

  return <FuseEstimator user={user} onLogout={handleLogout} />;
}
