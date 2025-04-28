const mongoose = require('mongoose');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Advisor = require('./models/Advisor');

// ----------------------------------------------
// Setup Render URL and QR code directory
// ----------------------------------------------
const BACKEND_URL = `https://qr-feedback-system-backend-1.onrender.com`; // Your Render backend URL
const QR_CODE_DIR = path.join(__dirname, 'public/qrcodes');

// Ensure QR code output directory exists
if (!fs.existsSync(QR_CODE_DIR)) {
  fs.mkdirSync(QR_CODE_DIR, { recursive: true });
  console.log('Created QR code directory');
}

// ----------------------------------------------
// Generate QR codes for all advisors
// ----------------------------------------------
(async () => {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Fetch all advisors from the database
    const advisors = await Advisor.find();

    for (const advisor of advisors) {
      const advisorId = advisor._id.toString();

      // Create the URL the QR code should point to
      const feedbackURL = `${BACKEND_URL}/api/feedback/${advisorId}`;

      // Create the file path where the QR code image will be saved
      const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);

      // Create the URL to be stored in advisor.qrCode field
      const qrCodeImageURL = `/public/qrcodes/${advisorId}.png`; // Just the relative path

      // Generate and save the QR Code PNG file
      await QRCode.toFile(qrCodePath, feedbackURL);

      // Update advisor with the new QR code path
      advisor.qrCode = qrCodeImageURL;
      await advisor.save();

      console.log(`🎯 QR code updated for ${advisor.name}: ${qrCodeImageURL}`);
    }

    console.log('🎉 All advisor QR codes regenerated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to generate QR codes:', error);
    process.exit(1);
  }
})();