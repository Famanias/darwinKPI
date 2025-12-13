/**
 * Seed script to populate demo data for Gordon College - BSCS (org_id = 1)
 * Run with: node seed-demo-data.js
 */

const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");

const ORG_ID = 1;

// KPIs suitable for a Computer Science department
const kpis = [
  {
    name: "Student Enrollment",
    description: "Total number of enrolled BSCS students per semester",
    unit: "Students",
    target: 500,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "Graduation Rate",
    description: "Percentage of students who graduate within 4 years",
    unit: "%",
    target: 85,
    frequency: "Monthly",
    visualization: "Bar",
  },
  {
    name: "Student Retention Rate",
    description: "Percentage of students retained from previous year",
    unit: "%",
    target: 90,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "Faculty-to-Student Ratio",
    description: "Number of students per faculty member",
    unit: "Ratio",
    target: 20,
    frequency: "Monthly",
    visualization: "Bar",
  },
  {
    name: "Research Publications",
    description: "Number of faculty and student research publications",
    unit: "Publications",
    target: 25,
    frequency: "Monthly",
    visualization: "Bar",
  },
  {
    name: "Industry Partnership Projects",
    description: "Active industry collaboration and capstone projects",
    unit: "Projects",
    target: 15,
    frequency: "Monthly",
    visualization: "Line",
  },
  {
    name: "Student Satisfaction Score",
    description: "Average satisfaction rating from student surveys",
    unit: "%",
    target: 90,
    frequency: "Monthly",
    visualization: "Gauge",
  },
  {
    name: "Employment Rate",
    description: "Percentage of graduates employed within 6 months",
    unit: "%",
    target: 85,
    frequency: "Monthly",
    visualization: "Bar",
  },
  {
    name: "Lab Utilization Rate",
    description: "Percentage of computer lab capacity being utilized",
    unit: "%",
    target: 75,
    frequency: "Monthly",
    visualization: "Gauge",
  },
  {
    name: "Certification Pass Rate",
    description: "Students passing industry certifications (AWS, Oracle, etc.)",
    unit: "%",
    target: 80,
    frequency: "Monthly",
    visualization: "Bar",
  },
];

// Generate realistic monthly data for 2025
function generateMonthlyData(kpiName, target) {
  const data = [];
  const months = [
    "2025-01-01",
    "2025-02-01",
    "2025-03-01",
    "2025-04-01",
    "2025-05-01",
    "2025-06-01",
    "2025-07-01",
    "2025-08-01",
    "2025-09-01",
    "2025-10-01",
    "2025-11-01",
    "2025-12-01",
  ];

  // Different patterns for different KPIs
  let baseValue, variance, trend;

  switch (kpiName) {
    case "Student Enrollment":
      // Enrollment peaks at start of semesters (Jan, Aug), dips in summer
      return months.map((date, i) => {
        const month = i + 1;
        let value;
        if (month >= 1 && month <= 5)
          value = 480 + Math.random() * 30; // 1st sem
        else if (month >= 6 && month <= 7)
          value = 320 + Math.random() * 40; // Summer
        else value = 490 + Math.random() * 25; // 2nd sem
        return { date, value: Math.round(value) };
      });

    case "Graduation Rate":
      // Graduation happens in April and October
      baseValue = 78;
      return months.map((date, i) => {
        const month = i + 1;
        let value = baseValue + i * 0.5 + (Math.random() * 4 - 2);
        if (month === 4 || month === 10) value += 5; // Graduation months
        return { date, value: Math.min(95, Math.round(value * 10) / 10) };
      });

    case "Student Retention Rate":
      // Generally stable with slight improvement trend
      baseValue = 86;
      return months.map((date, i) => {
        const value = baseValue + i * 0.3 + (Math.random() * 3 - 1.5);
        return { date, value: Math.min(98, Math.round(value * 10) / 10) };
      });

    case "Faculty-to-Student Ratio":
      // Lower is better, slight fluctuation
      return months.map((date, i) => {
        const month = i + 1;
        let value;
        if (month >= 6 && month <= 7)
          value = 15 + Math.random() * 3; // Summer (fewer students)
        else value = 22 + Math.random() * 4 - 2;
        return { date, value: Math.round(value * 10) / 10 };
      });

    case "Research Publications":
      // Increases throughout year, peaks at end of semesters
      return months.map((date, i) => {
        const month = i + 1;
        let cumulative = 2 + Math.floor(i * 2.2);
        if (month === 3 || month === 4 || month === 10 || month === 11)
          cumulative += 2;
        cumulative += Math.floor(Math.random() * 2);
        return { date, value: cumulative };
      });

    case "Industry Partnership Projects":
      // Builds up during academic year
      return months.map((date, i) => {
        const month = i + 1;
        let value = 8 + Math.floor(i * 0.6);
        if (month >= 9) value += 2; // More projects in 2nd sem
        value += Math.floor(Math.random() * 2);
        return { date, value: Math.min(18, value) };
      });

    case "Student Satisfaction Score":
      // Generally high with some variance
      baseValue = 85;
      return months.map((date, i) => {
        const month = i + 1;
        let value = baseValue + i * 0.4 + (Math.random() * 5 - 2.5);
        if (month === 3 || month === 10) value -= 3; // Exam stress periods
        if (month === 5 || month === 12) value += 2; // End of sem relief
        return {
          date,
          value: Math.min(98, Math.max(75, Math.round(value * 10) / 10)),
        };
      });

    case "Employment Rate":
      // Improves after graduation months
      baseValue = 75;
      return months.map((date, i) => {
        const month = i + 1;
        let value = baseValue + i * 0.8;
        if (month >= 5 && month <= 7) value += 5; // Post-graduation hiring
        if (month >= 11) value += 3;
        value += Math.random() * 4 - 2;
        return { date, value: Math.min(95, Math.round(value * 10) / 10) };
      });

    case "Lab Utilization Rate":
      // High during sem, low during breaks
      return months.map((date, i) => {
        const month = i + 1;
        let value;
        if (month >= 6 && month <= 7)
          value = 40 + Math.random() * 15; // Summer break
        else if (month === 12) value = 50 + Math.random() * 10; // Holiday
        else if (month === 3 || month === 10)
          value = 85 + Math.random() * 10; // Exam/project period
        else value = 68 + Math.random() * 12;
        return { date, value: Math.min(98, Math.round(value * 10) / 10) };
      });

    case "Certification Pass Rate":
      // Varies by certification exam schedules
      baseValue = 72;
      return months.map((date, i) => {
        const month = i + 1;
        let value = baseValue + i * 0.6 + (Math.random() * 8 - 4);
        if (month === 2 || month === 5 || month === 8 || month === 11)
          value += 3; // Exam months
        return {
          date,
          value: Math.min(95, Math.max(60, Math.round(value * 10) / 10)),
        };
      });

    default:
      // Generic pattern
      baseValue = target * 0.85;
      return months.map((date, i) => {
        const value =
          baseValue +
          i * (target * 0.01) +
          (Math.random() * target * 0.1 - target * 0.05);
        return { date, value: Math.round(value * 10) / 10 };
      });
  }
}

async function seedData() {
  const db = new sqlite3.Database("./darwinkpi.db", (err) => {
    if (err) {
      console.error("Failed to connect to database:", err.message);
      process.exit(1);
    }
    console.log("Connected to SQLite database");
  });

  // Promisify methods
  const runAsync = promisify(db.run.bind(db));
  const getAsync = promisify(db.get.bind(db));
  const allAsync = promisify(db.all.bind(db));

  try {
    // Check if organization exists
    const org = await getAsync("SELECT * FROM organizations WHERE id = ?", [
      ORG_ID,
    ]);
    if (!org) {
      console.log(`Organization with ID ${ORG_ID} not found. Creating...`);
      await runAsync(
        "INSERT INTO organizations (id, name, slug, invite_code) VALUES (?, ?, ?, ?)",
        [ORG_ID, "Gordon College - BSCS", "gordon-college-bscs", "GORDON25"]
      );
      console.log("Organization created!");
    } else {
      console.log(`Found organization: ${org.name}`);
    }

    // Clear existing KPIs and performance data for this org
    console.log("\nClearing existing data for organization...");
    await runAsync("DELETE FROM performance_data WHERE org_id = ?", [ORG_ID]);
    await runAsync("DELETE FROM kpis WHERE org_id = ?", [ORG_ID]);
    console.log("Existing data cleared.");

    // Insert KPIs
    console.log("\nInserting KPIs...");
    for (const kpi of kpis) {
      await runAsync(
        `INSERT INTO kpis (name, description, unit, target, frequency, visualization, org_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          kpi.name,
          kpi.description,
          kpi.unit,
          kpi.target,
          kpi.frequency,
          kpi.visualization,
          ORG_ID,
        ]
      );
      console.log(`  ✓ Created KPI: ${kpi.name}`);
    }

    // Get the inserted KPIs
    const insertedKpis = await allAsync("SELECT * FROM kpis WHERE org_id = ?", [
      ORG_ID,
    ]);
    console.log(`\nInserted ${insertedKpis.length} KPIs`);

    // Insert performance data for each KPI
    console.log("\nGenerating performance data for 2025...");

    // Get a user from this org to use as the data creator
    let userId = await getAsync(
      "SELECT id FROM users WHERE org_id = ? LIMIT 1",
      [ORG_ID]
    );
    if (!userId) {
      // Create a system user if none exists
      await runAsync(
        "INSERT INTO users (name, email, password, role, org_id, status) VALUES (?, ?, ?, ?, ?, ?)",
        ["System", "system@gordon.edu", "system", "Admin", ORG_ID, "Active"]
      );
      userId = await getAsync("SELECT id FROM users WHERE org_id = ? LIMIT 1", [
        ORG_ID,
      ]);
    }
    const userIdValue = userId.id;

    for (const kpi of insertedKpis) {
      const monthlyData = generateMonthlyData(kpi.name, kpi.target);

      for (const data of monthlyData) {
        await runAsync(
          `INSERT INTO performance_data (kpi_id, date, value, org_id, user_id) VALUES (?, ?, ?, ?, ?)`,
          [kpi.id, data.date, data.value, ORG_ID, userIdValue]
        );
      }
      console.log(`  ✓ Added 12 months of data for: ${kpi.name}`);
    }

    console.log("\n========================================");
    console.log("✅ Demo data seeded successfully!");
    console.log("========================================");
    console.log(`Organization: Gordon College - BSCS (ID: ${ORG_ID})`);
    console.log(`KPIs created: ${kpis.length}`);
    console.log(`Performance records: ${kpis.length * 12} (12 months each)`);
    console.log(`Date range: January 2025 - December 2025`);
    console.log("========================================\n");
  } catch (err) {
    console.error("Error seeding data:", err);
  } finally {
    db.close();
  }
}

seedData();
