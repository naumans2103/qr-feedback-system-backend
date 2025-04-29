// w1947632 Nauman Shaikh //
const jwt = require('jsonwebtoken');
const Advisor = require('../models/Advisor');

// Middleware: Authenticates users (advisor or manager)
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'Access Denied - No Token Provided' });
    }

    // Clean the token (remove Bearer prefix if present)
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    // Validate advisor in DB
    const advisor = await Advisor.findById(decoded.advisorId);
    if (!advisor) {
      return res.status(401).json({ message: 'Access Denied - User Not Found' });
    }

    // Assign role from DB to user object
    req.user.role = advisor.role;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    return res.status(401).json({ message: 'Invalid or Expired Token' });
  }
};

// Middleware: Restrict access to manager-only routes
const managerMiddleware = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Access Denied - Managers Only' });
  }
  next();
};

// Middleware: Allow advisors to access only their own data (unless manager)
const advisorMiddleware = (req, res, next) => {
  const isManager = req.user.role === 'manager';
  const isOwner = req.user.advisorId === req.params.advisorId;

  if (!isManager && !isOwner) {
    return res.status(403).json({
      message: 'Access Denied - You can only access your own data',
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  managerMiddleware,
  advisorMiddleware,
};