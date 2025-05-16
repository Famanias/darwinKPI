const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/',
  authMiddleware(['Admin', 'User', 'Analyst']),
  upload.single('file'),
  async (req, res) => {
    try {
      const file = req.file;
      const { kpi_id, user_id } = req.body;

      if (!file || !kpi_id || !user_id) {
        return res.status(400).json({ message: 'File, kpi_id, and user_id are required.' });
      }

      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(sheet);

      if (!jsonData.length) {
        return res.status(400).json({ message: 'Spreadsheet is empty or invalid.' });
      }

      // Date format validation helper function
      function isValidDate(date) {
        // Date object created from input
        const parsedDate = new Date(date);
        // Check for Invalid Date
        if (isNaN(parsedDate.getTime())) return false;

        // Optional: Check string matches YYYY-MM-DD or ISO format (basic check)
        // You can customize this regex for stricter validation if needed
        const dateStr = date.toString();
        const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2})))?$/;
        const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return isoRegex.test(dateStr) || simpleDateRegex.test(dateStr);
      }

      // Validate all dates
      for (const [index, row] of jsonData.entries()) {
        if (!row.date || !isValidDate(row.date)) {
          return res.status(400).json({
            message: `Invalid date format at row ${index + 2}. Expected format: YYYY-MM-DD or ISO 8601 format (e.g., 2025-05-17 or 2025-05-17T14:30:00Z).`
          });
        }
      }

      // Build insert values from spreadsheet rows
      const insertData = jsonData.map(row => [
        kpi_id,
        user_id,
        parseFloat(row.value),
        new Date(row.date)
      ]);

      const db = req.app.locals.db;

      const [result] = await db.query(
        'INSERT INTO performance_data (kpi_id, user_id, value, date) VALUES ?',
        [insertData]
      );

      res.status(200).json({
        message: 'Data imported successfully',
        insertedRows: result.affectedRows
      });
    } catch (err) {
      console.error('Error importing data:', err);
      res.status(500).json({ message: 'Failed to import data', error: err.message });
    }
  }
);

module.exports = router;
