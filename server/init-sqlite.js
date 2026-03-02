const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./darwinkpi.db");

db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'Active'
    )
  `);

  // Create kpis table
  db.run(`
    CREATE TABLE IF NOT EXISTS kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL,
      target REAL,
      frequency TEXT NOT NULL CHECK(frequency IN ('Daily','Weekly','Monthly','Quarterly','Yearly')),
      visualization TEXT NOT NULL CHECK(visualization IN ('Bar','Gauge','Line','Pie'))
    )
  `);

  // Create performance_data table
  db.run(`
    CREATE TABLE IF NOT EXISTS performance_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kpi_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      value REAL NOT NULL,
      date DATETIME NOT NULL,
      FOREIGN KEY (kpi_id) REFERENCES kpis(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Insert sample users
  db.run(`
    INSERT OR IGNORE INTO users (id, name, email, role, password, status)
    VALUES 
      (1, 'Admin User', 'admin@darwinkpi.com', 'Admin', '$2b$10$7qf2bXaZfBgwbYzUYTHpLuDdgAaVNKLFIF0ngc8GKQ5Qf7wGYOZ/u', 'Active'),
      (2, 'John Doe', 'john@darwinkpi.com', 'User', '$2b$10$7qf2bXaZfBgwbYzUYTHpLuDdgAaVNKLFIF0ngc8GKQ5Qf7wGYOZ/u', 'Active'),
      (3, 'Jane Analyst', 'jane@darwinkpi.com', 'Analyst', '$2b$10$7qf2bXaZfBgwbYzUYTHpLuDdgAaVNKLFIF0ngc8GKQ5Qf7wGYOZ/u', 'Active')
  `);

  // Insert sample KPIs
  db.run(`
    INSERT OR IGNORE INTO kpis (id, name, description, unit, target, frequency, visualization)
    VALUES 
      (1, 'Customer Satisfaction', 'Overall customer satisfaction score', 'Number', 90.00, 'Monthly', 'Gauge'),
      (2, 'Sales Revenue', 'Monthly sales revenue target', 'Currency', 50000.00, 'Monthly', 'Bar'),
      (3, 'Task Completion Rate', 'Daily task completion percentage', 'Number', 95.00, 'Daily', 'Line'),
      (4, 'Employee Engagement', 'Quarterly employee engagement score', 'Number', 85.00, 'Quarterly', 'Pie'),
      (5, 'Product Quality', 'Quality assurance pass rate', 'Number', 98.00, 'Weekly', 'Gauge'),
      (6, 'Response Time', 'Average customer response time in hours', 'Number', 2.00, 'Daily', 'Line')
  `);

  // Insert sample performance data for user 2 (John Doe) - Full 2025 data
  const performanceData = `
    INSERT OR IGNORE INTO performance_data (kpi_id, user_id, value, date)
    VALUES 
      -- Customer Satisfaction (Monthly - All of 2025)
      (1, 2, 88.5, '2025-01-01'),
      (1, 2, 89.2, '2025-02-01'),
      (1, 2, 87.8, '2025-03-01'),
      (1, 2, 90.1, '2025-04-01'),
      (1, 2, 91.5, '2025-05-01'),
      (1, 2, 89.8, '2025-06-01'),
      (1, 2, 92.3, '2025-07-01'),
      (1, 2, 91.0, '2025-08-01'),
      (1, 2, 90.5, '2025-09-01'),
      (1, 2, 93.2, '2025-10-01'),
      (1, 2, 92.8, '2025-11-01'),
      (1, 2, 94.1, '2025-12-01'),
      
      -- Sales Revenue (Monthly - All of 2025)
      (2, 2, 45000, '2025-01-01'),
      (2, 2, 48500, '2025-02-01'),
      (2, 2, 52000, '2025-03-01'),
      (2, 2, 49800, '2025-04-01'),
      (2, 2, 51200, '2025-05-01'),
      (2, 2, 53500, '2025-06-01'),
      (2, 2, 55000, '2025-07-01'),
      (2, 2, 54200, '2025-08-01'),
      (2, 2, 52800, '2025-09-01'),
      (2, 2, 56000, '2025-10-01'),
      (2, 2, 57500, '2025-11-01'),
      (2, 2, 59000, '2025-12-01'),
      
      -- Task Completion Rate (Daily - Last 30 days)
      (3, 2, 92.5, '2025-11-14'),
      (3, 2, 94.2, '2025-11-15'),
      (3, 2, 96.1, '2025-11-16'),
      (3, 2, 93.8, '2025-11-17'),
      (3, 2, 95.5, '2025-11-18'),
      (3, 2, 97.2, '2025-11-19'),
      (3, 2, 94.8, '2025-11-20'),
      (3, 2, 93.5, '2025-11-21'),
      (3, 2, 96.8, '2025-11-22'),
      (3, 2, 95.2, '2025-11-23'),
      (3, 2, 94.1, '2025-11-24'),
      (3, 2, 97.5, '2025-11-25'),
      (3, 2, 96.3, '2025-11-26'),
      (3, 2, 95.8, '2025-11-27'),
      (3, 2, 94.5, '2025-11-28'),
      (3, 2, 96.0, '2025-11-29'),
      (3, 2, 97.8, '2025-11-30'),
      (3, 2, 95.4, '2025-12-01'),
      (3, 2, 94.9, '2025-12-02'),
      (3, 2, 96.5, '2025-12-03'),
      (3, 2, 97.1, '2025-12-04'),
      (3, 2, 95.7, '2025-12-05'),
      (3, 2, 94.3, '2025-12-06'),
      (3, 2, 96.9, '2025-12-07'),
      (3, 2, 97.2, '2025-12-08'),
      (3, 2, 95.5, '2025-12-09'),
      (3, 2, 93.8, '2025-12-10'),
      (3, 2, 96.1, '2025-12-11'),
      (3, 2, 94.2, '2025-12-12'),
      (3, 2, 92.5, '2025-12-13'),
      
      -- Employee Engagement (Quarterly - All of 2025)
      (4, 2, 82.5, '2025-01-01'),
      (4, 2, 84.2, '2025-04-01'),
      (4, 2, 83.8, '2025-07-01'),
      (4, 2, 86.1, '2025-10-01'),
      
      -- Product Quality (Weekly - Last 12 weeks)
      (5, 2, 96.5, '2025-09-23'),
      (5, 2, 97.2, '2025-09-30'),
      (5, 2, 98.1, '2025-10-07'),
      (5, 2, 97.8, '2025-10-14'),
      (5, 2, 98.5, '2025-10-21'),
      (5, 2, 97.9, '2025-10-28'),
      (5, 2, 99.1, '2025-11-04'),
      (5, 2, 98.3, '2025-11-11'),
      (5, 2, 96.8, '2025-11-18'),
      (5, 2, 98.2, '2025-11-25'),
      (5, 2, 97.5, '2025-12-02'),
      (5, 2, 99.0, '2025-12-09'),
      
      -- Response Time (Daily - Last 30 days)
      (6, 2, 2.1, '2025-11-14'),
      (6, 2, 1.8, '2025-11-15'),
      (6, 2, 2.3, '2025-11-16'),
      (6, 2, 1.9, '2025-11-17'),
      (6, 2, 2.0, '2025-11-18'),
      (6, 2, 1.7, '2025-11-19'),
      (6, 2, 2.2, '2025-11-20'),
      (6, 2, 1.5, '2025-11-21'),
      (6, 2, 2.4, '2025-11-22'),
      (6, 2, 1.6, '2025-11-23'),
      (6, 2, 2.1, '2025-11-24'),
      (6, 2, 1.9, '2025-11-25'),
      (6, 2, 2.0, '2025-11-26'),
      (6, 2, 1.8, '2025-11-27'),
      (6, 2, 2.3, '2025-11-28'),
      (6, 2, 1.7, '2025-11-29'),
      (6, 2, 2.2, '2025-11-30'),
      (6, 2, 1.9, '2025-12-01'),
      (6, 2, 2.1, '2025-12-02'),
      (6, 2, 1.6, '2025-12-03'),
      (6, 2, 2.0, '2025-12-04'),
      (6, 2, 1.8, '2025-12-05'),
      (6, 2, 2.4, '2025-12-06'),
      (6, 2, 1.7, '2025-12-07'),
      (6, 2, 2.0, '2025-12-08'),
      (6, 2, 1.9, '2025-12-09'),
      (6, 2, 2.3, '2025-12-10'),
      (6, 2, 1.5, '2025-12-11'),
      (6, 2, 2.1, '2025-12-12'),
      (6, 2, 1.8, '2025-12-13')
  `;

  db.run(performanceData);

  // Insert sample logs
  db.run(`
    INSERT OR IGNORE INTO logs (user_id, action, timestamp)
    VALUES 
      (1, 'Created KPI: Customer Satisfaction', '2025-01-15 10:00:00'),
      (1, 'Created KPI: Sales Revenue', '2025-01-15 10:05:00'),
      (2, 'Updated performance data', '2025-12-13 09:30:00'),
      (2, 'Downloaded KPI Report', '2025-12-12 14:20:00'),
      (3, 'Viewed Analytics Dashboard', '2025-12-11 11:15:00'),
      (2, 'Updated Task Completion Rate', '2025-12-10 08:45:00')
  `);

  console.log("Database initialized successfully!");
  console.log("\n=== Login Credentials ===");
  console.log("Admin:");
  console.log("  Email: admin@darwinkpi.com");
  console.log("  Password: admin123");
  console.log("\nUser:");
  console.log("  Email: john@darwinkpi.com");
  console.log("  Password: admin123");
  console.log("\nAnalyst:");
  console.log("  Email: jane@darwinkpi.com");
  console.log("  Password: admin123");
  console.log("\n=== Sample Data ===");
  console.log("✓ 3 users created");
  console.log("✓ 6 KPIs created");
  console.log("✓ Performance data for all of 2025 populated");
  console.log("✓ Activity logs added");
});

db.close();
