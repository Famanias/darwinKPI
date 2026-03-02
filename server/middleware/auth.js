const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "No authorization header provided" });
    }

    const token = authHeader.split(" ")[1]; // Expect "Bearer <token>"
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res
          .status(403)
          .json({ message: "Unauthorized: Insufficient role" });
      }

      // Fetch fresh user data to get current org_id and role
      const db = req.app.locals.db;
      const user = await db.getAsync(
        "SELECT id, email, role, org_id FROM users WHERE id = ?",
        [decoded.id]
      );

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Merge decoded token with fresh org_id
      req.user = {
        ...decoded,
        org_id: user.org_id,
        role: user.role, // Use fresh role from DB
      };

      next();
    } catch (err) {
      return res.status(401).json({ message: err.message || "Invalid token" });
    }
  };
};

module.exports = authMiddleware;
