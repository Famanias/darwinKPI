const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const crypto = require("crypto");

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

// Get current organization details
router.get("/current", auth(), async (req, res) => {
  const db = req.app.locals.db;
  try {
    if (!req.user.org_id) {
      return res
        .status(404)
        .json({ message: "User is not part of any organization" });
    }

    const org = await db.getAsync("SELECT * FROM organizations WHERE id = ?", [
      req.user.org_id,
    ]);

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Get member count
    const memberCount = await db.getAsync(
      "SELECT COUNT(*) as count FROM users WHERE org_id = ?",
      [req.user.org_id]
    );

    res.json({
      ...org,
      memberCount: memberCount?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new organization
router.post("/", auth(), async (req, res) => {
  const db = req.app.locals.db;
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: "Organization name is required" });
  }

  try {
    // Check if user already belongs to an organization
    if (req.user.org_id) {
      return res
        .status(400)
        .json({ message: "You already belong to an organization" });
    }

    const slug = generateSlug(name);
    const inviteCode = generateInviteCode();

    // Check if slug already exists
    const existingOrg = await db.getAsync(
      "SELECT id FROM organizations WHERE slug = ?",
      [slug]
    );

    if (existingOrg) {
      return res.status(400).json({
        message: "An organization with a similar name already exists",
      });
    }

    // Create organization
    await db.runAsync(
      `INSERT INTO organizations (name, slug, invite_code, created_by) VALUES (?, ?, ?, ?)`,
      [name.trim(), slug, inviteCode, req.user.id]
    );

    const newOrg = await db.getAsync(
      "SELECT * FROM organizations WHERE slug = ?",
      [slug]
    );

    // Update the user to be part of this organization and make them Admin
    await db.runAsync(
      `UPDATE users SET org_id = ?, role = 'Admin' WHERE id = ?`,
      [newOrg.id, req.user.id]
    );

    res.status(201).json({
      message: "Organization created successfully",
      organization: newOrg,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Join an organization via invite code
router.post("/join", auth(), async (req, res) => {
  const db = req.app.locals.db;
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: "Invite code is required" });
  }

  try {
    // Check if user already belongs to an organization
    if (req.user.org_id) {
      return res
        .status(400)
        .json({ message: "You already belong to an organization" });
    }

    // Find organization by invite code
    const org = await db.getAsync(
      "SELECT * FROM organizations WHERE invite_code = ?",
      [inviteCode.toUpperCase()]
    );

    if (!org) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    // Update user's organization
    await db.runAsync(`UPDATE users SET org_id = ? WHERE id = ?`, [
      org.id,
      req.user.id,
    ]);

    res.json({
      message: "Successfully joined organization",
      organization: org,
    });
  } catch (error) {
    console.error("Error joining organization:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update organization details (Admin only)
router.put("/", auth(), async (req, res) => {
  const db = req.app.locals.db;
  const { name } = req.body;

  try {
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only admins can update organization details" });
    }

    if (!req.user.org_id) {
      return res
        .status(404)
        .json({ message: "User is not part of any organization" });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Organization name is required" });
    }

    const slug = generateSlug(name);

    // Check if slug already exists for another org
    const existingOrg = await db.getAsync(
      "SELECT id FROM organizations WHERE slug = ? AND id != ?",
      [slug, req.user.org_id]
    );

    if (existingOrg) {
      return res.status(400).json({
        message: "An organization with a similar name already exists",
      });
    }

    await db.runAsync(
      `UPDATE organizations SET name = ?, slug = ? WHERE id = ?`,
      [name.trim(), slug, req.user.org_id]
    );

    const updatedOrg = await db.getAsync(
      "SELECT * FROM organizations WHERE id = ?",
      [req.user.org_id]
    );

    res.json({
      message: "Organization updated successfully",
      organization: updatedOrg,
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Regenerate invite code (Admin only)
router.post("/regenerate-invite", auth(), async (req, res) => {
  const db = req.app.locals.db;

  try {
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only admins can regenerate invite codes" });
    }

    if (!req.user.org_id) {
      return res
        .status(404)
        .json({ message: "User is not part of any organization" });
    }

    const newInviteCode = generateInviteCode();

    await db.runAsync(`UPDATE organizations SET invite_code = ? WHERE id = ?`, [
      newInviteCode,
      req.user.org_id,
    ]);

    res.json({
      message: "Invite code regenerated successfully",
      inviteCode: newInviteCode,
    });
  } catch (error) {
    console.error("Error regenerating invite code:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get organization members (Admin only)
router.get("/members", auth(), async (req, res) => {
  const db = req.app.locals.db;

  try {
    if (!req.user.org_id) {
      return res
        .status(404)
        .json({ message: "User is not part of any organization" });
    }

    const members = await db.allAsync(
      `SELECT id, name, email, role, status, created_at FROM users WHERE org_id = ? ORDER BY created_at DESC`,
      [req.user.org_id]
    );

    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove member from organization (Admin only)
router.delete("/members/:userId", auth(), async (req, res) => {
  const db = req.app.locals.db;
  const { userId } = req.params;

  try {
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only admins can remove members" });
    }

    if (!req.user.org_id) {
      return res
        .status(404)
        .json({ message: "User is not part of any organization" });
    }

    // Can't remove yourself
    if (parseInt(userId) === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot remove yourself from the organization" });
    }

    // Check if user belongs to this organization
    const member = await db.getAsync(
      "SELECT * FROM users WHERE id = ? AND org_id = ?",
      [userId, req.user.org_id]
    );

    if (!member) {
      return res
        .status(404)
        .json({ message: "Member not found in your organization" });
    }

    // Remove org_id from user (they become org-less)
    await db.runAsync(`UPDATE users SET org_id = NULL WHERE id = ?`, [userId]);

    res.json({ message: "Member removed from organization" });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update member role (Admin only)
router.put("/members/:userId/role", auth(), async (req, res) => {
  const db = req.app.locals.db;
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ["Admin", "User", "Analyst"];

  try {
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only admins can update member roles" });
    }

    if (!req.user.org_id) {
      return res
        .status(404)
        .json({ message: "User is not part of any organization" });
    }

    if (!validRoles.includes(role)) {
      return res
        .status(400)
        .json({ message: "Invalid role. Must be Admin, User, or Analyst" });
    }

    // Check if user belongs to this organization
    const member = await db.getAsync(
      "SELECT * FROM users WHERE id = ? AND org_id = ?",
      [userId, req.user.org_id]
    );

    if (!member) {
      return res
        .status(404)
        .json({ message: "Member not found in your organization" });
    }

    await db.runAsync(`UPDATE users SET role = ? WHERE id = ?`, [role, userId]);

    res.json({ message: "Member role updated successfully" });
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Check if invite code is valid (public endpoint for registration)
router.get("/verify-invite/:code", async (req, res) => {
  const db = req.app.locals.db;
  const { code } = req.params;

  try {
    const org = await db.getAsync(
      "SELECT id, name FROM organizations WHERE invite_code = ?",
      [code.toUpperCase()]
    );

    if (!org) {
      return res
        .status(404)
        .json({ valid: false, message: "Invalid invite code" });
    }

    res.json({ valid: true, organization: org });
  } catch (error) {
    console.error("Error verifying invite code:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
