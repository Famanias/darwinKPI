const express = require('express');
const router = express.Router();
const PerformanceData = require('../models/Performance');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware(['Admin']), async (req, res) => {
  const { kpiId, userId, value } = req.body;
  const performance = new PerformanceData({ kpiId, userId, value });
  await performance.save();
  res.status(201).json(performance);
});

router.get('/analytics', authMiddleware(['Admin', 'Analyst']), async (req, res) => {
  const data = await PerformanceData.find().populate('kpiId').populate('userId');
  res.json(data);
});

module.exports = router;