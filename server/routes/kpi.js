// const express = require('express');
// const router = express.Router();
// const KPI = require('../models/KPI');
// const authMiddleware = require('../middleware/auth');

// router.post('/', authMiddleware(['Admin']), async (req, res) => {
//   const { name, description } = req.body;
//   const kpi = new KPI({ name, description });
//   await kpi.save();
//   res.status(201).json(kpi);
// });

// router.get('/', async (req, res) => {
//   const kpis = await KPI.find();
//   res.json(kpis);
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const KPI = require('../models/KPI');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware(['Admin']), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Basic validation
    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const kpi = new KPI({ name, description });
    await kpi.save();
    res.status(201).json(kpi);
  } catch (error) {
    res.status(500).json({ message: 'Error creating KPI', error: error.message });
  }
});

router.get('/', authMiddleware(['Admin', 'User']), async (req, res) => {
  try {
    const kpis = await KPI.find();
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching KPIs', error: error.message });
  }
});

module.exports = router;