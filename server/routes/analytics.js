const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

//Return All KPI with their performance data as a list
router.get(
  "/kpi/all",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;
      const [rows] = await db.execute("SELECT * FROM performance_data");

      const [kpiRows] = await db.execute("SELECT * FROM kpi");
      const kpiData = rows.map((row) => {
        const kpi = kpiRows.find((k) => k.id === row.kpi_id);
        return {
          ...row,
          kpi_name: kpi ? kpi.name : null,
          kpi_description: kpi ? kpi.description : null,
          kpi_unit: kpi ? kpi.unit : null,
          kpi_target: kpi ? kpi.target : null,
          kpi_visualization: kpi ? kpi.visualization : null,
        };
      });
      res.status(200).json(kpiData);
    } catch (err) {
      console.error(
        "Error fetching KPI performance data:",
        err.message,
        err.stack
      );
      res.status(500).json({
        message: "Failed to fetch KPI performance data",
        error: err.message,
      });
    }
  }
);

module.exports = router;
