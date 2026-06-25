# SQLite to Supabase Migration Walkthrough

We have created the automated migration utility and configuration updates requested in your custom implementation plan.

## Changes Made

### 1. Created Migration Utility
* **File**: [migrate-to-supabase.js](server/migrate-to-supabase.js)
* **Functionality**:
  * Connections to SQLite and remote Supabase PostgreSQL.
  * Auto-generation of Postgres tables if they don't exist yet.
  * Robust PostgreSQL schema column verification (aborts if columns don't match expected schema).
  * Dry-run mode (`--dry-run`) to count records and validate connection without making database writes.
  * Reset mode (`--reset`) to wipe existing Postgres tables before running migration.
  * Full transaction-safety (automatically rolls back using `ROLLBACK` if any step fails during the migration).
  * Sequence synchronization for all primary keys so auto-increment works without duplicate key violations.
  * Complete foreign key referential integrity checks before committing the transaction.
  * Outputs detailed report to [migration-report.json](server/migration-report.json).

### 2. Updated Environment Example
* **File**: [.env.example](server/.env.example)
* **Functionality**: Added `DATABASE_URL` documentation.

---

## Step-by-Step Execution Guide

### Step 1: Add your Supabase credentials to `.env`
Open your [server/.env](darwinKPI/server/.env) and add your connection string:
```env
DATABASE_URL=postgresql://postgres:[password]@[db-host].supabase.co:5432/postgres
```

### Step 2: Run a Dry Run Validation
Execute the dry-run command to verify database connections, schema columns, and source counts:
```bash
cd server
node migrate-to-supabase.js --dry-run
```

### Step 3: Run the Migration
Once dry-run passes, execute the actual migration:
```bash
node migrate-to-supabase.js
```
*(Optionally, use `--reset` if you want to wipe any existing tables on Supabase before migrating).*

### Step 4: Verify the Results
Check the generated report in [migration-report.json](server/migration-report.json) to verify execution time, success, and count verification.
