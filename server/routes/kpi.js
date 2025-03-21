const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Get the database connection from index.js
const { db: dbPromise } = require('../index');

// Get all KPIs (accessible to Admin and User)
router.get('/', authMiddleware(['Admin', 'User']), async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.execute('SELECT * FROM kpis');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching KPIs:', err);
    res.status(500).json({ message: 'Failed to fetch KPIs', error: 'Database error' });
  }
});

// Create a new KPI (accessible to Admin only)
router.post('/', authMiddleware(['Admin']), async (req, res) => {
  const { name, description } = req.body;
  try {
    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const db = await dbPromise;
    const [result] = await db.execute(
      'INSERT INTO kpis (name, description) VALUES (?, ?)',
      [name, description]
    );

    res.status(201).json({ id: result.insertId, name, description });
  } catch (err) {
    console.error('Error creating KPI:', err);
    res.status(500).json({ message: 'Failed to create KPI', error: 'Database error' });
  }
});

module.exports = router;