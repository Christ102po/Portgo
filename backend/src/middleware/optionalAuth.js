const jwt = require("jsonwebtoken");

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();

  const token = header.slice(7);
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Treat an invalid optional token as unauthenticated. Endpoints that require
    // an admin use the normal requireAuth middleware instead.
    req.admin = null;
  }
  next();
}

module.exports = optionalAuth;
