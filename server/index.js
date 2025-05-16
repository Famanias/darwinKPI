require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:4200',
  'https://darwinkpi.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database connection setup
const initDB = async () => {
  try {
    const caCert = process.env.MYSQL_SSL_CA?.replace(/\\n/g, '\n');
    const connection = await mysql.createConnection({
      uri: process.env.MYSQL_SERVICE_URI,
      ssl: {
        ca: caCert,
        rejectUnauthorized: true
      }
    });
    console.log('MySQL connected');
    return connection;
  } catch (err) {
    console.error('MySQL connection error:', err.message, err.stack);
    throw err;
  }
};

// Initialize database and routes
const initializeApp = async () => {
  try {
    const db = await initDB();
    
    // Attach database to app context
    app.locals.db = db;

    // Routes
    const authRoutes = require('./routes/auth');
    const kpiRoutes = require('./routes/kpi');
    const usersRoutes = require('./routes/users');
    const performanceRoutes = require('./routes/performance');

    app.use('/api/auth', authRoutes);
    app.use('/api/kpis', kpiRoutes);
    app.use('/api/users', usersRoutes);
    app.use('/api/performance-data', performanceRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ message: 'Something broke!' });
    });

    // Start server only when not in Vercel environment
    if (!process.env.VERCEL) {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    }

    return app;
  } catch (err) {
    console.error('Application initialization failed:', err);
    process.exit(1);
  }
};

// Export the initialized app for Vercel
module.exports = initializeApp();