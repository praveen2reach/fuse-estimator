# ⚡ FUSE — Fusion Unified Smart Estimator

> From effort to execution — one intelligent workflow

Oracle Fusion HCM implementation effort estimation, project planning, and resource costing tool.

## Features

- **90+ Oracle HCM objects** across 15 categories (Core HR, Absence, Compensation, Benefits, Talent, Recruiting, Learning, Time & Labor, Payroll, UI/Config, Security, Reports, Extracts, Integrations, Data Migration)
- **Complexity classification guide** with object-specific criteria for Simple/Medium/Complex
- **Smart grouped summary** with auto-rollup by category
- **Project planner** with Gantt chart, parallel task support, business-day cascading
- **Stage-wise resource allocation** with editable weekly grid
- **Effort vs capacity validation** — flags under-resourced stages
- **Professional Excel export** (4 sheets: Summary, Detail, Plan, Costing)
- **Multi-user with database persistence** — team members see all past estimates
- **Auth with temp password flow** — admin creates users, they set their own password on first login
- **Search** across all saved estimates by client, region, module

## Tech Stack

- **Next.js 15** (App Router)
- **Vercel Postgres** (persistent storage)
- **JWT auth** (jose + bcryptjs)
- **SheetJS** (Excel export)
- **Vercel** (hosting)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/fuse-estimator.git
cd fuse-estimator
npm install
```

### 2. Create Vercel Postgres Database

1. Go to **vercel.com/dashboard** → your project → **Storage** → **Create Database** → **Postgres**
2. Vercel auto-adds `POSTGRES_URL` and related env vars
3. Pull env vars locally: `vercel env pull .env.local`

### 3. Set JWT Secret

Add to `.env.local`:
```
JWT_SECRET=your-random-secret-here
```

Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. First Login

Tables are auto-created on first API call. Default admin:
- Email: `admin@fuse.app`
- Password: `admin123`

You'll be prompted to change your password on first login.

### 6. Deploy to Vercel

```bash
git add . && git commit -m "FUSE v1.0" && git push
```

Vercel auto-deploys on push.

## Creating Team Users

1. Login as admin
2. (Future: Admin panel) — For now, use the API directly:

```bash
curl -X POST https://your-app.vercel.app/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: fuse_token=YOUR_TOKEN" \
  -d '{"name":"Praveen","email":"praveen@company.com","role":"admin"}'
```

The response includes the temporary password to share with the user.

## Project Structure

```
src/
  app/
    api/
      auth/login/    — POST login
      auth/logout/   — POST logout
      auth/session/  — GET check session
      auth/change-password/ — POST change password
      estimates/     — GET/POST/PUT/DELETE estimates
      users/         — GET list / POST create user
    login/           — Login page
    reset-password/  — Change temp password page
    page.tsx         — Main app (auth-gated)
    layout.tsx       — Root layout
  components/
    FuseEstimator.jsx — The full FUSE UI component
  lib/
    auth.ts          — JWT session helpers
    db.ts            — Postgres connection
    db-setup.mjs     — Table creation script
```
