const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Advisor = require('../models/Advisor');

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Serve the Feedback Form
router.get('/:advisorId', async (req, res) => {
    try {
        const advisor = await Advisor.findById(req.params.advisorId);
        if (!advisor) return res.status(404).send('Advisor not found');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>Client Advisor Feedback</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                    form { display: inline-block; text-align: left; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
                    label { font-weight: bold; display: block; margin-top: 10px; }
                    select, textarea { width: 100%; margin-top: 5px; padding: 6px; }
                    button { margin-top: 20px; padding: 10px 20px; background-color: black; color: white; border: none; border-radius: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h2>Leave Feedback for ${advisor.name}</h2>
                <form action="/api/feedback/submit/${advisor._id}" method="POST">

                    <label>1. How satisfied were you with the level of personal attention you received?</label>
                    <select name="q1" required>
                        <option value="">Select a rating</option>
                        ${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>

                    <label>2. How would you rate the Client Advisor’s professionalism and demeanor?</label>
                    <select name="q2" required>
                        <option value="">Select a rating</option>
                        ${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>

                    <label>3. Did the Client Advisor demonstrate expert product knowledge and recommendations?</label>
                    <select name="q3" required>
                        <option value="">Select a rating</option>
                        ${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>

                    <label>4. How well did the Client Advisor understand your needs and preferences?</label>
                    <select name="q4" required>
                        <option value="">Select a rating</option>
                        ${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>

                    <label>5. Overall, how satisfied were you with your experience with the Client Advisor?</label>
                    <select name="q5" required>
                        <option value="">Select a rating</option>
                        ${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>

                    <label>6. Please leave any additional comments, suggestions, or feedback for the Client Advisor (optional):</label>
                    <textarea name="comment" rows="4"></textarea>

                    <button type="submit">Submit Feedback</button>
                </form>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("Error loading feedback form:", error);
        res.status(500).send('Server Error');
    }
});

// Handle Feedback Submission
router.post('/submit/:advisorId', async (req, res) => {
    try {
        const { advisorId } = req.params;
        const { q1, q2, q3, q4, q5, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(advisorId)) {
            return res.status(400).json({ message: 'Invalid Advisor ID format' });
        }

        const advisor = await Advisor.findById(advisorId);
        if (!advisor) return res.status(404).json({ message: 'Advisor not found' });

        const feedbackEntry = {
            date: new Date(),
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
        res.send(`
            <h3>Thank You!</h3>
            <p>Your feedback has been successfully recorded.</p>
        `);
    } catch (error) {
        console.error('Feedback Submission Error:', error);
        res.status(500).json({ message: 'Error submitting feedback', error });
    }
});

module.exports = router;
