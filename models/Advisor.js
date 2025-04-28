const mongoose = require('mongoose');

// Schema for individual performance feedback entry
const FeedbackSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  customerName: {
    type: String,
  },
  q1: {
    type: Number,
  },
  q2: {
    type: Number,
  },
  q3: {
    type: Number,
  },
  q4: {
    type: Number,
  },
  q5: {
    type: Number,
  },
  comment: {
    type: String,
  },
});

// Schema for advisor or manager
const AdvisorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Prevent duplicate emails
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['advisor', 'manager'],
    default: 'advisor',
  },
  qrCode: {
    type: String, // URL or base64-encoded image
  },
  performanceData: [FeedbackSchema], // Embedded feedback entries
});

module.exports = mongoose.model('Advisor', AdvisorSchema);