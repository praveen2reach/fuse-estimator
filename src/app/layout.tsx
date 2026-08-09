import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUSE — Fusion Unified Smart Estimator",
  description: "From effort to execution — one intelligent workflow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
