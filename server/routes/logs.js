const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

//Get all logs (accessible to Admin)
router.get("/", authMiddleware(["Admin"]), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute("SELECT * FROM logs");
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch logs", error: "Database error" });
  }
});

// Get logs for a specific user (accessible to Admin)
router.get("/:userId", authMiddleware(["Admin"]), async (req, res) => {
  const { userId } = req.params;
  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute("SELECT * FROM logs WHERE user_id = ?", [
      userId,
    ]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching logs for user:", err);
    res.status(500).json({
      message: "Failed to fetch logs for user",
      error: "Database error",
    });
  }
});

// Add a new log entry (accessible to Admin, Analyst, and User)
router.post(
  "/",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    const { userId, action, timestamp } = req.body;
    try {
      const db = req.app.locals.db;
      await db.execute(
        "INSERT INTO logs (user_id, action, timestamp) VALUES (?, ?, ?)",
        [userId, action, timestamp]
      );
      res.status(201).json({ message: "Log entry created successfully" });
    } catch (err) {
      console.error("Error creating log entry:", err);
      res.status(500).json({
        message: "Failed to create log entry",
        error: "Database error",
      });
    }
  }
);

module.exports = router;