const mongoose = require('mongoose');
const performanceSchema = new mongoose.Schema({
  kpiId: { type: mongoose.Schema.Types.ObjectId, ref: 'KPI' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  value: String,
  date: { type: Date, default: Date.now },
});
module.exports = mongoose.model('PerformanceData', performanceSchema);