/**
 * Feedback Forum Frontend Utility
 * Handles API interactions for the feedback system
 */

(function() {
    const API_BASE = '/api/feedback';

    /**
     * Get all hymn feedback threads
     */
    async function getHymnFeedback() {
        const response = await fetch(`${API_BASE}/hymns`);
        const data = await response.json();
        return data.success ? data.data : [];
    }

    /**
     * Get single hymn feedback
     * @param {string} hymnNumber
     */
    async function getHymnFeedbackByNumber(hymnNumber) {
        const response = await fetch(`${API_BASE}/hymn/${hymnNumber}`);
        const data = await response.json();
        return data.success ? data.data : null;
    }

    /**
     * Add issue to hymn feedback
     * @param {string} hymnNumber
     * @param {Object} issue - { title, description, category }
     */
    async function addHymnIssue(hymnNumber, issue) {
        const response = await auth.apiRequest(`${API_BASE}/hymn/${hymnNumber}/issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issue)
        });
        const data = await response.json();
        return { success: data.success, data: data.data, error: data.message };
    }

    /**
     * Upvote hymn issue
     * @param {string} hymnNumber
     * @param {string} issueId
     */
    async function upvoteHymnIssue(hymnNumber, issueId) {
        const response = await auth.apiRequest(`${API_BASE}/hymn/${hymnNumber}/issue/${issueId}/upvote`, {
            method: 'POST'
        });
        const data = await response.json();
        return { success: data.success, data: data.data, error: data.message };
    }

    /**
     * Get all general feedback
     * @param {Object} filters - { category, status }
     */
    async function getGeneralFeedback(filters = {}) {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_BASE}/general?${params}`);
        const data = await response.json();
        return data.success ? data.data : [];
    }

    /**
     * Get single general feedback with replies
     * @param {string} id
     */
    async function getGeneralFeedbackById(id) {
        const response = await fetch(`${API_BASE}/general/${id}`);
        const data = await response.json();
        return data.success ? data.data : null;
    }

    /**
     * Create general feedback
     * @param {Object} feedback - { title, message, category, priority }
     */
    async function createGeneralFeedback(feedback) {
        const response = await auth.apiRequest(`${API_BASE}/general/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedback)
        });
        const data = await response.json();
        return { success: data.success, data: data.data, error: data.message };
    }

    /**
     * Add reply to general feedback
     * @param {string} feedbackId
     * @param {Object} reply - { message, isInternal }
     */
    async function addReply(feedbackId, reply) {
        const response = await auth.apiRequest(`${API_BASE}/general/${feedbackId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reply)
        });
        const data = await response.json();
        return { success: data.success, data: data.data, error: data.message };
    }

    /**
     * Upvote general feedback
     * @param {string} id
     */
    async function upvoteGeneralFeedback(id) {
        const response = await auth.apiRequest(`${API_BASE}/general/${id}/upvote`, {
            method: 'POST'
        });
        const data = await response.json();
        return { success: data.success, data: data.data, error: data.message };
    }

    /**
     * Get user's feedback submissions
     */
    async function getMyFeedback() {
        const response = await auth.apiRequest(`${API_BASE}/my-feedback`);
        const data = await response.json();
        return data.success ? data.data : null;
    }

    /**
     * Get feedback statistics (admin only)
     */
    async function getFeedbackStats() {
        const response = await auth.apiRequest(`${API_BASE}/admin/stats`);
        const data = await response.json();
        return data.success ? data.data : null;
    }

    /**
     * Update general feedback status (admin only)
     * @param {string} id
     * @param {Object} updates - { status, priority }
     */
    async function updateGeneralFeedback(id, updates) {
        const response = await auth.apiRequest(`${API_BASE}/general/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const data = await response.json();
        return { success: data.success, data: data.data, error: data.message };
    }

    /**
     * Update hymn issue status (admin only)
     * @param {string} hymnNumber
     * @param {string} issueId
     * @param {Object} updates - { status }
     */
    async function updateHymnIssue(hymnNumber, issueId, updates) {
        const response = await auth.apiRequest(`${API_BASE}/hymn/${hymnNumber}/issue/${issueId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const data = await response.json();
        return { success: data.success, data: data.data, error: data.message };
    }

    /**
     * Format relative time (e.g., "2 days ago")
     * @param {Date|string} date
     */
    function formatRelativeTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }

    /**
     * Open feedback from hymn page (B4A integration)
     * Called from Android app via WebView
     * @param {string} hymnNumber
     */
    function openHymnFeedback(hymnNumber) {
        window.location.href = `/feedback/hymn/${hymnNumber}`;
    }

    /**
     * Open create feedback form pre-filled for hymn
     * Called from Android app
     * @param {string} hymnNumber
     * @param {string} errorContext - Optional error context from app
     */
    function reportHymnError(hymnNumber, errorContext) {
        const url = `/feedback/create?type=hymn&hymnNumber=${hymnNumber}`;
        window.location.href = url;
    }

    // Expose public API
    window.feedback = {
        getHymnFeedback,
        getHymnFeedbackByNumber,
        addHymnIssue,
        upvoteHymnIssue,
        getGeneralFeedback,
        getGeneralFeedbackById,
        createGeneralFeedback,
        addReply,
        upvoteGeneralFeedback,
        getMyFeedback,
        getFeedbackStats,
        updateGeneralFeedback,
        updateHymnIssue,
        formatRelativeTime,
        openHymnFeedback,
        reportHymnError
    };

    // Auto-initialize for hymn pages
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on a hymn page and add feedback link
        const urlParams = new URLSearchParams(window.location.search);
        const songNumber = urlParams.get('song');

        if (songNumber) {
            // Could add a feedback button to hymn pages dynamically
            console.log('Hymn page detected:', songNumber);
        }
    });

})();
