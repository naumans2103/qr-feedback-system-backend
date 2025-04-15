const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const Advisor = require('../models/Advisor');
const { authMiddleware, advisorMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const QR_CODE_DIR = path.join(__dirname, '../public/qrcodes');
const RENDER_BACKEND_URL = "https://qr-feedback-system-backend-czm2.onrender.com";

if (!fs.existsSync(QR_CODE_DIR)) {
  fs.mkdirSync(QR_CODE_DIR, { recursive: true });
  console.log('✅ QR code directory created.');
}

const generateQRCode = async (advisorId) => {
  try {
    const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);
    const qrCodeURL = `${RENDER_BACKEND_URL}/qrcodes/${advisorId}.png`;

    await QRCode.toFile(qrCodePath, `${RENDER_BACKEND_URL}/feedback/${advisorId}`);
    return qrCodeURL;
  } catch (error) {
    console.error("❌ QR Code Generation Error:", error);
    return null;
  }
};

// Register
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
    res.status(500).json({ message: 'Error registering user', error });
  }
});

// Login
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
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// QR Code Fetch
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

// Regenerate QR
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
    console.error("QR Regeneration Error:", error);
    res.status(500).json({ message: 'Error regenerating QR Code', error });
  }
});

// Serve QR codes
router.use('/qrcodes', express.static(QR_CODE_DIR));

module.exports = router;

// ✅ Serve QR Codes
router.use('/qrcodes', express.static(QR_CODE_DIR));

module.exports = router;
