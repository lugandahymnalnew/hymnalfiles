const express = require('express');
const auth = require('../middleWares/auth');
const songEditDb = require('../modules/songEditDb');
const { PERMISSIONS } = require('../modules/roleAccess');

const route = express.Router();
const jsonBody = express.json({ limit: '100kb' });

const editorRead = [auth.requireAuth, auth.requirePermission(PERMISSIONS.SONG_EDITS_READ)];
const editorSubmit = [auth.requireAuth, auth.requirePermission(PERMISSIONS.SONG_EDITS_SUBMIT)];
const editorReview = [auth.requireAuth, auth.requirePermission(PERMISSIONS.SONG_EDITS_REVIEW)];

route.get('/song-editor/:number', editorRead, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, data: await songEditDb.getHymnPair(req.params.number) });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
});

route.post('/song-edits', jsonBody, editorSubmit, async (req, res) => {
    try {
        const proposal = await songEditDb.createProposal(req.body || {}, req.user);
        res.status(201).json({
            success: true,
            data: proposal,
            message: 'Your correction has been queued for review.'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

route.get('/admin/song-edits', editorReview, async (req, res) => {
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

route.post('/admin/song-edits/:id/approve', jsonBody, editorReview, async (req, res) => {
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

route.post('/admin/song-edits/:id/reject', jsonBody, editorReview, async (req, res) => {
    try {
        const proposal = await songEditDb.rejectProposal(req.params.id, req.user, req.body && req.body.note);
        res.json({ success: true, data: proposal, message: 'The correction was rejected.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = route;
