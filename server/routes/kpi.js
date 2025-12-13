const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

router.get(
  "/",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      // Filter by organization if user has one
      if (req.user.org_id) {
        const [rows] = await db.execute("SELECT * FROM kpis WHERE org_id = ?", [
          req.user.org_id,
        ]);
        res.status(200).json(rows);
      } else {
        // User without org sees nothing (or could see global/demo KPIs)
        res.status(200).json([]);
      }
    } catch (err) {
      console.error("Error fetching KPIs:", err);
      res
        .status(500)
        .json({ message: "Failed to fetch KPIs", error: "Database error" });
    }
  }
);

// Create a new KPI (accessible to Admin and Analyst)
router.post("/", authMiddleware(["Admin", "Analyst"]), async (req, res) => {
  const { name, description, unit, target, frequency, visualization } =
    req.body;
  try {
    // Validate required fields (target can be 0, so check for undefined/null)
    if (
      !name ||
      !unit ||
      !frequency ||
      !visualization ||
      target === undefined ||
      target === null
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all the required fields." });
    }

    // User must belong to an organization
    if (!req.user.org_id) {
      return res
        .status(403)
        .json({ message: "You must belong to an organization to create KPIs" });
    }

    const db = req.app.locals.db;
    const [result] = await db.execute(
      "INSERT INTO kpis (name, description, unit, target, frequency, visualization, org_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        description,
        unit,
        target,
        frequency,
        visualization,
        req.user.org_id,
      ]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      description,
      unit,
      target,
      frequency,
      visualization,
      org_id: req.user.org_id,
    });
  } catch (err) {
    console.error("SQL Error creating KPI:", err.message, err.sqlMessage);
    res.status(500).json({
      message: "Failed to create KPI",
      error: err.sqlMessage || "Database error", // Send actual SQL error
    });
  }
});

// Update an existing KPI (accessible to Admin and Analyst)
router.put("/:id", authMiddleware(["Admin", "Analyst"]), async (req, res) => {
  console.log("PUT /api/kpis/:id reached", req.params.id);
  const { id } = req.params;
  const { name, description, unit, target, frequency, visualization } =
    req.body;

  try {
    // Validate required fields (target can be 0, so check for undefined/null)
    if (
      !name ||
      !unit ||
      !frequency ||
      !visualization ||
      target === undefined ||
      target === null
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all the required fields." });
    }

    // User must belong to an organization
    if (!req.user.org_id) {
      return res
        .status(403)
        .json({ message: "You must belong to an organization to update KPIs" });
    }

    const db = req.app.locals.db;

    // Only update KPIs that belong to user's organization
    const [result] = await db.execute(
      "UPDATE kpis SET name = ?, description = ?, unit = ?, target = ?, frequency = ?, visualization = ? WHERE id = ? AND org_id = ?",
      [
        name,
        description,
        unit,
        target,
        frequency,
        visualization,
        id,
        req.user.org_id,
      ]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "KPI not found or not in your organization" });
    }

    res
      .status(200)
      .json({ id, name, description, unit, target, frequency, visualization });
  } catch (err) {
    console.error("SQL Error updating KPI:", err.message);
    res.status(500).json({
      message: "Failed to update KPI",
      error: err.sqlMessage || "Database error", // Send actual SQL error
    });
  }
});

// Delete a KPI (accessible to Admin and Analyst)
router.delete(
  "/:id",
  authMiddleware(["Admin", "Analyst"]),
  async (req, res) => {
    const { id } = req.params;

    try {
      // User must belong to an organization
      if (!req.user.org_id) {
        return res
          .status(403)
          .json({
            message: "You must belong to an organization to delete KPIs",
          });
      }

      const db = req.app.locals.db;

      // Only delete KPIs that belong to user's organization
      const [result] = await db.execute(
        "DELETE FROM kpis WHERE id = ? AND org_id = ?",
        [id, req.user.org_id]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "KPI not found or not in your organization" });
      }

      res.status(200).json({ message: "KPI deleted successfully" });
    } catch (err) {
      console.error("SQL Error deleting KPI:", err.message);
      res.status(500).json({
        message: "Failed to delete KPI",
        error: err.sqlMessage || "Database error", // Send actual SQL error
      });
    }
  }
);

module.exports = router;
