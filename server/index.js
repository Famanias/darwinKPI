require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());

// CORS configuration (dynamic for local and deployed)
const allowedOrigins = [
  'http://localhost:4200', // Local frontend
  'https://darwinkpi.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const caCert = process.env.MYSQL_SSL_CA.replace(/\\n/g, '\n');

// MySQL connection
let dbPromise = mysql.createConnection({
  uri: process.env.MYSQL_SERVICE_URI,
  ssl: {
    ca: caCert,
    rejectUnauthorized: true
  }
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