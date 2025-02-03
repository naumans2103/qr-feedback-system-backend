const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Advisor = require('../models/Advisor');

const router = express.Router();

// ✅ Middleware to parse form data correctly
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// ✅ Serve the Feedback Form When Scanned
router.get('/:advisorId', async (req, res) => {
    try {
        const advisor = await Advisor.findById(req.params.advisorId);
        if (!advisor) return res.status(404).send('❌ Advisor not found');

        // ✅ Render a simple HTML form for feedback submission
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Feedback Form</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    form { display: inline-block; text-align: left; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                    button { background-color: blue; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h2>Leave Feedback for ${advisor.name}</h2>
                <form action="/api/feedback/submit/${advisor._id}" method="POST">
                    <label for="rating">Rating (1-5):</label>
                    <select name="rating" required>
                        <option value="" disabled selected>Select a rating</option>
                        <option value="1">1 - Poor</option>
                        <option value="2">2 - Fair</option>
                        <option value="3">3 - Good</option>
                        <option value="4">4 - Very Good</option>
                        <option value="5">5 - Excellent</option>
                    </select><br><br>

                    <label for="comment">Comments (Optional):</label><br>
                    <textarea name="comment" rows="4" cols="30"></textarea><br><br>

                    <button type="submit">Submit</button>
                </form>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("❌ Error loading feedback form:", error);
        res.status(500).send('❌ Server Error');
    }
});

// ✅ Handle Feedback Submission (POST Request)
router.post('/submit/:advisorId', async (req, res) => {
    try {
        const { advisorId } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(advisorId)) {
            return res.status(400).json({ message: '❌ Invalid Advisor ID format' });
        }

        const advisor = await Advisor.findById(advisorId);
        if (!advisor) {
            return res.status(404).json({ message: '❌ Advisor not found' });
        }

        // ✅ Ensure rating is valid
        const parsedRating = parseInt(rating, 10);
        if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ message: '❌ Rating is required and must be between 1 and 5' });
        }

        // ✅ Save Feedback Data
        const newFeedback = {
            date: new Date(),
            rating: parsedRating, // ✅ Ensure rating is stored as a number
            comments: comment || '', // ✅ Store comment if available
        };

        // ✅ Ensure feedback array exists before pushing
        if (!Array.isArray(advisor.performanceData)) {
            advisor.performanceData = [];
        }

        advisor.performanceData.push(newFeedback);
        await advisor.save();

        console.log("✅ Feedback submitted successfully");

        res.send(`
            <h3>✅ Thank You for Your Feedback!</h3>
            <p>Your response has been recorded successfully.</p>
        `);
    } catch (error) {
        console.error('❌ Feedback Submission Error:', error);
        res.status(500).json({ message: '❌ Error submitting feedback', error });
    }
});

module.exports = router;