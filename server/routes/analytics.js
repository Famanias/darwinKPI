const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

router.get(
  "/kpi/all",
  authMiddleware(["Admin", "Analyst", "User"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      // Get all KPIs
      const [kpis] = await db.execute("SELECT * FROM kpis");

      // Get all performance data
      const [performanceData] = await db.execute(
        "SELECT * FROM performance_data"
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
