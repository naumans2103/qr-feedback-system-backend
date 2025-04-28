const jwt = require('jsonwebtoken');
const Advisor = require('../models/Advisor');

// Middleware: Authenticate any logged-in user (Advisor or Manager)
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ message: 'Access Denied - No Token Provided' });
    }

    // Strip "Bearer " prefix if present and verify token
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = decoded;

    // Fetch advisor from DB
    const advisor = await Advisor.findById(decoded.advisorId);
    if (!advisor) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user role to request object
    req.user.role = advisor.role;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(401).json({ message: 'Invalid or Expired Token' });
  }
};

// Middleware: Allow only users with manager role
const managerMiddleware = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Access Denied - Managers Only' });
  }
  next();
};

// Middleware: Allow advisor to access only their own data (unless manager)
const advisorMiddleware = (req, res, next) => {
  const isManager = req.user.role === 'manager';
  const isOwner = req.user.advisorId === req.params.advisorId;

  if (!isManager && !isOwner) {
    return res.status(403).json({ message: 'Access Denied - You can only access your own data' });
  }

  next();
};

module.exports = {
  authMiddleware,
  managerMiddleware,
  advisorMiddleware,
};