/**
 * Feedback View Routes (EJS)
 * Renders feedback pages
 */

const express = require('express');
const path = require('path');
const { ObjectId } = require('mongodb');

const feedbackViewRoute = express.Router();

// Use static files from public directory
feedbackViewRoute.use(express.static(path.join(__dirname, '../public')));

const db = require('../modules/mongoDBApi');
const feedbackDb = require('../modules/feedbackDb');

// GET /feedback - Forum listing page
feedbackViewRoute.get('/feedback', async (req, res) => {
    try {
        const hymnFeedback = await feedbackDb.getAllHymnFeedback();
        const generalFeedback = await feedbackDb.getGeneralFeedback();

        // Attach user if logged in
        let user = null;
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                const { verifyAccessToken } = require('../modules/jwtAuth');
                const decoded = verifyAccessToken(token);
                if (decoded) {
                    const userResult = await db.readRow({ _id: new ObjectId(decoded.sub) }, 'newHymnal', 'users');
                    if (userResult && userResult.found) {
                        user = userResult.listing;
                    }
                }
            }
        } catch (e) {
            // Not logged in, that's ok
        }

        res.render('feedback/index', {
            hymnFeedback,
            generalFeedback,
            user
        });
    } catch (error) {
        res.render('error', { error: error.message });
    }
});

// GET /feedback/hymn/:number - Single hymn feedback view
feedbackViewRoute.get('/feedback/hymn/:number', async (req, res) => {
    try {
        const feedback = await feedbackDb.getHymnFeedback(req.params.number);

        res.render('feedback/hymn-detail', { feedback });
    } catch (error) {
        res.render('error', { error: error.message });
    }
});

// GET /feedback/general/:id - Single general feedback view
feedbackViewRoute.get('/feedback/general/:id', async (req, res) => {
    try {
        const feedback = await feedbackDb.getGeneralFeedbackById(req.params.id);

        res.render('feedback/general-detail', { feedback });
    } catch (error) {
        res.render('error', { error: error.message });
    }
});

// GET /feedback/create - Create feedback form
feedbackViewRoute.get('/feedback/create', async (req, res) => {
    try {
        const type = req.query.type || 'general';
        const hymnNumber = req.query.hymnNumber || '';

        res.render('feedback/create', { type, hymnNumber });
    } catch (error) {
        res.render('error', { error: error.message });
    }
});

// GET /feedback/my-feedback - User's feedback submissions
feedbackViewRoute.get('/feedback/my-feedback', async (req, res) => {
    try {
        // Get user from token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.redirect('/login?redirect=/feedback/my-feedback');
        }

        const { verifyAccessToken } = require('../modules/jwtAuth');
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return res.redirect('/login?redirect=/feedback/my-feedback');
        }

        const userFeedback = await feedbackDb.getUserFeedback(String(decoded.sub));

        res.render('feedback/my-feedback', { userFeedback });
    } catch (error) {
        res.render('error', { error: error.message });
    }
});

module.exports = feedbackViewRoute;
