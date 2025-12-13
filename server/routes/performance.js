const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

// IMPORTANT: Static routes must come BEFORE parameterized routes!

// Get all performance data (for dashboard visualizations) - filtered by organization
router.get(
  "/all",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      // Filter by organization
      if (!req.user.org_id) {
        return res.status(200).json([]);
      }

      const rows = await new Promise((resolve, reject) => {
        db.all(
          "SELECT * FROM performance_data WHERE org_id = ? ORDER BY date DESC",
          [req.user.org_id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching all performance data:", err);
      res.status(500).json({
        message: "Failed to fetch performance data",
        error: err.message,
      });
    }
  }
);

// Get performance value for a specific KPI/period (filtered by organization)
router.get(
  "/value",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    const { kpiId, frequency, date } = req.query;

    console.log("GET /value - Received params:", {
      kpiId,
      frequency,
      date,
    });

    if (!kpiId || !frequency || !date) {
      return res.status(400).json({
        message: "kpiId, frequency, and date are required",
      });
    }

    // Filter by organization
    if (!req.user.org_id) {
      return res.status(200).json({ value: null });
    }

    try {
      const db = req.app.locals.db;
      const freq = (frequency || "").toLowerCase();
      const now = new Date(date);

      let query =
        "SELECT value, date FROM performance_data WHERE kpi_id = ? AND org_id = ? AND ";
      let params = [Number(kpiId), req.user.org_id];

      if (freq === "daily") {
        const periodStart = now.toISOString().slice(0, 10);
        query += "date = ?";
        params.push(periodStart);
      } else if (freq === "monthly") {
        query += "strftime('%Y', date) = ? AND strftime('%m', date) = ?";
        params.push(
          String(now.getFullYear()),
          String(now.getMonth() + 1).padStart(2, "0")
        );
      } else if (freq === "quarterly") {
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        query +=
          "strftime('%Y', date) = ? AND CAST((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 AS INTEGER) + 1 = ?";
        params.push(String(now.getFullYear()), quarter);
      } else if (freq === "yearly") {
        query += "strftime('%Y', date) = ?";
        params.push(String(now.getFullYear()));
      } else if (freq === "weekly") {
        // For weekly, check if the date falls within the same week
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        query += "date >= ? AND date <= ?";
        params.push(
          startOfWeek.toISOString().slice(0, 10),
          endOfWeek.toISOString().slice(0, 10)
        );
      } else {
        const periodStart = now.toISOString().slice(0, 10);
        query += "date = ?";
        params.push(periodStart);
      }

      query += " ORDER BY id DESC LIMIT 1";

      console.log("Executing query:", query);
      console.log("With params:", params);

      const row = await new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      console.log("Query result:", row);

      if (row && row.value !== null && row.value !== undefined) {
        res.status(200).json({ value: row.value });
      } else {
        res.status(200).json({ value: null });
      }
    } catch (err) {
      console.error("Error fetching performance value:", err);
      res.status(500).json({
        message: "Failed to fetch performance value",
        error: err.message,
      });
    }
  }
);

// Add or update a performance value for a KPI/period (filtered by organization)
router.post(
  "/upsert",
  authMiddleware(["User", "Admin", "Analyst"]),
  async (req, res) => {
    const { user_id, kpi_id, value } = req.body;
    let frequency = req.body.frequency;
    let date = req.body.date || new Date();

    // User must belong to an organization
    if (!req.user.org_id) {
      return res
        .status(403)
        .json({
          message: "You must belong to an organization to add performance data",
        });
    }

    const freq = (frequency || "").toLowerCase();
    const now = new Date(date);
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    try {
      const db = req.app.locals.db;

      // Build query to find existing record for this KPI and period (filtered by org)
      let query =
        "SELECT id FROM performance_data WHERE kpi_id = ? AND org_id = ? AND ";
      let params = [kpi_id, req.user.org_id];

      if (freq === "daily") {
        query += "date = ?";
        params.push(dateStr);
      } else if (freq === "monthly") {
        query += "strftime('%Y', date) = ? AND strftime('%m', date) = ?";
        params.push(
          String(now.getFullYear()),
          String(now.getMonth() + 1).padStart(2, "0")
        );
      } else if (freq === "quarterly") {
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        query +=
          "strftime('%Y', date) = ? AND CAST((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 AS INTEGER) + 1 = ?";
        params.push(String(now.getFullYear()), quarter);
      } else if (freq === "yearly") {
        query += "strftime('%Y', date) = ?";
        params.push(String(now.getFullYear()));
      } else if (freq === "weekly") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        query += "date >= ? AND date <= ?";
        params.push(
          startOfWeek.toISOString().slice(0, 10),
          endOfWeek.toISOString().slice(0, 10)
        );
      } else {
        query += "date = ?";
        params.push(dateStr);
      }

      console.log("Upsert check query:", query, params);

      // Check if record exists
      const existing = await new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existing) {
        // Update existing record
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE performance_data SET value = ?, date = ? WHERE id = ?",
            [value, dateStr, existing.id],
            function (err) {
              if (err) reject(err);
              else resolve(this);
            }
          );
        });
        console.log("Updated existing record:", existing.id);
      } else {
        // Insert new record with org_id
        await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO performance_data (user_id, kpi_id, value, date, org_id) VALUES (?, ?, ?, ?, ?)",
            [user_id, kpi_id, value, dateStr, req.user.org_id],
            function (err) {
              if (err) reject(err);
              else resolve(this);
            }
          );
        });
        console.log("Inserted new record");
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Upsert error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Add performance data (accessible to Admin and Analyst) - with org_id
router.post(
  "/",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    const { kpi_id, user_id, value, date } = req.body;
    try {
      if (!kpi_id || !user_id || !value || !date) {
        return res.status(400).json({
          message: "kpi_id, user_id, value, and date are required",
        });
      }

      // User must belong to an organization
      if (!req.user.org_id) {
        return res
          .status(403)
          .json({
            message:
              "You must belong to an organization to add performance data",
          });
      }

      const db = req.app.locals.db;
      const dateStr = new Date(date).toISOString().slice(0, 10);

      const result = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO performance_data (kpi_id, user_id, value, date, org_id) VALUES (?, ?, ?, ?, ?)",
          [kpi_id, user_id, value, dateStr, req.user.org_id],
          function (err) {
            if (err) reject(err);
            else resolve({ insertId: this.lastID });
          }
        );
      });

      res
        .status(201)
        .json({
          id: result.insertId,
          kpi_id,
          user_id,
          value,
          date: dateStr,
          org_id: req.user.org_id,
        });
    } catch (err) {
      console.error("Error adding performance data:", err);
      res.status(500).json({
        message: "Failed to add performance data",
        error: err.message,
      });
    }
  }
);

// Get performance data for a user - MUST BE LAST (parameterized route) - filtered by org
router.get(
  "/:userId",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    const { userId } = req.params;
    try {
      const db = req.app.locals.db;

      // Filter by organization
      if (!req.user.org_id) {
        return res.status(200).json([]);
      }

      const rows = await new Promise((resolve, reject) => {
        db.all(
          "SELECT * FROM performance_data WHERE user_id = ? AND org_id = ?",
          [userId, req.user.org_id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching performance data:", err);
      res.status(500).json({
        message: "Failed to fetch performance data",
        error: err.message,
      });
    }
  }
);

module.exports = router;
