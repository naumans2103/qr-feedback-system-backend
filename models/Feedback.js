const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    advisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advisor', required: true },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);