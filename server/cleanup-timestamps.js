const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./darwinkpi.db");

// Delete records where date is a Unix timestamp (numeric value > 1000000000000)
db.run(
  `DELETE FROM performance_data WHERE typeof(date) = 'integer' OR CAST(date AS INTEGER) > 1000000000000`,
  function (err) {
    if (err) {
      console.error("Error deleting rows:", err);
    } else {
      console.log("Deleted", this.changes, "rows with Unix timestamps");
    }
    db.close();
  }
);
