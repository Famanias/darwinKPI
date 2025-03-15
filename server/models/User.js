const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ['Admin', 'Analyst', 'User'], default: 'User' },
  password: { type: String, required: true },
});
module.exports = mongoose.model('User', userSchema);