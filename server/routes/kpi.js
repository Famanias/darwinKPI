const express = require('express');
const router = express.Router();
const KPI = require('../models/KPI');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware(['Admin']), async (req, res) => {
  const { name, description } = req.body;
  const kpi = new KPI({ name, description });
  await kpi.save();
  res.status(201).json(kpi);
});

router.get('/', async (req, res) => {
  const kpis = await KPI.find();
  res.json(kpis);
});

module.exports = router;