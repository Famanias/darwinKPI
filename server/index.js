require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");
const cors = require("cors");

const app = express();

// CORS configuration
const allowedOrigins = [
  "http://localhost:4200",
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

        resolve(db);
      }
    });
  });
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

    app.use("/api/auth", authRoutes);
    app.use("/api/kpis", kpiRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/performance-data", performanceRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/logs", logsRoutes);
    app.use("/api/import", importRoutes);
    app.use("/api/download", downloadRoutes);

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
