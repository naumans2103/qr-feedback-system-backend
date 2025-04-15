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

// Function to Get Local IP Address Dynamically
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
const QR_CODE_DIR = path.join(__dirname, '../public/qrcodes');

// Ensure QR Codes Directory Exists
if (!fs.existsSync(QR_CODE_DIR)) {
    fs.mkdirSync(QR_CODE_DIR, { recursive: true });
    console.log('Created directory for storing QR codes.');
}

// Function to Generate QR Code with Updated IP
const generateQRCode = async (advisorId) => {
    try {
        const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);
        const qrCodeURL = `http://${LOCAL_IP}:5000/qrcodes/${advisorId}.png`;

        // Always regenerate QR Code to ensure the latest IP is used
        await QRCode.toFile(qrCodePath, `http://${LOCAL_IP}:5000/feedback/${advisorId}`);
        console.log(`Generated new QR Code for ${advisorId}: ${qrCodeURL}`);

        return qrCodeURL;
    } catch (error) {
        console.error("Error generating QR Code:", error);
        return null;
    }
};

// Register New Advisor
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

        // Generate and Save QR Code Only for Advisors
        if (newAdvisor.role === "advisor") {
            newAdvisor.qrCode = await generateQRCode(newAdvisor._id);
            await newAdvisor.save();
        }

        console.log("Manager/Advisor Registered:", { name, email, role });

        res.status(201).json({
            message: 'User registered successfully',
            advisorId: newAdvisor._id,
            role: newAdvisor.role
        });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user', error });
    }
});

// Advisor Login (Generate JWT)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const advisor = await Advisor.findOne({ email });
        if (!advisor) return res.status(400).json({ message: 'Invalid credentials' });

        console.log("🔍 Advisor Found:", advisor);

        const isMatch = await bcrypt.compare(password, advisor.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Ensure QR Code Exists for Advisors
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

        console.log("Token Generated:", token);
        console.log("Role Sent:", advisor.role);

        res.status(200).json({
            token,
            advisorId: advisor._id,
            role: advisor.role
        });

    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: 'Error logging in', error });
    }
});

// Fetch Advisor QR Code
router.get('/:advisorId/qrcode', authMiddleware, advisorMiddleware, async (req, res) => {
    try {
        const { advisorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(advisorId)) {
            return res.status(400).json({ message: 'Invalid Advisor ID format' });
        }

        const advisor = await Advisor.findById(advisorId);
        if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

        // Ensure QR Code Exists
        const qrCodePath = path.join(QR_CODE_DIR, `${advisorId}.png`);
        if (!fs.existsSync(qrCodePath)) {
            advisor.qrCode = await generateQRCode(advisor._id);
            await advisor.save();
        }

        res.status(200).json({ qrCodeURL: advisor.qrCode });

    } catch (error) {
        console.error('Error fetching QR Code:', error);
        res.status(500).json({ message: 'Error fetching QR Code', error });
    }
});

// Regenerate QR Code for an Advisor
router.post('/:advisorId/regenerate-qrcode', authMiddleware, advisorMiddleware, async (req, res) => {
    try {
        const { advisorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(advisorId)) {
            return res.status(400).json({ message: 'Invalid Advisor ID format' });
        }

        const advisor = await Advisor.findById(advisorId);
        if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

        // Generate a New QR Code
        advisor.qrCode = await generateQRCode(advisor._id);
        await advisor.save();

        res.status(200).json({ qrCodeURL: advisor.qrCode });

    } catch (error) {
        console.error("Error regenerating QR Code:", error);
        res.status(500).json({ message: 'Error regenerating QR Code', error });
    }
});

// Serve QR Codes as Static Files
router.use('/qrcodes', express.static(QR_CODE_DIR));

// Fetch Individual Advisor Performance Data 
router.get('/performance/:advisorId', authMiddleware, advisorMiddleware, async (req, res) => {
    try {
        const { advisorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(advisorId)) {
            return res.status(400).json({ message: 'Invalid Advisor ID format' });
        }

        const advisor = await Advisor.findById(advisorId);
        if (!advisor) {
            return res.status(404).json({ message: 'Advisor not found' });
        }

        // Ensure performanceData exists
        const feedback = advisor.performanceData || [];

        res.status(200).json({
            id: advisor._id.toString(),
            name: advisor.name,
            totalFeedback: feedback.length,
            averageRating: feedback.length > 0
                ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
                : "No ratings yet",
            feedback: feedback,
        });

    } catch (error) {
        console.error("Error retrieving performance data:", error);
        res.status(500).json({ message: 'Error retrieving performance data', error: error.message });
    }
});

// Fetch Performance Data for ALL Advisors (Manager Only)
router.get('/performance', authMiddleware, async (req, res) => {
    try {
        console.log("Fetching all advisors' performance data...");

        // Fetch all advisors from the database
        const advisors = await Advisor.find();

        if (!advisors || advisors.length === 0) {
            return res.status(404).json({ message: 'No advisors found' });
        }

        // Format Data for Manager Dashboard
        const advisorPerformance = advisors.map(advisor => ({
            id: advisor._id.toString(),
            name: advisor.name,
            totalFeedback: advisor.performanceData.length || 0,
            averageRating: advisor.performanceData.length > 0
                ? (advisor.performanceData.reduce((sum, f) => sum + (f.rating || 0), 0) / advisor.performanceData.length).toFixed(1)
                : "No ratings yet",
        }));

        res.status(200).json(advisorPerformance);

    } catch (error) {
        console.error("Error retrieving performance data for manager dashboard:", error);
        res.status(500).json({ message: 'Error retrieving performance data', error: error.message });
    }
});

module.exports = router;