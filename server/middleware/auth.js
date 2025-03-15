const jwt = require('jsonwebtoken');

module.exports = (roles) => (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, 'secret_key');
    if (!roles.includes(decoded.role)) return res.status(403).json({ message: 'Unauthorized' });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};