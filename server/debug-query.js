const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./darwinkpi.db");

// Test query for user 4, kpi 1 (Customer Satisfaction - Monthly)
const userId = 4;
const kpiId = 1;
const frequency = "monthly";

console.log("Testing /value endpoint logic for user:", userId, "kpi:", kpiId);

// Monthly query
db.get(
  `SELECT value, date FROM performance_data 
   WHERE user_id = ? AND kpi_id = ? 
   AND strftime('%Y', date) = '2025' AND strftime('%m', date) = '12'
   ORDER BY id DESC LIMIT 1`,
  [userId, kpiId],
  (err, row) => {
    if (err) console.error("Error:", err);
    else console.log("Monthly query result:", row);

    // Also test daily query for kpi 3
    db.get(
      `SELECT value, date FROM performance_data 
       WHERE user_id = ? AND kpi_id = ? 
       AND date = '2025-12-13'
       ORDER BY id DESC LIMIT 1`,
      [4, 3],
      (err2, row2) => {
        if (err2) console.error("Error:", err2);
        else console.log("Daily query result (kpi 3):", row2);
        db.close();
      }
    );
  }
);
