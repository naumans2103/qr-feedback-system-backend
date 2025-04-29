// w1947632 Nauman Shaikh //
const mongoose = require('mongoose');

// Schema for a single feedback entry (linked to an advisor)
const FeedbackSchema = new mongoose.Schema({
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advisor',
    required: true, // Must be associated with a valid advisor
  },
  // Feedback ratings (required fields)
  q1: { type: Number, required: true }, // Personal Attention
  q2: { type: Number, required: true }, // Professionalism
  q3: { type: Number, required: true }, // Product Knowledge
  q4: { type: Number, required: true }, // Understanding Needs
  q5: { type: Number, required: true }, // Overall Satisfaction
  // Optional comment field from the customer
  comment: {
    type: String,
  },
  // Timestamp of when feedback was submitted
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the Feedback model
module.exports = mongoose.model('Feedback', FeedbackSchema);