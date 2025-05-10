const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware(['Admin', 'User', 'Analyst']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users] = await db.execute('SELECT id, name, email, role, status FROM users');
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch users', error: 'Database error' });
  }
});

// Create a new user (accessible to Admin only)
router.post('/', authMiddleware(['Admin']), async (req, res) => {
  const { firstName, lastName, extension, email, role } = req.body;
  try {
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ message: 'First name, last name, email, and role are required' });
    }

    const db = req.app.locals.db;
    const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const name = `${firstName}${extension ? ` ${extension}` : ''} ${lastName}`;
    const [result] = await db.execute(
      'INSERT INTO users (name, email, role, password, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, role, 'defaultPassword', 'Active']
    );

    const userId = result.insertId;
    res.status(201).json({ message: 'User created successfully', user: { id: userId, name, email, role } });
  } catch (err) {
    console.error('Error creating user:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
});

// Update a user (accessible to Admin only)
router.put('/:id', authMiddleware(['Admin']), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, extension, email, role, status } = req.body;
  try {
    const db = req.app.locals.db;
    const [existing] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const name = `${firstName}${extension ? ` ${extension}` : ''} ${lastName}`;
    await db.execute(
      'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?',
      [name, email, role,status, id]
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