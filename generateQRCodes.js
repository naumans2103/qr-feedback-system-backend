const mongoose = require('mongoose');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const Advisor = require('./models/Advisor');

// ----------------------------------------------
// Get local IP for dynamic QR code generation
// ----------------------------------------------
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }

  return '127.0.0.1';
}

// ----------------------------------------------
// Setup environment-dependent URLs and paths
// ----------------------------------------------
const LOCAL_IP = getLocalIP();
const PORT = process.env.PORT || 5000;
const LOCAL_BACKEND_URL = `http://${LOCAL_IP}:${PORT}`;
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
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Fetch all advisors from the database
    const advisors = await Advisor.find();

    for (const advisor of advisors) {
      const advisorId = advisor._id.toString();
      const feedbackURL = `${LOCAL_BACKEND_URL}/api/feedback/${advisorId}`;
      const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);
      const qrCodeImageURL = `${LOCAL_BACKEND_URL}/qrcodes/${advisorId}.png`;

      // Generate QR Code PNG file
      await QRCode.toFile(qrCodePath, feedbackURL);

      // Save QR Code URL to advisor in DB
      advisor.qrCode = qrCodeImageURL;
      await advisor.save();

      console.log(`QR code updated for ${advisor.name}: ${qrCodeImageURL}`);
    }

    console.log('All QR codes regenerated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to generate QR codes:', error);
    process.exit(1);
  }
})();