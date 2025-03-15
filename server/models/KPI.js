// const mongoose = require('mongoose');
// const kpiSchema = new mongoose.Schema({
//   name: String,
//   description: String,
// });
// module.exports = mongoose.model('KPI', kpiSchema);

const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('KPI', kpiSchema);