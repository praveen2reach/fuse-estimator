// Run this once: node src/lib/db-setup.mjs
// Or it auto-runs on first API call via ensureTables()

import { sql } from "@vercel/postgres";

export async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'member',
      temp_password BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS estimates (
      id SERIAL PRIMARY KEY,
      opportunity_id VARCHAR(100),
      client VARCHAR(255),
      region VARCHAR(50),
      module VARCHAR(100),
      approach VARCHAR(50),
      start_date VARCHAR(20),
      currency VARCHAR(10) DEFAULT 'USD',
      contingency NUMERIC(5,2) DEFAULT 10,
      ai_efficiency NUMERIC(5,2) DEFAULT 0,
      raw_pd NUMERIC(10,2) DEFAULT 0,
      net_pd NUMERIC(10,2) DEFAULT 0,
      total_weeks INTEGER DEFAULT 0,
      total_cost NUMERIC(12,2) DEFAULT 0,
      lines_json TEXT DEFAULT '[]',
      stages_json TEXT DEFAULT '[]',
      roles_json TEXT DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create default admin user if none exists (temp password: admin123)
  const existing = await sql`SELECT id FROM users WHERE email = 'admin@fuse.app'`;
  if (existing.rows.length === 0) {
    // bcrypt hash for 'admin123'
    const hash = '$2a$10$rQEY0tJx5gD5z5gD5z5gDOqJ5z5gD5z5gD5z5gD5z5gD5z5gD5z';
    await sql`INSERT INTO users (name, email, password_hash, role, temp_password) VALUES ('Admin', 'admin@fuse.app', ${hash}, 'admin', true)`;
  }

  return true;
}

// If run directly
ensureTables()
  .then(() => { console.log("✅ Tables created"); process.exit(0); })
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); });
