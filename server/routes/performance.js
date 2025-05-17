const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Get performance data for a user (accessible to Admin, Analyst, and the user themselves)
router.get('/:userId', authMiddleware(['Admin', 'Analyst','User']), async (req, res) => {
  const { userId } = req.params;
  try {
    const db = req.app.locals.db;
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

      const db = req.app.locals.db;
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
    const db = req.app.locals.db;
    console.log('Database connection successful');
    
    const [rows] = await db.execute('SELECT * FROM performance_data');
    console.log('Query successful, rows:', rows);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Detailed error:', {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    res.status(500).json({ 
      message: 'Failed to fetch performance data', 
      error: err.message,
      details: {
        code: err.code,
        sqlMessage: err.sqlMessage
      }
    });
  }
});

// Add or update a performance value for a user/KPI/period
router.post('/upsert', authMiddleware(['User', 'Admin', 'Analyst']), async (req, res) => {
  const { user_id, kpi_id, value } = req.body;
  let frequency = req.body.frequency;
  let date = req.body.date || new Date();

  // Make frequency case-insensitive
  const freq = (frequency || '').toLowerCase();

  // Calculate period start date based on frequency
  const now = new Date(date);
  let periodStart;
  if (freq === 'daily') {
    periodStart = now.toISOString().slice(0, 10); // YYYY-MM-DD
  } else if (freq === 'monthly') {
    periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  } else if (freq === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    periodStart = `${now.getFullYear()}-Q${quarter}`;
  } else if (freq === 'yearly') {
    periodStart = `${now.getFullYear()}-01-01`;
  } else {
    periodStart = now.toISOString().slice(0, 10);
  }

  try {
    const db = req.app.locals.db;
    // For daily/monthly/yearly, match on date (or period)
    let query = 'SELECT id FROM performance_data WHERE user_id = ? AND kpi_id = ? AND ';
    let params = [user_id, kpi_id];

    if (freq === 'daily') {
      query += 'DATE(date) = ?';
      params.push(periodStart);
    } else if (freq === 'monthly') {
      query += 'YEAR(date) = ? AND MONTH(date) = ?';
      params.push(now.getFullYear(), now.getMonth() + 1);
    } else if (freq === 'quarterly') {
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      query += 'YEAR(date) = ? AND QUARTER(date) = ?';
      params.push(now.getFullYear(), quarter);
    } else if (freq === 'yearly') {
      query += 'YEAR(date) = ?';
      params.push(now.getFullYear());
    } else {
      query += 'DATE(date) = ?';
      params.push(periodStart);
    }

    console.log('Query:', query, params);

    const [existing] = await db.execute(query, params);

    if (existing.length > 0) {
      // Update
      await db.execute('UPDATE performance_data SET value = ?, date = ? WHERE id = ?', [value, now, existing[0].id]);
    } else {
      // Insert
      await db.execute('INSERT INTO performance_data (user_id, kpi_id, value, date) VALUES (?, ?, ?, ?)', [user_id, kpi_id, value, now]);
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch a user's value for a KPI and period (daily/monthly/quarterly/yearly)
router.get('/value', authMiddleware(['User', 'Admin', 'Analyst']), async (req, res) => {
  const { userId, kpiId } = req.query;
  let frequency = req.query.frequency;
  const now = req.query.date ? new Date(req.query.date) : new Date();
  // Make frequency case-insensitive
  const freq = (frequency || '').toLowerCase();
  let query = 'SELECT * FROM performance_data WHERE user_id = ? AND kpi_id = ? AND ';
  let params = [userId, kpiId];

  if (freq === 'daily') {
    query += 'DATE(date) = ?';
    params.push(now.toISOString().slice(0, 10));
  } else if (freq === 'monthly') {
    query += 'YEAR(date) = ? AND MONTH(date) = ?';
    params.push(now.getFullYear(), now.getMonth() + 1);
  } else if (freq === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    query += 'YEAR(date) = ? AND QUARTER(date) = ?';
    params.push(now.getFullYear(), quarter);
  } else if (freq === 'yearly') {
    query += 'YEAR(date) = ?';
    params.push(now.getFullYear());
  } else {
    query += 'DATE(date) = ?';
    params.push(now.toISOString().slice(0, 10));
  }

  // Always fetch the latest value for the period
  query += ' ORDER BY date DESC LIMIT 1';

  const db = req.app.locals.db;
  const [rows] = await db.execute(query, params);
  res.json(rows[0] || null);
});

module.exports = router;