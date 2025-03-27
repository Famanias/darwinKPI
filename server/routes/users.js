const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Get all users (accessible to Admin only)
router.get('/', authMiddleware(['Admin']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users] = await db.execute('SELECT id, name, email, role FROM users');
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch users', error: 'Database error' });
  }
});

// Update a user (accessible to Admin only)
router.put('/:id', authMiddleware(['Admin']), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, extension, email, role, department, status } = req.body;
  try {
    const db = req.app.locals.db;
    const [existing] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const name = `${firstName}${extension ? ` ${extension}` : ''} ${lastName}`;
    await db.execute(
      'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
      [name, email, role, id]
    );

    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to update user', error: 'Database error' });
  }
});

// Delete a user (accessible to Admin only)
router.delete('/:id', authMiddleware(['Admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const db = req.app.locals.db;
    const [existing] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to delete user', error: 'Database error' });
  }
});

module.exports = router;