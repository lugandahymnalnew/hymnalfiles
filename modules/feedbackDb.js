/**
 * Feedback Database Module
 * Handles CRUD operations for hymn feedback, general feedback, and replies
 */

const db = require('./mongoDBApi');
const { ObjectId } = require('mongodb');

const DB_NAME = 'newHymnal';
const HYMN_FEEDBACK_COLLECTION = 'hymnFeedback';
const GENERAL_FEEDBACK_COLLECTION = 'generalFeedback';
const FEEDBACK_REPLIES_COLLECTION = 'feedbackReplies';

/**
 * =====================
 * HYMN FEEDBACK
 * =====================
 */

/**
 * Get or create hymn feedback thread
 * @param {string} hymnNumber - The hymn number
 * @returns {Promise<Object>} - Hymn feedback document
 */
async function getHymnFeedback(hymnNumber) {
    const query = { hymnNumber: String(hymnNumber) };
    const result = await db.readRow(query, DB_NAME, HYMN_FEEDBACK_COLLECTION);

    if (result && result.found) {
        return result.listing;
    }

    // Create new hymn feedback thread
    const newFeedback = {
        hymnNumber: String(hymnNumber),
        issues: [],
        upvotes: [],
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await db.createListing(newFeedback, DB_NAME, HYMN_FEEDBACK_COLLECTION);
    return newFeedback;
}

/**
 * Add issue to hymn feedback
 * @param {string} hymnNumber - The hymn number
 * @param {Object} issue - Issue object { userId, userName, title, description, category, createdAt }
 * @returns {Promise<Object>} - Updated hymn feedback
 */
async function addHymnIssue(hymnNumber, issue) {
    const feedback = await getHymnFeedback(hymnNumber);

    const newIssue = {
        _id: new ObjectId().toString(),
        userId: issue.userId,
        userName: issue.userName,
        title: issue.title,
        description: issue.description,
        category: issue.category || 'error', // error, suggestion, correction
        upvotes: [],
        createdAt: new Date(),
        status: 'open' // open, in-progress, resolved
    };

    feedback.issues.push(newIssue);
    feedback.updatedAt = new Date();

    await db.updateRow(
        { hymnNumber: String(hymnNumber) },
        { issues: feedback.issues, updatedAt: feedback.updatedAt },
        DB_NAME,
        HYMN_FEEDBACK_COLLECTION
    );

    return feedback;
}

/**
 * Update hymn issue
 * @param {string} hymnNumber - The hymn number
 * @param {string} issueId - Issue ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated hymn feedback
 */
async function updateHymnIssue(hymnNumber, issueId, updates) {
    const feedback = await getHymnFeedback(hymnNumber);

    const issueIndex = feedback.issues.findIndex(i => i._id === issueId);
    if (issueIndex === -1) {
        throw new Error('Issue not found');
    }

    feedback.issues[issueIndex] = {
        ...feedback.issues[issueIndex],
        ...updates,
        updatedAt: new Date()
    };

    feedback.updatedAt = new Date();

    await db.updateRow(
        { hymnNumber: String(hymnNumber) },
        { issues: feedback.issues, updatedAt: feedback.updatedAt },
        DB_NAME,
        HYMN_FEEDBACK_COLLECTION
    );

    return feedback;
}

/**
 * Upvote hymn issue
 * @param {string} hymnNumber - The hymn number
 * @param {string} issueId - Issue ID
 * @param {string} userId - User ID casting upvote
 * @returns {Promise<Object>} - Updated hymn feedback
 */
async function upvoteHymnIssue(hymnNumber, issueId, userId) {
    const feedback = await getHymnFeedback(hymnNumber);

    const issue = feedback.issues.find(i => i._id === issueId);
    if (!issue) {
        throw new Error('Issue not found');
    }

    // Toggle upvote
    const upvoteIndex = issue.upvotes.indexOf(userId);
    if (upvoteIndex === -1) {
        issue.upvotes.push(userId);
    } else {
        issue.upvotes.splice(upvoteIndex, 1);
    }

    feedback.updatedAt = new Date();

    await db.updateRow(
        { hymnNumber: String(hymnNumber) },
        { issues: feedback.issues, updatedAt: feedback.updatedAt },
        DB_NAME,
        HYMN_FEEDBACK_COLLECTION
    );

    return feedback;
}

/**
 * Get all hymn feedback (for listing)
 * @returns {Promise<Array>} - List of hymn feedback
 */
async function getAllHymnFeedback() {
    const result = await db.readRows({}, DB_NAME, HYMN_FEEDBACK_COLLECTION);
    return result && result.listings ? result.listings : [];
}

/**
 * =====================
 * GENERAL FEEDBACK
 * =====================
 */

/**
 * Get all general feedback threads
 * @param {Object} filters - Optional filters { category, status }
 * @returns {Promise<Array>} - List of general feedback
 */
async function getGeneralFeedback(filters = {}) {
    const query = {};

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.status) {
        query.status = filters.status;
    }

    const result = await db.readRows(query, DB_NAME, GENERAL_FEEDBACK_COLLECTION);
    return result && result.listings ? result.listings : [];
}

/**
 * Get single general feedback thread
 * @param {string} id - Feedback ID
 * @returns {Promise<Object>} - General feedback document
 */
async function getGeneralFeedbackById(id) {
    const result = await db.readRow({ _id: new ObjectId(id) }, DB_NAME, GENERAL_FEEDBACK_COLLECTION);
    return result && result.found ? result.listing : null;
}

/**
 * Create new general feedback thread
 * @param {Object} feedback - Feedback object
 * @returns {Promise<Object>} - Created feedback
 */
async function createGeneralFeedback(feedback) {
    const newFeedback = {
        userId: feedback.userId,
        userName: feedback.userName,
        userEmail: feedback.userEmail,
        category: feedback.category || 'general', // general, bug, feature, other
        title: feedback.title,
        message: feedback.message,
        status: 'open', // open, in-progress, resolved, closed
        priority: feedback.priority || 'low', // low, medium, high
        upvotes: [feedback.userId], // Auto-upvote by creator
        views: 0,
        replyCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await db.createListing(newFeedback, DB_NAME, GENERAL_FEEDBACK_COLLECTION);
    return newFeedback;
}

/**
 * Update general feedback
 * @param {string} id - Feedback ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated feedback
 */
async function updateGeneralFeedback(id, updates) {
    const updateData = { ...updates, updatedAt: new Date() };

    await db.updateRow(
        { _id: new ObjectId(id) },
        updateData,
        DB_NAME,
        GENERAL_FEEDBACK_COLLECTION
    );

    return getGeneralFeedbackById(id);
}

/**
 * Delete general feedback
 * @param {string} id - Feedback ID
 * @returns {Promise<boolean>} - Success
 */
async function deleteGeneralFeedback(id) {
    const result = await db.deleteRow({ _id: new ObjectId(id) }, DB_NAME, GENERAL_FEEDBACK_COLLECTION);
    return !result.err;
}

/**
 * Upvote general feedback
 * @param {string} id - Feedback ID
 * @param {string} userId - User ID casting upvote
 * @returns {Promise<Object>} - Updated feedback
 */
async function upvoteGeneralFeedback(id, userId) {
    const feedback = await getGeneralFeedbackById(id);
    if (!feedback) {
        throw new Error('Feedback not found');
    }

    // Toggle upvote
    const upvoteIndex = feedback.upvotes.indexOf(userId);
    if (upvoteIndex === -1) {
        feedback.upvotes.push(userId);
    } else {
        feedback.upvotes.splice(upvoteIndex, 1);
    }

    feedback.updatedAt = new Date();

    await db.updateRow(
        { _id: new ObjectId(id) },
        { upvotes: feedback.upvotes, updatedAt: feedback.updatedAt },
        DB_NAME,
        GENERAL_FEEDBACK_COLLECTION
    );

    return feedback;
}

/**
 * Increment view count
 * @param {string} id - Feedback ID
 * @returns {Promise<Object>} - Updated feedback
 */
async function incrementGeneralViews(id) {
    const feedback = await getGeneralFeedbackById(id);
    if (!feedback) return null;

    feedback.views = (feedback.views || 0) + 1;

    await db.updateRow(
        { _id: new ObjectId(id) },
        { views: feedback.views },
        DB_NAME,
        GENERAL_FEEDBACK_COLLECTION
    );

    return feedback;
}

/**
 * =====================
 * FEEDBACK REPLIES
 * =====================
 */

/**
 * Get replies for a feedback thread
 * @param {string} feedbackId - General feedback ID
 * @returns {Promise<Array>} - List of replies
 */
async function getReplies(feedbackId) {
    const result = await db.readRows({ feedbackId }, DB_NAME, FEEDBACK_REPLIES_COLLECTION);
    return result && result.listings ? result.listings : [];
}

/**
 * Add reply to feedback
 * @param {string} feedbackId - General feedback ID
 * @param {Object} reply - Reply object { userId, userName, message, isInternal }
 * @returns {Promise<Object>} - Created reply
 */
async function addReply(feedbackId, reply) {
    const newReply = {
        feedbackId,
        userId: reply.userId,
        userName: reply.userName,
        message: reply.message,
        isInternal: reply.isInternal || false, // Internal admin notes
        createdAt: new Date()
    };

    await db.createListing(newReply, DB_NAME, FEEDBACK_REPLIES_COLLECTION);

    // Update reply count
    const feedback = await getGeneralFeedbackById(feedbackId);
    if (feedback) {
        await db.updateRow(
            { _id: new ObjectId(feedbackId) },
            { replyCount: (feedback.replyCount || 0) + 1, updatedAt: new Date() },
            DB_NAME,
            GENERAL_FEEDBACK_COLLECTION
        );
    }

    return newReply;
}

/**
 * Delete reply
 * @param {string} replyId - Reply ID
 * @returns {Promise<boolean>} - Success
 */
async function deleteReply(replyId) {
    const result = await db.deleteRow({ _id: new ObjectId(replyId) }, DB_NAME, FEEDBACK_REPLIES_COLLECTION);
    return !result.err;
}

/**
 * =====================
 * STATS & UTILS
 * =====================
 */

/**
 * Get feedback statistics
 * @returns {Promise<Object>} - Stats object
 */
async function getFeedbackStats() {
    const hymnFeedback = await db.readRows({}, DB_NAME, HYMN_FEEDBACK_COLLECTION);
    const generalFeedback = await db.readRows({}, DB_NAME, GENERAL_FEEDBACK_COLLECTION);
    const replies = await db.readRows({}, DB_NAME, FEEDBACK_REPLIES_COLLECTION);

    const hymnList = hymnFeedback && hymnFeedback.listings ? hymnFeedback.listings : [];
    const generalList = generalFeedback && generalFeedback.listings ? generalFeedback.listings : [];

    // Count issues by status
    let openIssues = 0;
    let resolvedIssues = 0;
    let totalUpvotes = 0;

    hymnList.forEach(hf => {
        hf.issues.forEach(issue => {
            if (issue.status === 'open') openIssues++;
            if (issue.status === 'resolved') resolvedIssues++;
            totalUpvotes += (issue.upvotes || []).length;
        });
    });

    generalList.forEach(gf => {
        totalUpvotes += (gf.upvotes || []).length;
    });

    return {
        hymnThreads: hymnList.length,
        generalThreads: generalList.length,
        totalIssues: openIssues + resolvedIssues,
        openIssues,
        resolvedIssues,
        totalUpvotes,
        totalReplies: (replies && replies.listings ? replies.listings.length : 0)
    };
}

/**
 * Get user's feedback submissions
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User's feedback
 */
async function getUserFeedback(userId) {
    const hymnResult = await db.readRows({}, DB_NAME, HYMN_FEEDBACK_COLLECTION);
    const generalResult = await db.readRows({ userId }, DB_NAME, GENERAL_FEEDBACK_COLLECTION);

    const hymnList = hymnResult && hymnResult.listings ? hymnResult.listings : [];
    const generalList = generalResult && generalResult.listings ? generalResult.listings : [];

    // Filter hymn feedback to only include user's issues
    const userHymnIssues = [];
    hymnList.forEach(hf => {
        const userIssues = hf.issues.filter(issue => issue.userId === userId);
        if (userIssues.length > 0) {
            userHymnIssues.push({
                hymnNumber: hf.hymnNumber,
                issues: userIssues
            });
        }
    });

    return {
        hymnIssues: userHymnIssues,
        generalFeedback: generalList
    };
}

module.exports = {
    // Hymn feedback
    getHymnFeedback,
    addHymnIssue,
    updateHymnIssue,
    upvoteHymnIssue,
    getAllHymnFeedback,

    // General feedback
    getGeneralFeedback,
    getGeneralFeedbackById,
    createGeneralFeedback,
    updateGeneralFeedback,
    deleteGeneralFeedback,
    upvoteGeneralFeedback,
    incrementGeneralViews,

    // Replies
    getReplies,
    addReply,
    deleteReply,

    // Stats
    getFeedbackStats,
    getUserFeedback
};
