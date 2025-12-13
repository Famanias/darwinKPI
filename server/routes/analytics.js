const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

router.get(
  "/kpi/all",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      // Filter by organization
      if (!req.user.org_id) {
        return res.status(200).json([]);
      }

      // Get all KPIs for user's organization
      const [kpis] = await db.execute("SELECT * FROM kpis WHERE org_id = ?", [
        req.user.org_id,
      ]);

      // Get all performance data for user's organization
      const [performanceData] = await db.execute(
        "SELECT * FROM performance_data WHERE org_id = ?",
        [req.user.org_id]
      );

      // Group performance data under each KPI
      const result = kpis.map((kpi) => {
        const kpiPerformances = performanceData.filter(
          (pd) => pd.kpi_id === kpi.id
        );

        return {
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          unit: kpi.unit,
          target: kpi.target,
          visualization: kpi.visualization,
          frequency: kpi.frequency,
          data: kpiPerformances, // performance data rows for this KPI
        };
      });

      res.status(200).json(result);
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
