/**
 * Feedback Routes
 * API endpoints for hymn feedback, general feedback, and replies
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../modules/mongoDBApi');
const feedbackDb = require('../modules/feedbackDb');
const auth = require('../middleWares/auth');

const feedbackRoute = express();

// Middleware
feedbackRoute.use(express.json());
feedbackRoute.use(express.urlencoded({ extended: true }));

/**
 * =====================
 * HYMN FEEDBACK ROUTES
 * =====================
 */

// GET /api/feedback/hymns - Get all hymn feedback threads
feedbackRoute.get('/hymns', async (req, res) => {
    try {
        const hymnFeedback = await feedbackDb.getAllHymnFeedback();
        res.json({ success: true, data: hymnFeedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/feedback/hymn/:number - Get single hymn feedback thread
feedbackRoute.get('/hymn/:number', async (req, res) => {
    try {
        const feedback = await feedbackDb.getHymnFeedback(req.params.number);
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/feedback/hymn/:number/issue - Add issue to hymn (requires auth)
feedbackRoute.post('/hymn/:number/issue', auth.requireAuth, async (req, res) => {
    try {
        const { title, description, category } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        const issue = {
            userId: String(req.user._id),
            userName: req.user.userName,
            title,
            description,
            category: category || 'error'
        };

        const feedback = await feedbackDb.addHymnIssue(req.params.number, issue);
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/feedback/hymn/:number/issue/:id - Update hymn issue (admin only)
feedbackRoute.put('/hymn/:number/issue/:id', auth.requireAuth, auth.requireAdmin, async (req, res) => {
    try {
        const { status, title, description } = req.body;

        const updates = {};
        if (status) updates.status = status;
        if (title) updates.title = title;
        if (description) updates.description = description;

        const feedback = await feedbackDb.updateHymnIssue(
            req.params.number,
            req.params.id,
            updates
        );

        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/feedback/hymn/:number/issue/:id/upvote - Upvote hymn issue (requires auth)
feedbackRoute.post('/hymn/:number/issue/:id/upvote', auth.requireAuth, async (req, res) => {
    try {
        const feedback = await feedbackDb.upvoteHymnIssue(
            req.params.number,
            req.params.id,
            String(req.user._id)
        );
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * =====================
 * GENERAL FEEDBACK ROUTES
 * =====================
 */

// GET /api/feedback/general - Get all general feedback (with filters)
feedbackRoute.get('/general', async (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            status: req.query.status
        };

        const feedback = await feedbackDb.getGeneralFeedback(filters);
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/feedback/general/:id - Get single general feedback thread
feedbackRoute.get('/general/:id', async (req, res) => {
    try {
        const feedback = await feedbackDb.getGeneralFeedbackById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        // Increment view count
        await feedbackDb.incrementGeneralViews(req.params.id);

        // Get replies
        const replies = await feedbackDb.getReplies(req.params.id);

        res.json({
            success: true,
            data: { ...feedback, replies }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/feedback/general/new - Create new general feedback (requires auth)
feedbackRoute.post('/general/new', auth.requireAuth, async (req, res) => {
    try {
        const { category, title, message, priority } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required'
            });
        }

        const feedback = {
            userId: String(req.user._id),
            userName: req.user.userName,
            userEmail: req.user.email,
            category: category || 'general',
            title,
            message,
            priority: priority || 'low'
        };

        const result = await feedbackDb.createGeneralFeedback(feedback);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/feedback/general/:id/reply - Add reply to feedback (requires auth)
feedbackRoute.post('/general/:id/reply', auth.requireAuth, async (req, res) => {
    try {
        const { message, isInternal } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Only admins can post internal notes
        const isActuallyInternal = isInternal === true && req.user.role === 'admin';

        const reply = {
            userId: String(req.user._id),
            userName: req.user.userName,
            message,
            isInternal: isActuallyInternal
        };

        const result = await feedbackDb.addReply(req.params.id, reply);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/feedback/general/:id/upvote - Upvote general feedback (requires auth)
feedbackRoute.post('/general/:id/upvote', auth.requireAuth, async (req, res) => {
    try {
        const feedback = await feedbackDb.upvoteGeneralFeedback(
            req.params.id,
            String(req.user._id)
        );
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/feedback/general/:id - Update general feedback (admin only)
feedbackRoute.put('/general/:id', auth.requireAuth, auth.requireAdmin, async (req, res) => {
    try {
        const { status, priority, title, message } = req.body;

        const updates = {};
        if (status) updates.status = status;
        if (priority) updates.priority = priority;
        if (title) updates.title = title;
        if (message) updates.message = message;

        const result = await feedbackDb.updateGeneralFeedback(req.params.id, updates);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/feedback/general/:id - Delete general feedback (admin only)
feedbackRoute.delete('/general/:id', auth.requireAuth, auth.requireAdmin, async (req, res) => {
    try {
        await feedbackDb.deleteGeneralFeedback(req.params.id);
        res.json({ success: true, message: 'Feedback deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/feedback/reply/:id - Delete reply (admin only)
feedbackRoute.delete('/reply/:id', auth.requireAuth, auth.requireAdmin, async (req, res) => {
    try {
        await feedbackDb.deleteReply(req.params.id);
        res.json({ success: true, message: 'Reply deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * =====================
 * USER & STATS ROUTES
 * =====================
 */

// GET /api/feedback/my-feedback - Get user's feedback submissions (requires auth)
feedbackRoute.get('/my-feedback', auth.requireAuth, async (req, res) => {
    try {
        const userFeedback = await feedbackDb.getUserFeedback(String(req.user._id));
        res.json({ success: true, data: userFeedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/feedback/admin/stats - Get feedback statistics (admin only)
feedbackRoute.get('/admin/stats', auth.requireAuth, auth.requireAdmin, async (req, res) => {
    try {
        const stats = await feedbackDb.getFeedbackStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = feedbackRoute;
