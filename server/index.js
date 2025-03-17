require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());

// CORS configuration (dynamic for local and deployed)
const allowedOrigins = [process.env.CORS_ORIGIN || 'http://localhost:4200'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Async MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/darwinKPI', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if connection fails
  }
}

// Start server only after successful DB connection
async function startServer() {
  await connectDB();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();

// Routes
const authRoutes = require('./routes/auth');
const kpiRoutes = require('./routes/kpi');
const performanceRoutes = require('./routes/performance');

app.use('/api/auth', authRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/performance', performanceRoutes);

module.exports = app; // Export for potential use (e.g., testing)