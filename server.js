// w1947632 Nauman Shaikh //
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const os = require('os');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const advisorRoutes = require('./routes/advisorRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();

// ----------------------------
// Utility: Get Local IP Address
// ----------------------------
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

const LOCAL_IP = getLocalIP();
const PORT = process.env.PORT || 5000;

console.log(`Local IP Address: ${LOCAL_IP}`);
console.log(`Backend will run at: http://${LOCAL_IP}:${PORT}`);

// ----------------------------
// Database Connection
// ----------------------------
connectDB();

// ----------------------------
// Middleware Setup
// ----------------------------
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ----------------------------
// Static Files: QR Codes
// ----------------------------
const QR_CODE_DIR = path.join(__dirname, 'public/qrcodes');

if (!fs.existsSync(QR_CODE_DIR)) {
  fs.mkdirSync(QR_CODE_DIR, { recursive: true });
  console.log('QR code directory created.');
}

app.use('/public/qrcodes', express.static(QR_CODE_DIR, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=31557600'); // Cache static files for 1 year
  },
}));

// ----------------------------
// Health Check Endpoint
// ----------------------------
app.get('/', (req, res) => {
  res.send('API is running successfully.');
});

// ----------------------------
// API Routes
// ----------------------------
app.use('/api/advisors', advisorRoutes);
app.use('/api/feedback', feedbackRoutes);

// ----------------------------
// Start Server
// ----------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server live at: http://${LOCAL_IP}:${PORT}`);
});