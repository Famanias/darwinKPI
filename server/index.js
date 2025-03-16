const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Use environment variable for MongoDB URI
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/darwinKPI')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const authRoutes = require('./routes/auth');
const kpiRoutes = require('./routes/kpi');
const performanceRoutes = require('./routes/performance');

app.use('/api/auth', authRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/performance', performanceRoutes);

// Export the app for Vercel serverless function
module.exports = app;