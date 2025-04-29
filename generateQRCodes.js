// w1947632 Nauman Shaikh //
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Advisor = require('./models/Advisor');

// ------------------------------------------
// Configuration
// ------------------------------------------

// Base URL for feedback links (use your Render backend)
const BACKEND_URL = 'https://qr-feedback-system-backend-1.onrender.com';

// Directory to store generated QR codes
const QR_CODE_DIR = path.join(__dirname, 'public/qrcodes');

// Ensure the QR code output directory exists
if (!fs.existsSync(QR_CODE_DIR)) {
  fs.mkdirSync(QR_CODE_DIR, { recursive: true });
  console.log('📁 Created QR code directory.');
}

// ------------------------------------------
// Main Script
// ------------------------------------------

(async () => {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Fetch all advisors from database
    const advisors = await Advisor.find();
    console.log(`Found ${advisors.length} advisors.`);

    for (const advisor of advisors) {
      const advisorId = advisor._id.toString();

      // URL the QR code will point to
      const feedbackURL = `${BACKEND_URL}/api/feedback/${advisorId}`;

      // Path where QR code image will be saved
      const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);

      // Relative URL stored in database
      const qrCodeImageURL = `/public/qrcodes/${advisorId}.png`;

      // Generate and save the QR Code PNG
      await QRCode.toFile(qrCodePath, feedbackURL);

      // Update advisor's QR code path in database
      advisor.qrCode = qrCodeImageURL;
      await advisor.save();

      console.log(`QR code updated for ${advisor.name} -> ${qrCodeImageURL}`);
    }

    console.log('All advisor QR codes regenerated successfully!');
    process.exit(0); // Exit successfully
  } catch (error) {
    console.error('Failed to generate QR codes:', error);
    process.exit(1); // Exit with failure
  }
})();