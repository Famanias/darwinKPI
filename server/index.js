require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:4200",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, Postman, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Return false (blocked) instead of an Error so it doesn't hit the
      // global error handler and return a confusing 500.
      console.warn(`CORS blocked: ${origin}`);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ── PostgreSQL compatibility shim ─────────────────────────────────────────────
// Routes were written for SQLite (? placeholders, db.execute / allAsync / etc.)
// This shim wraps pg.Pool with the same API so no route files need to change.

// Convert SQLite ? positional params to PostgreSQL $1 $2 $3 ...
function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function createDbShim(pool) {
  return {
    // Promise-based: returns [rows] for SELECT, [{insertId, affectedRows}] for writes
    execute: async (sql, params = []) => {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");
      let pgSql = toPositional(sql);
      if (!isSelect && sql.trim().toUpperCase().startsWith("INSERT") &&
          !pgSql.toUpperCase().includes("RETURNING")) {
        pgSql += " RETURNING id";
      }
      const { rows, rowCount } = await pool.query(pgSql, params);
      if (isSelect) return [rows];
      return [{ insertId: rows[0]?.id ?? null, affectedRows: rowCount }];
    },

    // Promise-based: returns all rows
    allAsync: async (sql, params = []) => {
      const { rows } = await pool.query(toPositional(sql), params);
      return rows;
    },

    // Promise-based: returns first row or null
    getAsync: async (sql, params = []) => {
      const { rows } = await pool.query(toPositional(sql), params);
      return rows[0] ?? null;
    },

    // Promise-based write; returns {lastID, changes}
    runAsync: async (sql, params = []) => {
      let pgSql = toPositional(sql);
      if (sql.trim().toUpperCase().startsWith("INSERT") &&
          !pgSql.toUpperCase().includes("RETURNING")) {
        pgSql += " RETURNING id";
      }
      const { rows, rowCount } = await pool.query(pgSql, params);
      return { lastID: rows[0]?.id ?? null, changes: rowCount };
    },

    // Callback-style: all rows
    all: (sql, params, callback) => {
      pool.query(toPositional(sql), params)
        .then(({ rows }) => callback(null, rows))
        .catch((err) => callback(err));
    },

    // Callback-style: single row
    get: (sql, params, callback) => {
      pool.query(toPositional(sql), params)
        .then(({ rows }) => callback(null, rows[0] ?? null))
        .catch((err) => callback(err));
    },

    // Callback-style write; `this` inside callback has lastID and changes
    run: (sql, params, callback) => {
      let pgSql = toPositional(sql);
      if (sql.trim().toUpperCase().startsWith("INSERT") &&
          !pgSql.toUpperCase().includes("RETURNING")) {
        pgSql += " RETURNING id";
      }
      pool.query(pgSql, params)
        .then(({ rows, rowCount }) => {
          const ctx = { lastID: rows[0]?.id ?? null, changes: rowCount };
          callback.call(ctx, null);
        })
        .catch((err) => callback.call({}, err));
    },
  };
}

// ── Schema initialization ─────────────────────────────────────────────────────
const initializeSchema = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      slug       TEXT UNIQUE NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      role       TEXT NOT NULL DEFAULT 'User',
      password   TEXT NOT NULL,
      status     TEXT DEFAULT 'Active',
      org_id     INTEGER REFERENCES organizations(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS kpis (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT,
      unit          TEXT,
      target        REAL,
      frequency     TEXT,
      visualization TEXT,
      org_id        INTEGER REFERENCES organizations(id),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS performance_data (
      id         SERIAL PRIMARY KEY,
      kpi_id     INTEGER REFERENCES kpis(id) ON DELETE CASCADE,
      user_id    INTEGER REFERENCES users(id),
      value      REAL NOT NULL,
      date       DATE NOT NULL,
      org_id     INTEGER REFERENCES organizations(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id),
      action     TEXT NOT NULL,
      timestamp  TEXT,
      org_id     INTEGER REFERENCES organizations(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database schema ready");
};

// ── Boot ──────────────────────────────────────────────────────────────────────
// ── Mount routes synchronously (safe at module load time) ───────────────────
const authRoutes          = require("./routes/auth");
const kpiRoutes           = require("./routes/kpi");
const usersRoutes         = require("./routes/users");
const performanceRoutes   = require("./routes/performance");
const analyticsRoutes     = require("./routes/analytics");
const logsRoutes          = require("./routes/logs");
const importRoutes        = require("./routes/import");
const downloadRoutes      = require("./routes/download");
const organizationsRoutes = require("./routes/organizations");

app.use("/api/auth",             authRoutes);
app.use("/api/kpis",             kpiRoutes);
app.use("/api/users",            usersRoutes);
app.use("/api/performance-data", performanceRoutes);
app.use("/api/analytics",        analyticsRoutes);
app.use("/api/logs",             logsRoutes);
app.use("/api/import",           importRoutes);
app.use("/api/download",         downloadRoutes);
app.use("/api/organizations",    organizationsRoutes);

// Health check — visit /api/health to confirm DB is connected
app.get("/api/health", async (req, res) => {
  const db = req.app.locals.db;
  if (!db) return res.status(503).json({ status: "error", message: "DB not initialised yet" });
  try {
    await db.getAsync("SELECT 1 AS ok");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!" });
});

// ── Lazy DB initialisation ────────────────────────────────────────────────────
// Runs once; subsequent calls return the cached promise.
let _initPromise = null;
const initializeApp = () => {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    });
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");
    await initializeSchema(pool);
    app.locals.db = createDbShim(pool);
  })();
  _initPromise.catch((err) => {
    console.error("DB init failed:", err);
    _initPromise = null; // allow retry on next request
  });
  return _initPromise;
};

// ── Export ────────────────────────────────────────────────────────────────────
// Wrap app so DB is always ready before a request is handled.
// This is the correct pattern for Vercel serverless + async DB init.
const handler = (req, res) => {
  initializeApp()
    .then(() => app(req, res))
    .catch((err) => {
      console.error("Initialization error:", err);
      res.status(500).json({ message: "Server initialization failed" });
    });
};

// Local dev: start a real HTTP server
if (!process.env.VERCEL) {
  initializeApp()
    .then(() => {
      const port = process.env.PORT || 3000;
      app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch((err) => {
      console.error("Failed to start:", err);
      process.exit(1);
    });
}

module.exports = handler;

