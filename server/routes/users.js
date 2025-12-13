const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const bcryptjs = require("bcryptjs");

// Get all users in the same organization
router.get(
  "/",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      // Filter by organization
      if (!req.user.org_id) {
        return res.status(200).json([]);
      }

      const users = await db.allAsync(
        "SELECT id, name, email, role, status, created_at FROM users WHERE org_id = ?",
        [req.user.org_id]
      );
      res.status(200).json(users);
    } catch (err) {
      console.error("Error fetching users:", err.message, err.stack);
      res
        .status(500)
        .json({ message: "Failed to fetch users", error: "Database error" });
    }
  }
);

// Create a new user (accessible to Admin only) - adds to same organization
router.post("/", authMiddleware(["Admin"]), async (req, res) => {
  const { firstName, lastName, extension, email, role, password } = req.body;
  try {
    if (!firstName || !lastName || !email || !role) {
      return res
        .status(400)
        .json({
          message: "First name, last name, email, and role are required",
        });
    }

    // User must belong to an organization
    if (!req.user.org_id) {
      return res
        .status(403)
        .json({
          message: "You must belong to an organization to create users",
        });
    }

    const db = req.app.locals.db;
    const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const name = `${firstName}${extension ? ` ${extension}` : ""} ${lastName}`;

    // Hash password if provided, otherwise use a temporary password
    const hashedPassword = password
      ? await bcryptjs.hash(password, 10)
      : await bcryptjs.hash("TempPass123!", 10);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, role, password, status, org_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, role, hashedPassword, "Active", req.user.org_id]
    );

    const userId = result.insertId;
    res.status(201).json({
      message: "User created successfully",
      user: { id: userId, name, email, role, org_id: req.user.org_id },
    });
  } catch (err) {
    console.error("Error creating user:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Failed to create user", error: err.message });
  }
});

// Update a user (accessible to Admin only) - only users in same organization
router.put("/:id", authMiddleware(["Admin"]), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, extension, email, role, status } = req.body;
  try {
    // User must belong to an organization
    if (!req.user.org_id) {
      return res
        .status(403)
        .json({
          message: "You must belong to an organization to update users",
        });
    }

    const db = req.app.locals.db;

    // Only update users in same organization
    const [existing] = await db.execute(
      "SELECT * FROM users WHERE id = ? AND org_id = ?",
      [id, req.user.org_id]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found in your organization" });
    }

    const name = `${firstName}${extension ? ` ${extension}` : ""} ${lastName}`;
    await db.execute(
      "UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ? AND org_id = ?",
      [name, email, role, status, id, req.user.org_id]
    );

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Error updating user:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Failed to update user", error: "Database error" });
  }
});

// Delete a user (accessible to Admin only) - only users in same organization
router.delete("/:id", authMiddleware(["Admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    // User must belong to an organization
    if (!req.user.org_id) {
      return res
        .status(403)
        .json({
          message: "You must belong to an organization to delete users",
        });
    }

    // Can't delete yourself
    if (parseInt(id) === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const db = req.app.locals.db;

    // Only delete users in same organization
    const [existing] = await db.execute(
      "SELECT * FROM users WHERE id = ? AND org_id = ?",
      [id, req.user.org_id]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found in your organization" });
    }

    await db.execute("DELETE FROM users WHERE id = ? AND org_id = ?", [
      id,
      req.user.org_id,
    ]);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Failed to delete user", error: "Database error" });
  }
});

module.exports = router;
