const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');


router.get('/', authMiddleware(['Admin','User','Analyst']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute('SELECT * FROM kpis');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching KPIs:', err);
    res.status(500).json({ message: 'Failed to fetch KPIs', error: 'Database error' });
  }
});

// Create a new KPI (accessible to Admin only)
router.post('/', authMiddleware(['Admin']), async (req, res) => {
  const { name, description, unit, target, frequency, visualization } = req.body;
  try {
    if (!name || !description || !unit || !target || !frequency || !visualization) {
      return res.status(400).json({ message: 'Please fill all the required fields.' });
    }

    const db = req.app.locals.db;
    const [result] = await db.execute(
      'INSERT INTO kpis (name, description, unit, target, frequency, visualization) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, unit, target, frequency, visualization]
    );

    res.status(201).json({ id: result.insertId, name, description, unit, target, frequency, visualization });
  } catch (err) {
    console.error('SQL Error creating KPI:', err.message, err.sqlMessage);
    res.status(500).json({ 
      message: 'Failed to create KPI',
      error: err.sqlMessage || 'Database error'  // Send actual SQL error
    });
  }
});

// Update an existing KPI (accessible to Admin only)
router.put('/:id', authMiddleware(['Admin']), async (req, res) => {
  console.log('PUT /api/kpis/:id reached', req.params.id);
  const { id } = req.params;
  const { name, description, unit, target, frequency, visualization } = req.body;

  try {
    if (!name || !description || !unit || !target || !frequency || !visualization) {
      return res.status(400).json({ message: 'Please fill all the required fields.' });
    }

    const db = req.app.locals.db;
    const [result] = await db.execute(
      'UPDATE kpis SET name = ?, description = ?, unit = ?, target = ?, frequency = ?, visualization = ? WHERE id = ?',
      [name, description, unit, target, frequency, visualization, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'KPI not found' });
    }

    res.status(200).json({ id, name, description, unit, target, frequency, visualization });
  } catch (err) {
    console.error('SQL Error updating KPI:', err.message);
    res.status(500).json({ 
      message: 'Failed to update KPI',
      error: err.sqlMessage || 'Database error'  // Send actual SQL error
    });
  }
});

// Delete a KPI (accessible to Admin only)
router.delete('/:id', authMiddleware(['Admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const db = req.app.locals.db;
    const [result] = await db.execute('DELETE FROM kpis WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'KPI not found' });
    }

    res.status(200).json({ message: 'KPI deleted successfully' });
  } catch (err) {
    console.error('SQL Error deleting KPI:', err.message);
    res.status(500).json({ 
      message: 'Failed to delete KPI',
      error: err.sqlMessage || 'Database error'  // Send actual SQL error
    });
  }
});

module.exports = router;