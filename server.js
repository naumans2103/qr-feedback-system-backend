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

// -----------------------------------
// Utility: Get local IPv4 address
// -----------------------------------
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
console.log(`Backend running on: http://${LOCAL_IP}:${PORT}`);

// -----------------------------------
// Connect to MongoDB
// -----------------------------------
connectDB();

// -----------------------------------
// Middleware
// -----------------------------------
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// -----------------------------------
// Serve static QR code images
// -----------------------------------
const QR_CODE_DIR = path.join(__dirname, 'public/qrcodes');

if (!fs.existsSync(QR_CODE_DIR)) {
  fs.mkdirSync(QR_CODE_DIR, { recursive: true });
  console.log('Created QR code directory');
}

app.use('/qrcodes', express.static(QR_CODE_DIR, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=31557600'); // 1 year cache
  }
}));

// -----------------------------------
// Health check endpoint
// -----------------------------------
app.get('/', (req, res) => {
  res.send(`API is running Successfully.`);
});

// -----------------------------------
// Routes
// -----------------------------------
app.use('/api/advisors', advisorRoutes);
app.use('/api/feedback', feedbackRoutes);

// -----------------------------------
// Start the server
// -----------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is live at http://${LOCAL_IP}:${PORT}`);
});