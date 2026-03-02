const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./darwinkpi.db");

db.run(
  `UPDATE users SET role = 'Admin' WHERE id = 4 OR email = 'john@gmail.com'`,
  function (err) {
    if (err) {
      console.error("Error updating user:", err.message);
    } else {
      console.log(`✓ Updated ${this.changes} user(s) to Admin role`);
    }
    db.close();
  }
);
