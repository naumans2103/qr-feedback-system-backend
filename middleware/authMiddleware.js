const jwt = require('jsonwebtoken');
const Advisor = require('../models/Advisor');

// ✅ Middleware to Authenticate Users (Client Advisors & Managers)
const authMiddleware = async (req, res, next) => {
    try {
        // ✅ Check if Authorization Header Exists
        const token = req.header('Authorization');
        if (!token) return res.status(401).json({ message: '❌ Access Denied - No Token' });

        // ✅ Verify JWT Token
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;

        // ✅ Find the user in the database
        const advisor = await Advisor.findById(decoded.advisorId);
        if (!advisor) return res.status(401).json({ message: '❌ User not found' });

        req.user.role = advisor.role; // ✅ Attach role to request
        next();
    } catch (error) {
        res.status(401).json({ message: '❌ Invalid or Expired Token' });
    }
};

// ✅ Middleware to Restrict Access to Managers Only
const managerMiddleware = (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ message: '❌ Forbidden - Manager Access Only' });
    }
    next();
};

// ✅ Middleware to Restrict Advisors to Their Own Data
const advisorMiddleware = (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.advisorId !== req.params.advisorId) {
        return res.status(403).json({ message: '❌ Forbidden - You can only access your own data' });
    }
    next();
};

module.exports = { authMiddleware, managerMiddleware, advisorMiddleware };