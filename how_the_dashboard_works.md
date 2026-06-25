# How the KPI Dashboard Works

This document explains the architecture, data model, and API behavior of the KPI dashboard system (internally called **DarwinKPI**), based on the seed script and the full backend route/server source.

---

## 1. Overview

DarwinKPI is a **multi-tenant KPI/analytics dashboard**:

- **Backend:** Express.js, deployed as a Vercel serverless function (with a local-dev fallback that runs a normal `app.listen`)
- **Database:** PostgreSQL (via `pg.Pool`) — originally SQLite during early development; a compatibility shim (`createDbShim`) translates SQLite-style calls (`?` placeholders, `db.all/get/run`, `db.allAsync/getAsync/runAsync`) into Postgres `$1,$2...` queries, so the route files never had to be rewritten during the migration
- **Auth:** JWT-based, with `org_id` and `role` embedded directly in the token
- **Tenancy model:** every table (`users`, `kpis`, `performance_data`, `logs`) carries an `org_id`, and (almost) every query is scoped to `req.user.org_id`

The seed script (`seed-new-org.js`) builds a sample org, **NovaTech Solutions**, with 6 users, 12 KPIs, 24 months of generated performance data, and activity logs — for demoing/testing without real customer data.

---

## 2. Core Concepts

### Organization
The top-level tenant. Has a `name`, a unique `slug` (derived from the name, used for lookups), and a unique `invite_code` (random 8-char hex, generated via `crypto.randomBytes(4)`). Tracks `created_by`.

### Users
Belongs to exactly one org, with a `role`: **Admin**, **Analyst**, or **User**. Passwords are bcrypt-hashed (10 rounds). A user with no `org_id` is effectively locked out of all org-scoped data — most endpoints return an empty array or a 403 rather than erroring.

### KPIs
Each KPI belongs to an org: `name`, `description`, `unit`, `target`, `frequency`, and `visualization` (`Line` or `Bar`). The dashboard is **data-driven** — it reads `visualization` to decide how to chart each KPI rather than hardcoding chart types.

### Performance Data
Time-series values: one row per KPI per date/period, tied to `kpi_id`, `user_id`, and `org_id`. This is what feeds the charts and gets compared against each KPI's `target`.

### Activity Logs
A simple audit trail: `user_id`, `action` (free-text string), `timestamp`, `org_id`. Any role can write a log entry; only Admins can read them back.

---

## 3. Confirmed Role Permissions

| Action | Admin | Analyst | User |
|---|---|---|---|
| View KPIs | Yes | Yes | Yes |
| Create/Edit/Delete KPIs | Yes | Yes | No |
| View analytics (`/analytics/kpi/all`) | Yes | Yes | Yes |
| View performance data | Yes | Yes | Yes |
| Add/upsert performance data | Yes | Yes | Yes |
| Import CSV/Excel data | Yes | Yes | Yes |
| Export PDF reports | Yes | Yes | Yes |
| View users in org | Yes | Yes | Yes |
| Create/Edit/Delete users | Yes | No | No |
| View activity logs | Yes | No | No |
| Write activity log entries | Yes | Yes | Yes |
| Manage org (rename, regenerate invite, manage members/roles) | Yes | No | No |

This is enforced per-route via `authMiddleware([...roles])` — every route declares exactly which roles can hit it.

---

## 4. API Surface (confirmed from route files)

### `/api/auth`
- `POST /register` — requires email + password (8+ chars). Must supply **either** `organizationName` (creates a new org, caller becomes Admin) **or** `inviteCode` (joins an existing org, caller becomes User).
- `POST /login` — verifies bcrypt password, returns a JWT (1 hour expiry) embedding `id`, `email`, `role`, `org_id`, plus the user's org info.

### `/api/organizations`
- `GET /current` — org details + live member count.
- `POST /` — create an org (only if the caller doesn't already belong to one); caller becomes Admin.
- `POST /join` — join via invite code.
- `PUT /` — rename org (Admin only); regenerates the slug.
- `POST /regenerate-invite` — Admin only.
- `GET /members` / `DELETE /members/:userId` / `PUT /members/:userId/role` — member management, Admin only. Self-removal is explicitly blocked.
- `GET /verify-invite/:code` — **public**, no auth — used by the frontend signup form to validate an invite code before submitting registration.

### `/api/kpis`
- `GET /` — all roles; scoped to `org_id`.
- `POST /` / `PUT /:id` / `DELETE /:id` — Admin/Analyst only; every write is double-scoped (`WHERE id = ? AND org_id = ?`), so even guessing another org's KPI ID fails silently with a 404 rather than leaking or allowing cross-org edits.

### `/api/analytics/kpi/all`
- All roles. Fetches all KPIs and all performance_data for the org as two separate queries, then joins them **in JavaScript** (`.filter()` per KPI) rather than via SQL `JOIN`. This is almost certainly the exact payload shape the dashboard frontend consumes to render each KPI's chart (`data` array + `visualization` + `target`). Worth noting this scales linearly with total performance_data rows in the org per call — fine at demo scale, but will get heavier as an org accumulates years of dense data across many KPIs.

### `/api/performance-data`
- `GET /all` — all roles; full org performance feed, sorted by date.
- `GET /value?kpiId&frequency&date` — looks up the most recent value for a KPI within a given period. Period matching branches on `frequency` (daily/weekly/monthly/quarterly/yearly) using `TO_CHAR`/`EXTRACT` for Postgres-side date matching.
- `POST /upsert` — finds the existing row for that KPI+period (same period-matching logic as above) and updates it if found, inserts if not. This is how re-submitting a value for "this month" overwrites rather than duplicates.
- `POST /` — straightforward insert. (Previously validated with a loose `!value` check which incorrectly rejected a value of `0` as missing, but now patched to correctly validate via `value === undefined || value === null` checks).
- `GET /:userId` — per-user performance data, scoped to org. The file explicitly notes this parameterized route must be registered *last*, after the static `/all` and `/value` routes, or Express would try to match `"all"`/`"value"` as a `:userId` param.

### `/api/import`
- `POST /` — multipart file upload (multer, in-memory) accepting CSV or Excel. Parses rows, requires `date` and `value` columns, validates every row's date format and numeric value *before* inserting any of it, confirms the target KPI belongs to the caller's org, then inserts row-by-row (no bulk insert, since the original SQLite path didn't support it and the Postgres path kept the same loop).

### `/api/download`
- `GET /report/all` — generates a PDF (via `pdfkit`) with every KPI and all of its performance data, one section per KPI.
- `POST /report` — same, but scoped to a specific `kpiIds[]` + `userId`.
- `GET /report/:kpiId` — same, for a single KPI.
- All three produce a branded PDF (header, footer with page numbers, a simple two-column Date/Value table per KPI).
- **Security Scoping:** All three queries strictly validate `org_id = ?` using `req.user.org_id` to enforce multi-tenant isolation, preventing unauthorized cross-org data access.

### `/api/logs`
- `GET /` — Admin only; full org log feed.
- `GET /:userId` — Admin only; one user's logs, scoped to org.
- `POST /` — any role; writes a log entry. (This is what the frontend presumably calls after every significant user action — "Viewed dashboard," "Exported KPI report," "Changed chart type," etc., per the action list seen in the seed data.)

### `/api/users`
- `GET /` — all roles; lists org members (safe fields only — no password hash).
- `POST /` / `PUT /:id` / `DELETE /:id` — Admin only. Creating a user without a supplied password falls back to a shared temp password (`"TempPass123!"`) — worth flagging as something that should force a password reset on first login, since otherwise every admin-created account starts with a guessable default. Self-deletion is explicitly blocked.

---

## 5. How a Dashboard View Comes Together (confirmed flow)

1. **Login** -> JWT issued with `id`, `email`, `role`, `org_id`.
2. **Frontend calls `GET /api/analytics/kpi/all`** -> gets every KPI for the org, each with its own `data` array of performance points already attached.
3. **Render** — for each KPI, pick `Line` or `Bar` based on `visualization`, plot `data` over time, and draw the `target` as a benchmark/goal line.
4. **Role-gated UI** — write actions (create/edit KPI, manage users, manage org, view logs) only render/are available for Admin/Analyst as appropriate.
5. **Every action gets logged** via `POST /api/logs`.
6. **Reports** can be exported as PDF (`/api/download/report*`) or bulk-imported from CSV/Excel (`/api/import`).

---

## 6. Sample KPIs Seeded

- **Sales & Revenue** — Monthly Recurring Revenue, Sales Conversion Rate, Average Deal Size
- **Customer** — CSAT, Customer Churn Rate, Net Promoter Score (NPS)
- **Operations & Support** — Support Ticket Resolution Time, System Uptime
- **Marketing** — Website Traffic, Lead Generation
- **HR & People** — Employee Satisfaction Score, Employee Turnover Rate

Each has a realistic target (e.g. 99.9% System Uptime, 25% Sales Conversion Rate) used as the chart's benchmark line.

---

## 7. How Sample Data Is Generated

`generateData()` fabricates 24 months (Jan 2024-Dec 2025) per KPI with hand-tuned seasonal patterns rather than pure noise — e.g. MRR grows steadily with a Q4 bump, CSAT dips after release months, System Uptime is near-perfect except for 3 simulated incident months, Employee Turnover spikes in Q1. This makes demo dashboards look like a real, maturing company rather than random data.

---

## 8. Schema Summary

| Table | Purpose | Scoped by |
|---|---|---|
| `organizations` | Tenant record, invite code, slug | — |
| `users` | Org members, auth, role | `org_id` |
| `kpis` | KPI definitions | `org_id` |
| `performance_data` | Time-series values per KPI | `org_id`, `kpi_id` |
| `logs` | Activity/audit trail | `org_id`, `user_id` |

---

## 9. Next Improvement Steps

1. **Low priority:** Admin-created users without a supplied password get a hardcoded default (`TempPass123!`) — consider forcing a password reset on first login.

---

*This document is based on `seed-new-org.js`, `server.js` (the Express bootstrap + DB shim), and the route files: `kpi.js`, `analytics.js`, `users.js`, `performance.js`, `import.js`, `download.js`, `organizations.js`, `auth.js`, and `logs.js`.*