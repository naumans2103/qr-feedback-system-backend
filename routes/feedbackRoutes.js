// w1947632 Nauman Shaikh //
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Advisor = require('../models/Advisor');

const router = express.Router();

// Middleware: Parse URL-encoded and JSON request bodies
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

/**
 * @route   GET /api/feedback/:advisorId
 * @desc    Render the feedback form HTML for a specific advisor
 */
router.get('/:advisorId', async (req, res) => {
  try {
    const advisor = await Advisor.findById(req.params.advisorId);
    if (!advisor) return res.status(404).send('Advisor not found');

    // Render feedback form as HTML
    const formHTML = generateFeedbackForm(advisor.name, advisor._id);
    res.send(formHTML);
  } catch (error) {
    console.error('Error loading feedback form:', error);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST /api/feedback/submit/:advisorId
 * @desc    Save the submitted feedback to the advisor's record
 */
router.post('/submit/:advisorId', async (req, res) => {
  try {
    const { advisorId } = req.params;
    const { q1, q2, q3, q4, q5, comment, customerName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(advisorId)) {
      return res.status(400).json({ message: 'Invalid Advisor ID format' });
    }

    const advisor = await Advisor.findById(advisorId);
    if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

    // Construct feedback entry
    const feedbackEntry = {
      date: new Date(),
      customerName: customerName || 'Anonymous',
      q1: parseInt(q1),
      q2: parseInt(q2),
      q3: parseInt(q3),
      q4: parseInt(q4),
      q5: parseInt(q5),
      comment: comment || '',
    };

    advisor.performanceData.push(feedbackEntry);
    await advisor.save();

    console.log(`✅ Feedback submitted for ${advisor.name}`);

    // Return thank-you confirmation page
    res.send(generateThankYouPage());
  } catch (error) {
    console.error('Feedback Submission Error:', error);
    res.status(500).json({ message: 'Error submitting feedback', error });
  }
});

module.exports = router;

// --------------------------------
// Helper: HTML Feedback Form Page
// --------------------------------
function generateFeedbackForm(advisorName, advisorId) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Client Advisor Feedback</title>
      <style>
        /* [Your existing styles here] */
      </style>
      <script>
        function validateForm() {
          const name = document.forms[0]["customerName"].value.trim();
          const agreement = document.forms[0]["agree"].checked;

          if (!name) {
            alert("Please enter your name.");
            return false;
          }

          if (!agreement) {
            alert("You must agree to the terms and conditions before submitting.");
            return false;
          }

          return true;
        }
      </script>
    </head>
    <body>
      <h2>Leave Feedback for</h2>
      <div class="subtext">${advisorName}</div>
      <form action="/api/feedback/submit/${advisorId}" method="POST" onsubmit="return validateForm()">
        <label>Your Name:</label>
        <input type="text" name="customerName" required placeholder="e.g. John Smith" />
        ${generateLikertQuestions()}
        <label>6. Additional Comments (Optional):</label>
        <textarea name="comment" rows="4" placeholder="Your comments..."></textarea>
        <div class="checkbox-group">
          <input type="checkbox" name="agree" />
          <span>I agree to the confidentiality terms of this feedback.</span>
        </div>
        <button type="submit">Submit Feedback</button>
      </form>
    </body>
    </html>
  `;
}

// --------------------------------------
// Helper: Generate Likert scale questions
// --------------------------------------
function generateLikertQuestions() {
  const questions = [
    "How satisfied were you with the level of personal attention you received?",
    "How would you rate the Client Advisor’s professionalism and demeanor?",
    "Did the Client Advisor demonstrate expert product knowledge and recommendations?",
    "How well did the Client Advisor understand your needs and preferences?",
    "Overall, how satisfied were you with your experience with the Client Advisor?"
  ];

  return questions.map((q, i) => `
    <label>${i + 1}. ${q}</label>
    <div class="likert">
      ${[1, 2, 3, 4, 5].map(n => `
        <label><input type="radio" name="q${i + 1}" value="${n}" required> ${n}</label>
      `).join('')}
    </div>
  `).join('');
}

// --------------------------------------
// Helper: Thank-You Confirmation Page
// --------------------------------------
function generateThankYouPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Thank You</title>
      <style>
        body {
          background-color: #f5f5f5;
          font-family: 'Helvetica Neue', sans-serif;
          color: #111;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .box {
          background-color: #fff;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
        }
        h1 { font-size: 32px; margin-bottom: 16px; }
        p { font-size: 16px; margin: 6px 0; color: #444; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>Thank you!</h1>
        <p>Your feedback has been successfully recorded.</p>
        <p>You may close the page now.</p>
      </div>
    </body>
    </html>
  `;
}