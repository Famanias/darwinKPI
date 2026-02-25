/**
 * Seed script — NovaTech Solutions
 * Creates a brand-new organization with sample users, KPIs, performance data, and activity logs.
 *
 * Run with:  node seed-new-org.js
 * Optional:  node seed-new-org.js --reset    (wipe the org's data and re-seed)
 */

require("dotenv").config();
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");

// ─── Configuration ─────────────────────────────────────────────────────────────

const ORG = {
  name: "NovaTech Solutions",
  slug: "novatech-solutions",
  invite_code: "NOVA2025",
};

const USERS = [
  {
    name: "Alice Reyes",
    email: "alice.reyes@novatech.com",
    password: "Admin@1234",
    role: "Admin",
  },
  {
    name: "Brian Santos",
    email: "brian.santos@novatech.com",
    password: "Analyst@1234",
    role: "Analyst",
  },
  {
    name: "Carla Mendoza",
    email: "carla.mendoza@novatech.com",
    password: "Analyst@1234",
    role: "Analyst",
  },
  {
    name: "David Lim",
    email: "david.lim@novatech.com",
    password: "User@12345",
    role: "User",
  },
  {
    name: "Ella Cruz",
    email: "ella.cruz@novatech.com",
    password: "User@12345",
    role: "User",
  },
  {
    name: "Felix Torres",
    email: "felix.torres@novatech.com",
    password: "User@12345",
    role: "User",
  },
];

const KPIS = [
  // ── Sales & Revenue ──
  {
    name: "Monthly Recurring Revenue",
    description: "Total predictable revenue generated each month from active subscriptions",
    unit: "USD",
    target: 250000,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "Sales Conversion Rate",
    description: "Percentage of leads that convert into paying customers",
    unit: "%",
    target: 25,
    frequency: "Monthly",
    visualization: "Bar",
  },
  {
    name: "Average Deal Size",
    description: "Average revenue value per closed deal",
    unit: "USD",
    target: 8500,
    frequency: "Monthly",
    visualization: "Bar",
  },
  // ── Customer ──
  {
    name: "Customer Satisfaction Score (CSAT)",
    description: "Percentage of customers who rate their experience as satisfied or very satisfied",
    unit: "%",
    target: 90,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "Customer Churn Rate",
    description: "Percentage of customers who cancel or do not renew subscriptions each month",
    unit: "%",
    target: 3,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "Net Promoter Score (NPS)",
    description: "Likelihood of customers recommending NovaTech to others (scale 0–100)",
    unit: "Score",
    target: 60,
    frequency: "Monthly",
    visualization: "Bar",
  },
  // ── Operations & Support ──
  {
    name: "Support Ticket Resolution Time",
    description: "Average hours to fully resolve a customer support ticket",
    unit: "Hours",
    target: 6,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "System Uptime",
    description: "Percentage of time production systems are fully operational",
    unit: "%",
    target: 99.9,
    frequency: "Monthly",
    visualization: "Line",
  },
  // ── Marketing ──
  {
    name: "Website Traffic",
    description: "Total unique visitors to the NovaTech website per month",
    unit: "Visitors",
    target: 40000,
    frequency: "Monthly",
    visualization: "Bar",
  },
  {
    name: "Lead Generation",
    description: "Number of qualified leads generated per month through all channels",
    unit: "Leads",
    target: 300,
    frequency: "Monthly",
    visualization: "Bar",
  },
  // ── HR & People ──
  {
    name: "Employee Satisfaction Score",
    description: "Average employee satisfaction rating from quarterly pulse surveys (out of 100)",
    unit: "%",
    target: 80,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "Employee Turnover Rate",
    description: "Percentage of employees who leave the company per month",
    unit: "%",
    target: 4,
    frequency: "Monthly",
    visualization: "Bar",
  },
];

// ─── Realistic Data Generators ─────────────────────────────────────────────────

/**
 * Generate 24 months of realistic performance data (Jan 2024 – Dec 2025)
 */
function generateData(kpiName, target) {
  const dates = [];
  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      dates.push(`${y}-${String(m).padStart(2, "0")}-01`);
    }
  }

  const rng = (min, max) => Math.random() * (max - min) + min;
  const snap = (v, decimals = 1) =>
    Math.round(v * 10 ** decimals) / 10 ** decimals;

  switch (kpiName) {
    case "Monthly Recurring Revenue":
      // Steady growth with a Q4 bump each year
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 160000 + i * 4000;
        if (month >= 10) base += 15000; // Q4 push
        const value = snap(base + rng(-8000, 8000), 0);
        return { date, value: Math.max(0, value) };
      });

    case "Sales Conversion Rate":
      // Starts low, improves over time, dips in summer
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 15 + i * 0.4;
        if (month >= 6 && month <= 8) base -= 3; // Summer dip
        const value = snap(base + rng(-2, 2));
        return { date, value: Math.min(40, Math.max(10, value)) };
      });

    case "Average Deal Size":
      // Gradual upward trend, end-of-year deals are bigger
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 6500 + i * 80;
        if (month === 11 || month === 12) base += 1200; // Year-end enterprise deals
        const value = snap(base + rng(-500, 500), 0);
        return { date, value: Math.max(4000, value) };
      });

    case "Customer Satisfaction Score (CSAT)":
      // High but varies; dips after product releases, recovers
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 84 + i * 0.15;
        if (month === 3 || month === 9) base -= 4; // Post-release issues
        if (month === 5 || month === 11) base += 2; // After support improvements
        const value = snap(base + rng(-2, 2));
        return { date, value: Math.min(99, Math.max(70, value)) };
      });

    case "Customer Churn Rate":
      // Goal is low; higher in Q1 (budget cuts), improving over time
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 5.5 - i * 0.06;
        if (month === 1 || month === 2) base += 1.5;
        const value = snap(base + rng(-0.5, 0.5));
        return { date, value: Math.max(0.5, value) };
      });

    case "Net Promoter Score (NPS)":
      // Grows as product matures; dips after major incidents
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 42 + i * 0.7;
        if (month === 4 || month === 10) base -= 5;
        const value = snap(base + rng(-3, 3), 0);
        return { date, value: Math.min(90, Math.max(20, value)) };
      });

    case "Support Ticket Resolution Time":
      // Lower is better; improves with team growth, peaks during incidents
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 16 - i * 0.35;
        if (month === 3 || month === 9) base += 4; // Release-related spike
        const value = snap(base + rng(-1.5, 1.5));
        return { date, value: Math.max(1.5, value) };
      });

    case "System Uptime":
      // Almost always near 99.9%, rare incidents bring it down
      return dates.map((date, i) => {
        const isIncidentMonth = [2, 10, 19].includes(i); // Feb 2024, Oct 2024, Jul 2025
        const value = isIncidentMonth
          ? snap(rng(97.5, 99.0))
          : snap(rng(99.7, 99.99));
        return { date, value };
      });

    case "Website Traffic":
      // Grows over time; spikes in Q4 (product launches), dips in August
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 22000 + i * 750;
        if (month === 8) base -= 5000;
        if (month === 10 || month === 11) base += 8000;
        const value = snap(base + rng(-2000, 2000), 0);
        return { date, value: Math.max(5000, value) };
      });

    case "Lead Generation":
      // Grows month over month; lower during holidays
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 170 + i * 5.5;
        if (month === 12 || month === 1) base -= 40;
        if (month === 9 || month === 10) base += 30; // Fall conference season
        const value = snap(base + rng(-20, 20), 0);
        return { date, value: Math.max(50, value) };
      });

    case "Employee Satisfaction Score":
      // Peaks mid-year (post-raise), dips during heavy release cycles
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 72 + i * 0.2;
        if (month === 6 || month === 7) base += 5;
        if (month === 3 || month === 11) base -= 3;
        const value = snap(base + rng(-3, 3));
        return { date, value: Math.min(100, Math.max(55, value)) };
      });

    case "Employee Turnover Rate":
      // Higher in Q1 (year-start attrition); decreases as culture improves
      return dates.map((date, i) => {
        const month = (i % 12) + 1;
        let base = 6.5 - i * 0.07;
        if (month === 1 || month === 2) base += 2;
        if (month === 7) base += 1;
        const value = snap(base + rng(-0.5, 0.5));
        return { date, value: Math.max(0.5, value) };
      });

    default: {
      const base = target * 0.8;
      return dates.map((date, i) => {
        const value = base + i * (target * 0.008) + rng(-target * 0.05, target * 0.05);
        return { date, value: snap(value) };
      });
    }
  }
}

// ─── Log Actions ───────────────────────────────────────────────────────────────

const LOG_ACTIONS = [
  "Logged in",
  "Viewed dashboard",
  "Viewed analytics",
  "Exported KPI report",
  "Imported performance data",
  "Updated KPI target",
  "Created KPI",
  "Viewed user management",
  "Updated organization settings",
  "Downloaded PDF report",
  "Filtered analytics by date range",
  "Changed chart type to Bar",
  "Changed chart type to Line",
];

function randomLogsForUser(userId, orgId, count = 15) {
  const logs = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const offsetMs = Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000); // up to 60 days ago
    const timestamp = new Date(now - offsetMs).toISOString();
    const action = LOG_ACTIONS[Math.floor(Math.random() * LOG_ACTIONS.length)];
    logs.push({ userId, orgId, action, timestamp });
  }
  return logs;
}

// ─── Main Seeder ───────────────────────────────────────────────────────────────

const RESET = process.argv.includes("--reset");
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/darwinkpi.db`
  : "./darwinkpi.db";

async function seed() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error("❌ Failed to connect to database:", err.message);
      process.exit(1);
    }
    console.log(`✔  Connected to SQLite at: ${DB_PATH}\n`);
  });

  const run = promisify(db.run.bind(db));
  const get = promisify(db.get.bind(db));
  const all = promisify(db.all.bind(db));

  try {
    // ── Step 1: Ensure schema tables exist (mirrors index.js) ─────────────────
    console.log("── Ensuring schema exists ──────────────────────────────────");

    await run(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'User',
        status TEXT DEFAULT 'Active',
        org_id INTEGER REFERENCES organizations(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS kpis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        unit TEXT,
        target REAL,
        frequency TEXT,
        visualization TEXT,
        org_id INTEGER REFERENCES organizations(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS performance_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kpi_id INTEGER REFERENCES kpis(id),
        date DATETIME,
        value REAL,
        user_id INTEGER REFERENCES users(id),
        org_id INTEGER REFERENCES organizations(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        org_id INTEGER REFERENCES organizations(id)
      )
    `);
    console.log("   ✓ Schema ready\n");

    // ── Step 2: Organization ──────────────────────────────────────────────────
    console.log("── Organization ─────────────────────────────────────────────");

    let org = await get("SELECT * FROM organizations WHERE slug = ?", [ORG.slug]);

    if (org && RESET) {
      console.log(`   Resetting data for: ${org.name} (ID: ${org.id})`);
      await run("DELETE FROM logs WHERE org_id = ?", [org.id]);
      await run("DELETE FROM performance_data WHERE org_id = ?", [org.id]);
      await run("DELETE FROM kpis WHERE org_id = ?", [org.id]);
      await run("DELETE FROM users WHERE org_id = ?", [org.id]);
      await run("DELETE FROM organizations WHERE id = ?", [org.id]);
      org = null;
      console.log("   ✓ Reset complete\n");
    }

    if (org) {
      console.log(`   Organization already exists: ${org.name} (ID: ${org.id})`);
      console.log("   Re-run with --reset to wipe and re-seed.\n");
      db.close();
      return;
    }

    await run(
      "INSERT INTO organizations (name, slug, invite_code) VALUES (?, ?, ?)",
      [ORG.name, ORG.slug, ORG.invite_code]
    );
    org = await get("SELECT * FROM organizations WHERE slug = ?", [ORG.slug]);
    console.log(`   ✓ Created organization: ${org.name} (ID: ${org.id})`);
    console.log(`   ✓ Invite code: ${org.invite_code}\n`);

    const ORG_ID = org.id;

    // ── Step 3: Users ─────────────────────────────────────────────────────────
    console.log("── Users ────────────────────────────────────────────────────");

    const createdUsers = [];
    for (const u of USERS) {
      const hashed = await bcryptjs.hash(u.password, 10);
      await run(
        "INSERT INTO users (name, email, password, role, status, org_id) VALUES (?, ?, ?, ?, ?, ?)",
        [u.name, u.email, hashed, u.role, "Active", ORG_ID]
      );
      const row = await get("SELECT * FROM users WHERE email = ?", [u.email]);
      createdUsers.push(row);
      console.log(`   ✓ ${u.role.padEnd(8)} — ${u.name} <${u.email}>  (pw: ${u.password})`);
    }

    // Update org created_by to admin
    const adminUser = createdUsers.find((u) => u.role === "Admin");
    await run("UPDATE organizations SET created_by = ? WHERE id = ?", [
      adminUser.id,
      ORG_ID,
    ]);
    console.log();

    // ── Step 4: KPIs ─────────────────────────────────────────────────────────
    console.log("── KPIs ─────────────────────────────────────────────────────");

    for (const kpi of KPIS) {
      await run(
        `INSERT INTO kpis (name, description, unit, target, frequency, visualization, org_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [kpi.name, kpi.description, kpi.unit, kpi.target, kpi.frequency, kpi.visualization, ORG_ID]
      );
      console.log(`   ✓ ${kpi.name}  [target: ${kpi.target} ${kpi.unit}]`);
    }

    const insertedKpis = await all("SELECT * FROM kpis WHERE org_id = ?", [ORG_ID]);
    console.log();

    // ── Step 5: Performance Data ──────────────────────────────────────────────
    console.log("── Performance Data (Jan 2024 – Dec 2025) ───────────────────");

    let totalRecords = 0;
    const analystUser = createdUsers.find((u) => u.role === "Analyst") || adminUser;

    for (const kpi of insertedKpis) {
      const dataPoints = generateData(kpi.name, kpi.target);
      for (const dp of dataPoints) {
        await run(
          "INSERT INTO performance_data (kpi_id, date, value, org_id, user_id) VALUES (?, ?, ?, ?, ?)",
          [kpi.id, dp.date, dp.value, ORG_ID, analystUser.id]
        );
      }
      totalRecords += dataPoints.length;
      console.log(`   ✓ ${dataPoints.length} records — ${kpi.name}`);
    }
    console.log();

    // ── Step 6: Activity Logs ─────────────────────────────────────────────────
    console.log("── Activity Logs ────────────────────────────────────────────");

    let totalLogs = 0;
    for (const user of createdUsers) {
      const logCount = user.role === "Admin" ? 25 : user.role === "Analyst" ? 20 : 12;
      const logs = randomLogsForUser(user.id, ORG_ID, logCount);
      for (const log of logs) {
        await run(
          "INSERT INTO logs (user_id, action, timestamp, org_id) VALUES (?, ?, ?, ?)",
          [log.userId, log.action, log.timestamp, log.orgId]
        );
      }
      totalLogs += logs.length;
      console.log(`   ✓ ${logCount} log entries — ${user.name}`);
    }
    console.log();

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log("════════════════════════════════════════════════════════════");
    console.log("  ✅  Seed complete — NovaTech Solutions");
    console.log("════════════════════════════════════════════════════════════");
    console.log(`  Organization  : ${org.name}  (ID: ${ORG_ID})`);
    console.log(`  Invite Code   : ${org.invite_code}`);
    console.log(`  Users         : ${createdUsers.length}  (1 Admin, 2 Analysts, 3 Users)`);
    console.log(`  KPIs          : ${insertedKpis.length}`);
    console.log(`  Perf records  : ${totalRecords}  (24 months each)`);
    console.log(`  Log entries   : ${totalLogs}`);
    console.log("────────────────────────────────────────────────────────────");
    console.log("  Accounts:");
    for (const u of USERS) {
      console.log(`    [${u.role.padEnd(8)}]  ${u.email}  /  ${u.password}`);
    }
    console.log("════════════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("❌ Seeding error:", err.message, err.stack);
  } finally {
    db.close();
  }
}

seed();
