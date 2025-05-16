const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Get the database connection from index.js
const { db: dbPromise } = require('../index');

// Get performance data for a user (accessible to Admin, Analyst, and the user themselves)
router.get('/:userId', authMiddleware(['Admin', 'Analyst','User']), async (req, res) => {
  const { userId } = req.params;
  try {
    const db = await dbPromise;
    const [rows] = await db.execute(
      'SELECT * FROM performance_data WHERE user_id = ?',
      [userId]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching performance data:', err);
    res.status(500).json({ message: 'Failed to fetch performance data', error: 'Database error' });
  }
});

// Add performance data (accessible to Admin and Analyst)
router.post(
  "/",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    const { kpi_id, user_id, value, date } = req.body;
    try {
      if (!kpi_id || !user_id || !value || !date) {
        return res
          .status(400)
          .json({ message: "kpi_id, user_id, value, and date are required" });
      }

      const db = await dbPromise;
      const [result] = await db.execute(
        "INSERT INTO performance_data (kpi_id, user_id, value, date) VALUES (?, ?, ?, ?)",
        [kpi_id, user_id, value, date]
      );

      res
        .status(201)
        .json({ id: result.insertId, kpi_id, user_id, value, date });
    } catch (err) {
      console.error("Error adding performance data:", err);
      res.status(500).json({
        message: "Failed to add performance data",
        error: "Database error",
      });
    }
  }
);

// Get all performance data (for dashboard visualizations)
router.get('/all', authMiddleware(['Admin', 'Analyst', 'User']), async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.execute('SELECT * FROM performance_data');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching all performance data:', err);
    res.status(500).json({ message: 'Failed to fetch all performance data', error: 'Database error' });
  }
});

module.exports = router;