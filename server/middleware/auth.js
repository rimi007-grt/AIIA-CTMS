const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aiia_ctms_super_secret_jwt_key_sih2026_sih26046';

// All valid roles
const ROLES = {
  PI: 'Principal Investigator (PI)',
  COORDINATOR: 'Study Coordinator',
  MONITOR: 'Clinical Monitor',
  ETHICS: 'Ethics Committee Member',
  PV: 'Pharmacovigilance Officer',
  ADMIN: 'Institutional Admin',
  REGULATOR: 'Regulator'
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session. Please login again.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin has access to all routes
    if (req.user.designation === ROLES.ADMIN) {
      return next();
    }

    if (allowedRoles.includes(req.user.designation)) {
      return next();
    }

    return res.status(403).json({
      error: `Access Denied: Your role '${req.user.designation}' is not authorized to perform this operation.`
    });
  };
}

module.exports = {
  JWT_SECRET,
  ROLES,
  authenticateToken,
  requireRole
};
