// w1947632 Nauman Shaikh //
const mongoose = require('mongoose');

// Feedback schema: Represents a single feedback submission
const FeedbackSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  customerName: {
    type: String,
  },
  q1: { type: Number }, // Personal Attention
  q2: { type: Number }, // Professionalism & Demeanor
  q3: { type: Number }, // Product Knowledge
  q4: { type: Number }, // Understanding Needs
  q5: { type: Number }, // Overall Satisfaction
  comment: {
    type: String,
  },
});

// Advisor schema: Used for both advisors and managers
const AdvisorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensures no duplicate emails
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['advisor', 'manager'],
    default: 'advisor', // Default role is advisor
  },
  qrCode: {
    type: String, // Can be a URL or base64 string
  },
  performanceData: [FeedbackSchema], // Embedded list of feedback entries
});

module.exports = mongoose.model('Advisor', AdvisorSchema);