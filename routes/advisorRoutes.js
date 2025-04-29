// w1947632 Nauman Shaikh //
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const os = require('os');
const fs = require('fs');
const path = require('path');

const Advisor = require('../models/Advisor');
const { authMiddleware, advisorMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// -----------------
// Utility Functions
// -----------------

// Get the server's local IP address
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return '127.0.0.1';
};

const LOCAL_IP = getLocalIP();
const BACKEND_URL = `https://qr-feedback-system-backend-1.onrender.com`;

// Ensure the QR code output directory exists
const QR_CODE_DIR = path.join(__dirname, '../public/qrcodes');
if (!fs.existsSync(QR_CODE_DIR)) {
  fs.mkdirSync(QR_CODE_DIR, { recursive: true });
  console.log('✅ QR code directory created.');
}

// Generate and save QR code image
const generateQRCode = async (advisorId) => {
  try {
    const qrPath = path.join(QR_CODE_DIR, `${advisorId}.png`);
    const qrURL = `${BACKEND_URL}/api/feedback/${advisorId}`;

    await QRCode.toFile(qrPath, qrURL);
    return `/public/qrcodes/${advisorId}.png`;
  } catch (error) {
    console.error('❌ QR Code Generation Error:', error);
    return null;
  }
};

// --------------------
// Authentication Routes
// --------------------

// Register a new advisor or manager
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existingUser = await Advisor.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdvisor = new Advisor({
      name,
      email,
      password: hashedPassword,
      role: role || 'advisor',
      performanceData: [],
    });

    await newAdvisor.save();

    // Auto-generate QR code for advisors
    if (newAdvisor.role === 'advisor') {
      newAdvisor.qrCode = await generateQRCode(newAdvisor._id);
      await newAdvisor.save();
    }

    res.status(201).json({
      message: 'User registered successfully',
      advisorId: newAdvisor._id,
      role: newAdvisor.role,
    });
  } catch (error) {
    console.error('❌ Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration', error });
  }
});

// Login and return token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const advisor = await Advisor.findOne({ email });
    if (!advisor || !(await bcrypt.compare(password, advisor.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (advisor.role === 'advisor') {
      advisor.qrCode = await generateQRCode(advisor._id);
      await advisor.save();
    }

    const token = jwt.sign(
      { advisorId: advisor._id, role: advisor.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      token,
      advisorId: advisor._id,
      role: advisor.role,
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ message: 'Server error during login', error });
  }
});

// -----------------
// Advisor Endpoints
// -----------------

// Get basic advisor profile
router.get('/details/:advisorId', authMiddleware, advisorMiddleware, async (req, res) => {
  const { advisorId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(advisorId)) {
      return res.status(400).json({ message: 'Invalid Advisor ID format' });
    }

    const advisor = await Advisor.findById(advisorId).select('name email role');
    if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

    res.status(200).json(advisor);
  } catch (error) {
    console.error('❌ Fetch Advisor Info Error:', error);
    res.status(500).json({ message: 'Error fetching advisor info' });
  }
});

// Get advisor's QR code (regenerate if needed)
router.get('/:advisorId/qrcode', authMiddleware, advisorMiddleware, async (req, res) => {
  try {
    const { advisorId } = req.params;

    const advisor = await Advisor.findById(advisorId);
    if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

    advisor.qrCode = await generateQRCode(advisor._id);
    await advisor.save();

    res.status(200).json({ qrCodeURL: advisor.qrCode });
  } catch (error) {
    console.error('❌ QR Code Fetch Error:', error);
    res.status(500).json({ message: 'Error fetching QR Code', error });
  }
});

// Regenerate QR code on demand
router.post('/:advisorId/regenerate-qrcode', authMiddleware, advisorMiddleware, async (req, res) => {
  try {
    const { advisorId } = req.params;

    const advisor = await Advisor.findById(advisorId);
    if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

    advisor.qrCode = await generateQRCode(advisor._id);
    await advisor.save();

    res.status(200).json({ qrCodeURL: advisor.qrCode });
  } catch (error) {
    console.error('❌ QR Code Regeneration Error:', error);
    res.status(500).json({ message: 'Error regenerating QR Code', error });
  }
});

// Serve static QR codes
router.use('/qrcodes', express.static(QR_CODE_DIR));

// ---------------------
// Performance Endpoints
// ---------------------

// Fetch individual advisor's performance
router.get('/performance/:advisorId', authMiddleware, advisorMiddleware, async (req, res) => {
  const { advisorId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(advisorId)) {
      return res.status(400).json({ message: 'Invalid Advisor ID format' });
    }

    const advisor = await Advisor.findById(advisorId);
    if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

    res.status(200).json({ feedback: advisor.performanceData });
  } catch (error) {
    console.error('❌ Performance Fetch Error:', error);
    res.status(500).json({ message: 'Error fetching performance data', error });
  }
});

// Fetch all advisors' performance (for manager dashboard)
router.get('/all-performance', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const advisors = await Advisor.find({ role: 'advisor' });

    const results = advisors.map((advisor) => {
      let feedback = advisor.performanceData || [];

      // Apply date filters if present
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        feedback = feedback.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= start && entryDate <= end;
        });
      }

      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      feedback.forEach(entry => {
        const avg = Math.round((entry.q1 + entry.q2 + entry.q3 + entry.q4 + entry.q5) / 5);
        ratingCounts[avg] = (ratingCounts[avg] || 0) + 1;
      });

      const avgScore =
        feedback.length > 0
          ? (
              feedback.reduce((sum, entry) => sum + ((entry.q1 + entry.q2 + entry.q3 + entry.q4 + entry.q5) / 5), 0) /
              feedback.length
            ).toFixed(2)
          : 0;

      return {
        id: advisor._id,
        name: advisor.name,
        totalFeedback: feedback.length,
        averageRating: avgScore,
        ratingsBreakdown: ratingCounts,
        feedback,
      };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('❌ All Performance Fetch Error:', error);
    res.status(500).json({ message: 'Error fetching all advisor performance' });
  }
});

module.exports = router;