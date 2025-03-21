require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const mysql = require('mysql2/promise');
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

// MySQL connection
let dbPromise = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
}).then(connection => {
  console.log('MySQL connected');
  return connection;
}).catch(err => {
  console.error('MySQL connection error:', err);
  process.exit(1);
});

// Export app and dbPromise before requiring routes
module.exports = { app, db: dbPromise };

// Start server and set up routes after export
async function startServer() {
  // Wait for the database connection to be established
  await dbPromise;

  // Now that exports are set, require and use the routes
  const authRoutes = require('./routes/auth');
  const kpiRoutes = require('./routes/kpi');
  const performanceRoutes = require('./routes/performance');

  app.use('/api/auth', authRoutes);
  app.use('/api/kpis', kpiRoutes);
  app.use('/api/performance', performanceRoutes);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();