const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors({ origin: 'https://darwinkpi.vercel.app' }));
// Async MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/darwinKPI', {
      serverSelectionTimeoutMS: 5000, // Faster timeout
      connectTimeoutMS: 10000,        // Adjust as needed
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

connectDB(); // Start connection asynchronously

const authRoutes = require('./routes/auth');
const kpiRoutes = require('./routes/kpi');
const performanceRoutes = require('./routes/performance');

app.use('/api/auth', authRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/performance', performanceRoutes);



module.exports = app;