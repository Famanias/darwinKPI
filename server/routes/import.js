const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parse');

// Configure multer to handle both CSV and Excel files
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

router.post(
  '/',
  authMiddleware(['Admin', 'User', 'Analyst']),
  upload.single('file'),
  async (req, res) => {
    try {
      const file = req.file;
      const { kpi_id, user_id } = req.body;

      // Validate required fields
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }
      if (!kpi_id) {
        return res.status(400).json({ message: 'KPI selection is required.' });
      }
      if (!user_id) {
        return res.status(400).json({ message: 'User ID is required.' });
      }

      let jsonData;

      // Parse file based on type
      if (file.mimetype === 'text/csv') {
        // Parse CSV
        const parser = csv.parse({ columns: true, skip_empty_lines: true });
        const records = [];
        
        parser.on('readable', function() {
          let record;
          while (record = parser.read()) {
            records.push(record);
          }
        });

        parser.on('error', function(err) {
          throw new Error('Error parsing CSV: ' + err.message);
        });

        parser.write(file.buffer);
        parser.end();
        
        jsonData = records;
      } else {
        // Parse Excel
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = xlsx.utils.sheet_to_json(sheet);
      }

      if (!jsonData || !jsonData.length) {
        return res.status(400).json({ message: 'File is empty or contains no valid data.' });
      }

      // Validate data structure
      if (!jsonData[0].hasOwnProperty('date') || !jsonData[0].hasOwnProperty('value')) {
        return res.status(400).json({ 
          message: 'Invalid file format. File must contain "date" and "value" columns.' 
        });
      }

      // Date format validation helper function
      function isValidDate(date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return false;

        const dateStr = date.toString();
        const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2})))?$/;
        const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return isoRegex.test(dateStr) || simpleDateRegex.test(dateStr);
      }

      // Validate all rows
      for (const [index, row] of jsonData.entries()) {
        // Validate date
        if (!row.date || !isValidDate(row.date)) {
          return res.status(400).json({
            message: `Invalid date format at row ${index + 2}. Expected format: YYYY-MM-DD or ISO 8601 format.`
          });
        }

        // Validate value
        const value = parseFloat(row.value);
        if (isNaN(value)) {
          return res.status(400).json({
            message: `Invalid numeric value at row ${index + 2}. Value must be a number.`
          });
        }
      }

      // Build insert values
      const insertData = jsonData.map(row => [
        kpi_id,
        user_id,
        parseFloat(row.value),
        new Date(row.date)
      ]);

      const db = req.app.locals.db;

      // Validate KPI exists
      const [[kpi]] = await db.query('SELECT id FROM kpis WHERE id = ?', [kpi_id]);
      if (!kpi) {
        return res.status(400).json({ message: 'Selected KPI does not exist.' });
      }

      // Insert data
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
      res.status(500).json({ 
        message: err.message || 'Failed to import data',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
);

module.exports = router;
