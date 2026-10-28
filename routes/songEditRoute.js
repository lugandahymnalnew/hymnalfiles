const express = require('express');
const auth = require('../middleWares/auth');
const songEditDb = require('../modules/songEditDb');

const route = express.Router();
const jsonBody = express.json({ limit: '100kb' });

const ANON_LIMIT = 6;
const ANON_WINDOW_MS = 60 * 60 * 1000;
const anonymousHits = new Map();

function rejectAnonymousFlood(req, res, next) {
    if (req.user) {
        return next();
    }
    const now = Date.now();
    const key = req.ip || 'unknown';
    const hits = (anonymousHits.get(key) || []).filter((time) => now - time < ANON_WINDOW_MS);
    if (hits.length >= ANON_LIMIT) {
        anonymousHits.set(key, hits);
        return res.status(429).json({ success: false, message: 'Too many anonymous edit proposals from this connection. Please sign in or try again later.' });
    }
    hits.push(now);
    anonymousHits.set(key, hits);
    if (anonymousHits.size > 5000) {
        anonymousHits.clear();
    }
    next();
}

route.get('/song-editor/:number', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, data: await songEditDb.getHymnPair(req.params.number) });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
});

route.post('/song-edits', jsonBody, auth.attachUserIfPresent, rejectAnonymousFlood, async (req, res) => {
    try {
        const proposal = await songEditDb.createProposal(req.body || {}, req.user || null);
        res.status(201).json({
            success: true,
            data: proposal,
            message: req.user
                ? 'Your correction has been queued for review.'
                : 'Your correction has been queued for review as Anonymous.'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

const adminOnly = [auth.requireAuth, auth.requireAdmin];

route.get('/admin/song-edits', adminOnly, async (req, res) => {
    try {
        const data = await songEditDb.listProposals({
            status: req.query.status,
            page: req.query.page,
            pageSize: 20
        });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

route.post('/admin/song-edits/:id/approve', jsonBody, adminOnly, async (req, res) => {
    try {
        const proposal = await songEditDb.approveProposal(req.params.id, req.user, req.body && req.body.note);
        const status = proposal.status === 'conflict' ? 409 : 200;
        res.status(status).json({
            success: proposal.status === 'approved',
            data: proposal,
            message: proposal.status === 'conflict'
                ? 'The live hymn changed after this proposal was submitted. Review the conflicts before retrying.'
                : 'The correction was applied to the hymn database.'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

route.post('/admin/song-edits/:id/reject', jsonBody, adminOnly, async (req, res) => {
    try {
        const proposal = await songEditDb.rejectProposal(req.params.id, req.user, req.body && req.body.note);
        res.json({ success: true, data: proposal, message: 'The correction was rejected.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = route;
