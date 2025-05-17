const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const PDFDocument = require("pdfkit");

// Helper to format dates
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

// Helper to add a header to each page
function addHeader(doc, title = "KPI Report") {
  // If you have a logo, you can use: doc.image('path/to/logo.png', 50, 45, {width: 50});
  doc
    .fontSize(18)
    .fillColor("#1a237e")
    .font("Helvetica-Bold")
    .text("DarwinKPI", 50, 40, { align: "left" });
  doc
    .fontSize(10)
    .fillColor("gray")
    .font("Helvetica")
    .text(new Date().toLocaleString(), 400, 50, { align: "right" });
  doc
    .moveTo(50, 70)
    .lineTo(545, 70)
    .strokeColor("#1a237e")
    .lineWidth(1)
    .stroke();
  doc.moveDown(2);
  doc
    .fontSize(16)
    .fillColor("#0d47a1")
    .font("Helvetica-Bold")
    .text(title, 50, doc.y, { align: "left", underline: true });
  doc.moveDown();
}


// Helper to add a footer with page numbers
function addFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Page ${i + 1} of ${range.count}`, 0, 770, { align: "center" });
  }
}


// Helper to render performance data as a table
function renderPerformanceTable(doc, data) {
  const tableTop = doc.y + 10;
  const itemHeight = 22;
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#1565c0")
    .text("Date", 60, tableTop)
    .text("Value", 300, tableTop);
  doc
    .moveTo(50, tableTop + 18)
    .lineTo(545, tableTop + 18)
    .strokeColor("#1565c0")
    .lineWidth(0.5)
    .stroke();

  doc.font("Helvetica").fontSize(12).fillColor("black");
  let y = tableTop + 25;
  data.forEach((row) => {
    doc.text(formatDate(row.date), 60, y).text(row.value, 300, y);
    y += itemHeight;
    if (y > 700) {
      doc.addPage();
      addHeader(doc);
      y = doc.y + 10;
    }
  });
  doc.moveDown();
}

router.get(
  "/report/all",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    try {
      const db = req.app.locals.db;
      const [kpis] = await db.execute("SELECT * FROM kpis");
      if (!kpis.length) {
        return res.status(404).json({ message: "No KPIs found" });
      }
      const kpiIds = kpis.map((kpi) => kpi.id);
      const placeholders = kpiIds.map(() => '?').join(',');
      const [performanceData] = await db.execute(
        `SELECT * FROM performance_data WHERE kpi_id IN (${placeholders}) ORDER BY date ASC`,
        kpiIds
      );

      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        addFooter(doc);
        const pdfData = Buffer.concat(buffers);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="kpi_report_all.pdf"`
        );
        res.send(pdfData);
      });

      for (const kpi of kpis) {
        addHeader(doc, `KPI: ${kpi.name}`);
        doc
          .moveDown(0.5)
          .fontSize(13)
          .fillColor("black")
          .font("Helvetica-Bold")
          .text("Description:", 50, doc.y, { continued: true, align: "left" })
          .font("Helvetica")
          .text(` ${kpi.description}`, { align: "left" });

        doc
          .font("Helvetica-Bold")
          .text("Target:", 50, doc.y, { continued: true, align: "left" })
          .font("Helvetica")
          .text(` ${kpi.target} ${kpi.unit}`, { align: "left" });

        doc
          .font("Helvetica-Bold")
          .text("Frequency:", 50, doc.y, { continued: true, align: "left" })
          .font("Helvetica")
          .text(` ${kpi.frequency}`, { align: "left" });

        doc.moveDown();

        doc
          .fontSize(14)
          .fillColor("#0d47a1")
          .font("Helvetica-Bold")
          .text("Performance Data", 50, doc.y, { align: "left", underline: true });
        const kpiData = performanceData.filter((pd) => pd.kpi_id === kpi.id);

        if (kpiData.length === 0) {
          doc.font("Helvetica").fontSize(12).fillColor("gray").text("No performance data available.");
        } else {
          renderPerformanceTable(doc, kpiData);
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

// --- Repeat for the other two endpoints ---

router.post(
  "/report",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    const { kpiIds, userId } = req.body;

    if (!kpiIds || !Array.isArray(kpiIds) || kpiIds.length === 0) {
      return res
        .status(400)
        .json({ message: "kpiIds must be a non-empty array" });
    }
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    try {
      const db = req.app.locals.db;

      // Get KPIs
      const [kpis] = await db.execute("SELECT * FROM kpis WHERE id IN (" + kpiIds.map(() => '?').join(',') + ")", kpiIds);
      if (!kpis.length) {
        return res.status(404).json({ message: "No KPIs found" });
      }

      // Get performance data for the KPIs and user
      const placeholders = kpiIds.map(() => '?').join(',');
      const [performanceData] = await db.execute(
        `SELECT * FROM performance_data WHERE kpi_id IN (${placeholders}) AND user_id = ? ORDER BY date ASC`,
        [...kpiIds, userId]
      );

      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        addFooter(doc);
        const pdfData = Buffer.concat(buffers);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="kpi_report.pdf"`
        );
        res.send(pdfData);
      });

      for (const kpi of kpis) {
        addHeader(doc, `KPI: ${kpi.name}`);
        doc
          .moveDown(0.5)
          .fontSize(13)
          .fillColor("black")
          .font("Helvetica-Bold")
          .text("Description:", 50, doc.y, { continued: true, align: "left" })
          .font("Helvetica")
          .text(` ${kpi.description}`, { align: "left" });
        doc
          .font("Helvetica-Bold")
          .text("Target:", 50, doc.y, { continued: true, align: "left" })
          .font("Helvetica")
          .text(` ${kpi.target} ${kpi.unit}`, { align: "left" });
        doc
          .font("Helvetica-Bold")
          .text("Frequency:", 50, doc.y, { continued: true, align: "left" })
          .font("Helvetica")
          .text(` ${kpi.frequency}`, { align: "left" });
        doc.moveDown();

        doc
          .fontSize(14)
          .fillColor("#0d47a1")
          .font("Helvetica-Bold")
          .text("Performance Data", 50, doc.y, { align: "left", underline: true });
        const kpiData = performanceData.filter((pd) => pd.kpi_id === kpi.id);

        if (kpiData.length === 0) {
          doc.font("Helvetica").fontSize(12).fillColor("gray").text("No performance data available.");
        } else {
          renderPerformanceTable(doc, kpiData);
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

router.get(
  "/report/:kpiId",
  authMiddleware(["Admin", "User", "Analyst"]),
  async (req, res) => {
    const { kpiId } = req.params;
    try {
      const db = req.app.locals.db;
      const [kpis] = await db.execute("SELECT * FROM kpis WHERE id = ?", [
        kpiId,
      ]);
      if (!kpis.length) {
        return res.status(404).json({ message: "KPI not found" });
      }
      const [performanceData] = await db.execute(
        "SELECT * FROM performance_data WHERE kpi_id = ? ORDER BY date ASC",
        [kpiId]
      );

      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        addFooter(doc);
        const pdfData = Buffer.concat(buffers);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="kpi_report_${kpiId}.pdf"`
        );
        res.send(pdfData);
      });

      const kpi = kpis[0];
      addHeader(doc, `KPI: ${kpi.name}`);
      doc
        .moveDown(0.5)
        .fontSize(13)
        .fillColor("black")
        .font("Helvetica-Bold")
        .text("Description:", 50, doc.y, { continued: true, align: "left" })
        .font("Helvetica")
        .text(` ${kpi.description}`, { align: "left" });

      doc
        .font("Helvetica-Bold")
        .text("Target:", 50, doc.y, { continued: true, align: "left" })
        .font("Helvetica")
        .text(` ${kpi.target} ${kpi.unit}`, { align: "left" });

      doc
        .font("Helvetica-Bold")
        .text("Frequency:", 50, doc.y, { continued: true, align: "left" })
        .font("Helvetica")
        .text(` ${kpi.frequency}`, { align: "left" });

      doc.moveDown();

      doc
        .fontSize(14)
        .fillColor("#0d47a1")
        .font("Helvetica-Bold")
        .text("Performance Data", 50, doc.y, { align: "left", underline: true });

      if (performanceData.length === 0) {
        doc.font("Helvetica").fontSize(12).fillColor("gray").text("No performance data available.");
      } else {
        renderPerformanceTable(doc, performanceData);
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
