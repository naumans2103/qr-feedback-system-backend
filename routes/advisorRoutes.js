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

const QR_CODE_DIR = path.join(__dirname, '../public/qrcodes');

// Ensure QR code directory exists
if (!fs.existsSync(QR_CODE_DIR)) {
  fs.mkdirSync(QR_CODE_DIR, { recursive: true });
  console.log('✅ Created QR code directory.');
}

// Generate QR Code
const generateQRCode = async (advisorId) => {
  try {
    const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);
    const renderBackendURL = "https://qr-feedback-system-backend-czm2.onrender.com";
    const qrCodeURL = `${renderBackendURL}/qrcodes/${advisorId}.png`;

    await QRCode.toFile(qrCodePath, `${renderBackendURL}/feedback/${advisorId}`);
    return qrCodeURL;
  } catch (error) {
    console.error("❌ QR Code Generation Error:", error);
    return null;
  }
};

// ✅ Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existingAdvisor = await Advisor.findOne({ email });
    if (existingAdvisor) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdvisor = new Advisor({
      name,
      email,
      password: hashedPassword,
      role: role || 'advisor',
      performanceData: []
    });

    await newAdvisor.save();

    if (newAdvisor.role === "advisor") {
      newAdvisor.qrCode = await generateQRCode(newAdvisor._id);
      await newAdvisor.save();
    }

    res.status(201).json({
      message: 'User registered successfully',
      advisorId: newAdvisor._id,
      role: newAdvisor.role
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration', error });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const advisor = await Advisor.findOne({ email });
    if (!advisor) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, advisor.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const qrCodePath = path.join(QR_CODE_DIR, `${advisor._id}.png`);
    if (advisor.role === "advisor" && (!advisor.qrCode || !fs.existsSync(qrCodePath))) {
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
      role: advisor.role
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error during login', error });
  }
});

// ✅ MUST come before dynamic :id routes to avoid conflict
router.get('/details/:advisorId', authMiddleware, advisorMiddleware, async (req, res) => {
  try {
    const { advisorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(advisorId)) {
      return res.status(400).json({ message: 'Invalid Advisor ID format' });
    }

    const advisor = await Advisor.findById(advisorId).select('name email role');
    if (!advisor) {
      return res.status(404).json({ message: 'Advisor not found' });
    }

    res.status(200).json(advisor);
  } catch (error) {
    console.error('Fetch Advisor Info Error:', error);
    res.status(500).json({ message: 'Server error fetching advisor info' });
  }
});

// ✅ QR Code Fetch
router.get('/:advisorId/qrcode', authMiddleware, advisorMiddleware, async (req, res) => {
  try {
    const { advisorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(advisorId)) {
      return res.status(400).json({ message: 'Invalid Advisor ID format' });
    }

    const advisor = await Advisor.findById(advisorId);
    if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

    const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);
    if (!fs.existsSync(qrCodePath)) {
      advisor.qrCode = await generateQRCode(advisor._id);
      await advisor.save();
    }

    res.status(200).json({ qrCodeURL: advisor.qrCode });
  } catch (error) {
    console.error('QR Code Fetch Error:', error);
    res.status(500).json({ message: 'Error fetching QR Code', error });
  }
});

// ✅ Regenerate QR
router.post('/:advisorId/regenerate-qrcode', authMiddleware, advisorMiddleware, async (req, res) => {
  try {
    const { advisorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(advisorId)) {
      return res.status(400).json({ message: 'Invalid Advisor ID format' });
    }

    const advisor = await Advisor.findById(advisorId);
    if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

    advisor.qrCode = await generateQRCode(advisor._id);
    await advisor.save();

    res.status(200).json({ qrCodeURL: advisor.qrCode });
  } catch (error) {
    console.error("QR Code Regeneration Error:", error);
    res.status(500).json({ message: 'Error regenerating QR Code', error });
  }
});

// ✅ Individual Performance – now showing averages for each question
router.get('/performance/:advisorId', authMiddleware, advisorMiddleware, async (req, res) => {
    try {
      const { advisorId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(advisorId)) {
        return res.status(400).json({ message: 'Invalid Advisor ID format' });
      }
  
      const advisor = await Advisor.findById(advisorId);
      if (!advisor) return res.status(404).json({ message: 'Advisor not found' });
  
      const feedbackArray = advisor.performanceData || [];
  
      // Aggregate ratings for each question
      const total = {
        q1: 0, q2: 0, q3: 0, q4: 0, q5: 0
      };
  
      let count = 0;
      const comments = [];
  
      feedbackArray.forEach(fb => {
        if (fb.q1 && fb.q2 && fb.q3 && fb.q4 && fb.q5) {
          total.q1 += fb.q1;
          total.q2 += fb.q2;
          total.q3 += fb.q3;
          total.q4 += fb.q4;
          total.q5 += fb.q5;
          count++;
        }
        if (fb.q6) {
          comments.push(fb.q6);
        }
      });
  
      const average = {
        q1: count ? (total.q1 / count).toFixed(1) : "No data",
        q2: count ? (total.q2 / count).toFixed(1) : "No data",
        q3: count ? (total.q3 / count).toFixed(1) : "No data",
        q4: count ? (total.q4 / count).toFixed(1) : "No data",
        q5: count ? (total.q5 / count).toFixed(1) : "No data"
      };
  
      res.status(200).json({
        id: advisor._id.toString(),
        name: advisor.name,
        totalFeedback: count,
        averageRatings: average,
        comments: comments
      });
  
    } catch (error) {
      console.error("Performance Error:", error);
      res.status(500).json({ message: 'Error retrieving performance data', error: error.message });
    }
  });

// ✅ All Advisors (Manager)
router.get('/performance', authMiddleware, async (req, res) => {
  try {
    const advisors = await Advisor.find();

    const advisorPerformance = advisors.map(advisor => ({
      id: advisor._id.toString(),
      name: advisor.name,
      totalFeedback: advisor.performanceData.length,
      averageRating: advisor.performanceData.length > 0
        ? (advisor.performanceData.reduce((sum, f) => sum + (f.rating || 0), 0) / advisor.performanceData.length).toFixed(1)
        : "No ratings yet",
    }));

    res.status(200).json(advisorPerformance);
  } catch (error) {
    console.error("All Performance Error:", error);
    res.status(500).json({ message: 'Error retrieving all performance data', error: error.message });
  }
});

// ✅ Serve QR Codes
router.use('/qrcodes', express.static(QR_CODE_DIR));

module.exports = router;
