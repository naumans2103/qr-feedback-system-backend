const mongoose = require('mongoose');

// Schema for individual feedback entry
const FeedbackSchema = new mongoose.Schema({
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advisor',
    required: true,
  },
  q1: {
    type: Number,
    required: true,
  },
  q2: {
    type: Number,
    required: true,
  },
  q3: {
    type: Number,
    required: true,
  },
  q4: {
    type: Number,
    required: true,
  },
  q5: {
    type: Number,
    required: true,
  },
  comment: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Feedback', FeedbackSchema);