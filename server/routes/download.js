const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const PDFDocument = require("pdfkit");

// Helper to format dates
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

router.get(
  "/report/all",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      // Get KPIs
      const [kpis] = await db.execute("SELECT * FROM kpis");
      if (!kpis.length) {
        return res.status(404).json({ message: "No KPIs found" });
      }

      // Get performance data for all KPIs
      const kpiIds = kpis.map((kpi) => kpi.id);
      const [performanceData] = await db.execute(
        "SELECT * FROM performance_data WHERE kpi_id IN (?) ORDER BY date ASC",
        [kpiIds]
      );
      console.log("Performance data:", performanceData);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="kpi_report_all.pdf"`
        );
        res.send(pdfData);
      });

      // Generate content
      for (const kpi of kpis) {
        doc
          .fontSize(22)
          .fillColor("blue")
          .text(`KPI Report: ${kpi.name}`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor("black");
        doc.text(`Description: ${kpi.description}`);
        doc.text(`Target: ${kpi.target}`);
        doc.text(`Unit: ${kpi.unit}`);
        doc.text(`Frequency: ${kpi.frequency}`);
        doc.moveDown();

        doc.fontSize(18).text("Performance Data", { underline: true });
        const kpiData = performanceData.filter((pd) => pd.kpi_id === kpi.id);

        if (kpiData.length === 0) {
          doc.text("No performance data available.");
        } else {
          kpiData.forEach((row) => {
            doc.text(`Date: ${formatDate(row.date)} | Value: ${row.value}`);
          });
        }

        if (kpi !== kpis[kpis.length - 1]) {
          doc.addPage();
        }
      }

      doc.end();
    } catch (err) {
      console.error("Error generating report:", err);
      res
        .status(500)
        .json({ message: "Failed to generate report", error: err.message });
    }
  }
);

//Get report for a list of KPIs
router.post(
  "/report",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    const { kpiIds } = req.body;

    if (!kpiIds || !Array.isArray(kpiIds) || kpiIds.length === 0) {
      return res
        .status(400)
        .json({ message: "kpiIds must be a non-empty array" });
    }

    try {
      const db = req.app.locals.db;

      // Get KPIs
      const [kpis] = await db.execute("SELECT * FROM kpis WHERE id IN (?)", [
        kpiIds,
      ]);
      if (!kpis.length) {
        return res.status(404).json({ message: "No KPIs found" });
      }

      // Get performance data for the KPIs
      const [performanceData] = await db.execute(
        "SELECT * FROM performance_data WHERE kpi_id IN (?) ORDER BY date ASC",
        [kpiIds]
      );

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="kpi_report.pdf"`
        );
        res.send(pdfData);
      });

      // Generate content
      for (const kpi of kpis) {
        doc
          .fontSize(22)
          .fillColor("blue")
          .text(`KPI Report: ${kpi.name}`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor("black");
        doc.text(`Description: ${kpi.description}`);
        doc.text(`Target: ${kpi.target}`);
        doc.text(`Unit: ${kpi.unit}`);
        doc.text(`Frequency: ${kpi.frequency}`);
        doc.moveDown();

        doc.fontSize(18).text("Performance Data", { underline: true });
        const kpiData = performanceData.filter((pd) => pd.kpi_id === kpi.id);

        if (kpiData.length === 0) {
          doc.text("No performance data available.");
        } else {
          kpiData.forEach((row) => {
            doc.text(`Date: ${formatDate(row.date)} | Value: ${row.value}`);
          });
        }

        if (kpi !== kpis[kpis.length - 1]) {
          doc.addPage();
        }
      }

      doc.end();
    } catch (err) {
      console.error("Error generating report:", err);
      res
        .status(500)
        .json({ message: "Failed to generate report", error: err.message });
    }
  }
);

// Get report for a specific KPI
router.get(
  "/report/:kpiId",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    const { kpiId } = req.params;
    try {
      const db = req.app.locals.db;

      // Get KPI
      const [kpis] = await db.execute("SELECT * FROM kpis WHERE id = ?", [
        kpiId,
      ]);
      if (!kpis.length) {
        return res.status(404).json({ message: "KPI not found" });
      }

      // Get performance data for the KPI
      const [performanceData] = await db.execute(
        "SELECT * FROM performance_data WHERE kpi_id = ? ORDER BY date ASC",
        [kpiId]
      );

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="kpi_report_${kpiId}.pdf"`
        );
        res.send(pdfData);
      });

      // Generate content
      const kpi = kpis[0];
      doc
        .fontSize(22)
        .fillColor("blue")
        .text(`KPI Report: ${kpi.name}`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor("black");
      doc.text(`Description: ${kpi.description}`);
      doc.text(`Target: ${kpi.target}`);
      doc.text(`Unit: ${kpi.unit}`);
      doc.text(`Frequency: ${kpi.frequency}`);
      doc.moveDown();

      doc.fontSize(18).text("Performance Data", { underline: true });

      if (performanceData.length === 0) {
        doc.text("No performance data available.");
      } else {
        performanceData.forEach((row) => {
          doc.text(`Date: ${formatDate(row.date)} | Value: ${row.value}`);
        });
      }

      doc.end();
    } catch (err) {
      console.error("Error generating report:", err);
      res
        .status(500)
        .json({ message: "Failed to generate report", error: err.message });
    }
  }
);

module.exports = router;
