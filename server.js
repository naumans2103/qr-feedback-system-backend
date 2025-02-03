const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const fs = require('fs');
const QRCode = require('qrcode');
const Advisor = require('./models/Advisor');

const app = express();

// ✅ Import Routes
const advisorRoutes = require('./routes/advisorRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// ✅ Get Local IP Address Dynamically
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let iface of Object.values(interfaces)) {
        for (let config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
                return config.address;
            }
        }
    }
    return '127.0.0.1';
}

const LOCAL_IP = getLocalIP();
const PORT = process.env.PORT || 5000;

// ✅ Connect to MongoDB
connectDB();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// ✅ Ensure QR Codes Directory Exists
const QR_CODE_DIR = path.join(__dirname, 'public/qrcodes');
if (!fs.existsSync(QR_CODE_DIR)) {
    fs.mkdirSync(QR_CODE_DIR, { recursive: true });
    console.log('✅ Created directory for storing QR codes.');
}

// ✅ Serve Static Files for QR Codes Properly
app.use('/qrcodes', express.static(QR_CODE_DIR, {
    setHeaders: (res, filePath) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31557600');
    }
}));

// ✅ Generate QR Code for an Advisor
const generateQRCode = async (advisorId) => {
    try {
        const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);
        const qrCodeURL = `https://qr-feedback-system-backend.onrender.com/feedback/${advisorId}`;

        if (!fs.existsSync(qrCodePath)) {
            await QRCode.toFile(qrCodePath, qrCodeURL);
        }

        console.log(`✅ QR Code Generated for Advisor ${advisorId}: ${qrCodeURL}`);
        return `https://qr-feedback-system-backend.onrender.com/qrcodes/${advisorId}.png`;
    } catch (error) {
        console.error("❌ Error generating QR Code:", error);
        return null;
    }
};

// ✅ Submit Feedback Form API (Customers will use this)
app.post('/submit-feedback', bodyParser.urlencoded({ extended: true }), async (req, res) => {
    try {
        const { advisorId, rating, comments } = req.body;

        if (!advisorId || !rating) {
            return res.status(400).json({ message: 'Advisor ID and rating are required' });
        }

        const advisor = await Advisor.findById(advisorId);
        if (!advisor) {
            return res.status(404).json({ message: 'Advisor not found' });
        }

        // ✅ Store the feedback in advisor's performanceData
        advisor.performanceData.push({ rating: parseInt(rating), comments, date: new Date() });
        await advisor.save();

        console.log(`✅ Feedback submitted for ${advisor.name}: Rating - ${rating}`);
        res.send(`
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted successfully.</p>
            <p>You may now close this page.</p>
        `);
    } catch (error) {
        console.error('❌ Error submitting feedback:', error);
        res.status(500).json({ message: 'Error submitting feedback', error });
    }
});

// ✅ Feedback Form Page (Opens when customer scans QR Code)
app.get('/feedback/:advisorId', async (req, res) => {
    try {
        const { advisorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(advisorId)) {
            return res.status(400).json({ message: 'Invalid Advisor ID format' });
        }

        const advisor = await Advisor.findById(advisorId);
        if (!advisor) {
            return res.status(404).json({ message: 'Advisor not found' });
        }

        res.send(`
            <html>
            <head>
                <title>Feedback for ${advisor.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    form { display: inline-block; text-align: left; width: 300px; }
                    label { font-weight: bold; display: block; margin-top: 10px; }
                    input, textarea { width: 100%; padding: 8px; margin: 5px 0; }
                    button { background-color: #28a745; color: white; padding: 10px; border: none; cursor: pointer; width: 100%; }
                    button:hover { background-color: #218838; }
                </style>
            </head>
            <body>
                <h2>Provide Feedback for ${advisor.name}</h2>
                <form action="/submit-feedback" method="POST" enctype="application/x-www-form-urlencoded">
                    <input type="hidden" name="advisorId" value="${advisor._id}" />
                    
                    <label for="rating">Rate the Service (1-5):</label>
                    <input type="number" name="rating" min="1" max="5" required />

                    <label for="comments">Optional Comments:</label>
                    <textarea name="comments" placeholder="Write your feedback here..."></textarea>

                    <button type="submit">Submit Feedback</button>
                </form>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('❌ Error fetching feedback page:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// ✅ Root API Check
app.get('/', (req, res) => {
    res.send('✅ API is running...');
});

// ✅ Apply Routes for Advisors & Feedback
app.use('/api/advisors', advisorRoutes);
app.use('/api/feedback', feedbackRoutes);

// ✅ Start the Server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ MongoDB Connected...`);
    console.log(`🚀 Server running on http://${LOCAL_IP}:${PORT}`);
});