const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password length
const validatePassword = (password) => {
  return password.length >= 8;
};

// Generate a unique invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Generate a slug from organization name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

router.post("/register", async (req, res) => {
  const { email, password, name, role, organizationName, inviteCode } =
    req.body;
  try {
    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }

    // Must either create an organization or join one
    if (!organizationName && !inviteCode) {
      return res
        .status(400)
        .json({
          message:
            "You must either create a new organization or join an existing one with an invite code",
        });
    }

    // Get database connection from app locals
    const db = req.app.locals.db;

    const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    let org_id = null;
    let userRole = "User";
    let orgInfo = null;

    // If creating a new organization
    if (organizationName) {
      const slug = generateSlug(organizationName);
      const newInviteCode = generateInviteCode();

      // Check if slug already exists
      const existingOrg = await db.getAsync(
        "SELECT id FROM organizations WHERE slug = ?",
        [slug]
      );

      if (existingOrg) {
        return res
          .status(400)
          .json({
            message: "An organization with a similar name already exists",
          });
      }

      // Create organization first
      await db.runAsync(
        `INSERT INTO organizations (name, slug, invite_code) VALUES (?, ?, ?)`,
        [organizationName.trim(), slug, newInviteCode]
      );

      const newOrg = await db.getAsync(
        "SELECT * FROM organizations WHERE slug = ?",
        [slug]
      );

      org_id = newOrg.id;
      userRole = "Admin"; // Creator becomes Admin
      orgInfo = newOrg;
    }
    // If joining an existing organization
    else if (inviteCode) {
      const org = await db.getAsync(
        "SELECT * FROM organizations WHERE invite_code = ?",
        [inviteCode.toUpperCase()]
      );

      if (!org) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      org_id = org.id;
      userRole = "User"; // Joiners are Users by default
      orgInfo = org;
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO users (name, email, role, password, org_id) VALUES (?, ?, ?, ?, ?)",
      [name || "User", email, userRole, hashedPassword, org_id]
    );

    const userId = result.insertId;

    // Update organization's created_by if this is a new org
    if (organizationName && orgInfo) {
      await db.runAsync(
        `UPDATE organizations SET created_by = ? WHERE id = ?`,
        [userId, org_id]
      );
    }

    res.status(201).json({
      message: "Registration successful",
      user: { id: userId, email, role: userRole, org_id },
      organization: orgInfo,
    });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === "ER_DUP_ENTRY" || err.code === "23505") {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({
      message: "Registration failed",
      error: err.message,   // surface the real DB error
      code: err.code,
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Get database connection from app locals
    const db = req.app.locals.db;

    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Get organization info if user belongs to one
    let organization = null;
    if (user.org_id) {
      organization = await db.getAsync(
        "SELECT id, name, slug FROM organizations WHERE id = ?",
        [user.org_id]
      );
    }

    // Generate JWT token (include org_id)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, org_id: user.org_id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        org_id: user.org_id,
      },
      organization,
    });
  } catch (err) {
    console.error("Login error:", err.message, err.stack);
    res.status(500).json({
      message: "Login failed",
      error:
        process.env.NODE_ENV === "production" ? "Server error" : err.message,
    });
  }
});

module.exports = router;
