require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");
const cors = require("cors");

const app = express();

// CORS configuration
const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:4201",
  "https://darwinkpi.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Database connection setup
const initDB = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("./darwinkpi.db", (err) => {
      if (err) {
        console.error("SQLite connection error:", err.message);
        reject(err);
      } else {
        console.log("SQLite connected");

        // Promisify database methods
        db.runAsync = promisify(db.run.bind(db));
        db.getAsync = promisify(db.get.bind(db));
        db.allAsync = promisify(db.all.bind(db));

        // For compatibility with MySQL code, add execute method
        db.execute = async (sql, params) => {
          if (sql.trim().toUpperCase().startsWith("SELECT")) {
            return [await db.allAsync(sql, params)];
          } else {
            return new Promise((resolve, reject) => {
              db.run(sql, params, function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve([
                    { insertId: this.lastID, affectedRows: this.changes },
                  ]);
                }
              });
            });
          }
        };

        // Initialize schema with organizations support
        initializeSchema(db)
          .then(() => resolve(db))
          .catch(reject);
      }
    });
  });
};

// Initialize database schema with organization support
const initializeSchema = async (db) => {
  // Create organizations table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    )
  `);

  // Check if org_id column exists in users table
  const usersInfo = await db.allAsync("PRAGMA table_info(users)");
  const hasOrgId = usersInfo.some((col) => col.name === "org_id");

  if (!hasOrgId) {
    // Add org_id to users table
    await db.runAsync(
      `ALTER TABLE users ADD COLUMN org_id INTEGER REFERENCES organizations(id)`
    );
    console.log("Added org_id column to users table");
  }

  // Check if org_id column exists in kpis table
  const kpisInfo = await db.allAsync("PRAGMA table_info(kpis)");
  const kpisHasOrgId = kpisInfo.some((col) => col.name === "org_id");

  if (!kpisHasOrgId) {
    await db.runAsync(
      `ALTER TABLE kpis ADD COLUMN org_id INTEGER REFERENCES organizations(id)`
    );
    console.log("Added org_id column to kpis table");
  }

  // Check if org_id column exists in performance_data table
  const perfInfo = await db.allAsync("PRAGMA table_info(performance_data)");
  const perfHasOrgId = perfInfo.some((col) => col.name === "org_id");

  if (!perfHasOrgId) {
    await db.runAsync(
      `ALTER TABLE performance_data ADD COLUMN org_id INTEGER REFERENCES organizations(id)`
    );
    console.log("Added org_id column to performance_data table");
  }

  // Check if org_id column exists in logs table
  const logsInfo = await db.allAsync("PRAGMA table_info(logs)");
  const logsHasOrgId = logsInfo.some((col) => col.name === "org_id");

  if (!logsHasOrgId) {
    await db.runAsync(
      `ALTER TABLE logs ADD COLUMN org_id INTEGER REFERENCES organizations(id)`
    );
    console.log("Added org_id column to logs table");
  }

  console.log("Database schema initialized with organization support");
};

// Initialize database and routes
const initializeApp = async () => {
  try {
    const db = await initDB();

    // Attach database to app context
    app.locals.db = db;

    // Routes
    const authRoutes = require("./routes/auth");
    const kpiRoutes = require("./routes/kpi");
    const usersRoutes = require("./routes/users");
    const performanceRoutes = require("./routes/performance");
    const analyticsRoutes = require("./routes/analytics");
    const logsRoutes = require("./routes/logs");
    const importRoutes = require("./routes/import");
    const downloadRoutes = require("./routes/download");
    const organizationsRoutes = require("./routes/organizations");

    app.use("/api/auth", authRoutes);
    app.use("/api/kpis", kpiRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/performance-data", performanceRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/logs", logsRoutes);
    app.use("/api/import", importRoutes);
    app.use("/api/download", downloadRoutes);
    app.use("/api/organizations", organizationsRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ message: "Something broke!" });
    });

    // Start server only when not in Vercel environment
    if (!process.env.VERCEL) {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    }

    return app;
  } catch (err) {
    console.error("Application initialization failed:", err);
    process.exit(1);
  }
};

// Export the initialized app for Vercel
module.exports = initializeApp();
