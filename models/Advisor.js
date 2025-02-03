const mongoose = require('mongoose');

const AdvisorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['advisor', 'manager'], default: 'advisor' }, // ✅ ADD THIS
    qrCode: { type: String },  
    performanceData: [{
        date: { type: Date, default: Date.now },
        rating: { type: Number },
        comments: [{ type: String }]
    }]
});

module.exports = mongoose.model('Advisor', AdvisorSchema);