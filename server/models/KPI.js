const mongoose = require('mongoose');
const kpiSchema = new mongoose.Schema({
  name: String,
  description: String,
});
module.exports = mongoose.model('KPI', kpiSchema);