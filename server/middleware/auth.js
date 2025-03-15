const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1]; // Expect "Bearer <token>"
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Unauthorized: Insufficient role' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: err.message || 'Invalid token' });
    }
  };
};

module.exports = authMiddleware;