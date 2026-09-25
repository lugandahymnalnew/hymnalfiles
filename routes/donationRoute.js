/**
 * Donation Routes
 *
 * Public:
 *   GET  /api/donations/summary      goal, raised, percent, donor wall
 *   POST /api/donations/report       a donor says "I gave" (pending until approved)
 *
 * Admin (JWT, approved admin):
 *   GET    /api/admin/donations            list (?status=pending|approved|rejected&page=)
 *   POST   /api/admin/donations            record a donation (created approved)
 *   PATCH  /api/admin/donations/:id        approve / reject / edit
 *   DELETE /api/admin/donations/:id        remove
 *   GET    /api/admin/donations/settings   goal + already-raised + FX rates
 *   PUT    /api/admin/donations/settings   update the progress numbers
 *
 * Mounted at "/api" in app.js.
 */

const express = require('express');
const cors = require('cors');
const donationDb = require('../modules/donationDb');
const auth = require('../middleWares/auth');

const donationRoute = express.Router();
// Parsed per route (not router-wide) so this router, mounted at /api, never
// touches the body of anyone else's requests.
const jsonBody = express.json({ limit: '20kb' });

// The Android app loads its pages from file:///android_asset, so its requests
// arrive with a null origin. Only the two public donor endpoints are opened to
// it; the admin endpoints stay same-origin.
const publicCors = cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] });
donationRoute.options('/donations/*', publicCors);

// --- tiny in-memory throttle for the public "I donated" form ---------------
// Enough to stop a script from flooding the pending queue; resets on restart.
const REPORT_LIMIT = 5;
const REPORT_WINDOW_MS = 60 * 60 * 1000;
const reportHits = new Map();

function throttled(ip) {
    const now = Date.now();
    const hits = (reportHits.get(ip) || []).filter((t) => now - t < REPORT_WINDOW_MS);
    if (hits.length >= REPORT_LIMIT) {
        reportHits.set(ip, hits);
        return true;
    }
    hits.push(now);
    reportHits.set(ip, hits);
    if (reportHits.size > 5000) { reportHits.clear(); }
    return false;
}

function adminName(req) {
    return (req.user && (req.user.userName || req.user.email)) || 'admin';
}

// ---------------------------------------------------------------- public ----

donationRoute.get('/donations/summary', publicCors, async (_req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=60');
        res.json({ success: true, data: await donationDb.getSummary() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

donationRoute.post('/donations/report', publicCors, jsonBody, async (req, res) => {
    try {
        const body = req.body || {};
        // Honeypot: real people never fill this hidden field.
        if (body.website) {
            return res.json({ success: true, message: 'Thank you!' });
        }
        if (throttled(req.ip)) {
            return res.status(429).json({ success: false, message: 'Too many reports from this connection. Please try again later.' });
        }
        await donationDb.addDonation(body, { source: 'self', approved: false });
        res.status(201).json({
            success: true,
            message: 'Thank you! Your gift will show in the progress bar once it has been confirmed.'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ----------------------------------------------------------------- admin ----

const adminOnly = [auth.requireAuth, auth.requireAdmin];

donationRoute.get('/admin/donations/settings', adminOnly, async (_req, res) => {
    try {
        res.json({ success: true, data: await donationDb.getSettings() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

donationRoute.put('/admin/donations/settings', adminOnly, jsonBody, async (req, res) => {
    try {
        const saved = await donationDb.saveSettings(req.body || {}, adminName(req));
        res.json({ success: true, data: saved, summary: await donationDb.getSummary() });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

donationRoute.get('/admin/donations', adminOnly, async (req, res) => {
    try {
        const data = await donationDb.listDonations({
            status: req.query.status,
            page: req.query.page,
            pageSize: 25
        });
        res.json({ success: true, data, summary: await donationDb.getSummary() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

donationRoute.post('/admin/donations', adminOnly, jsonBody, async (req, res) => {
    try {
        const doc = await donationDb.addDonation(req.body || {}, {
            source: 'admin',
            approved: true,
            adminName: adminName(req)
        });
        res.status(201).json({ success: true, data: doc, summary: await donationDb.getSummary() });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

donationRoute.patch('/admin/donations/:id', adminOnly, jsonBody, async (req, res) => {
    try {
        const updated = await donationDb.updateDonation(req.params.id, req.body || {}, adminName(req));
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }
        res.json({ success: true, data: updated, summary: await donationDb.getSummary() });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

donationRoute.delete('/admin/donations/:id', adminOnly, async (req, res) => {
    try {
        await donationDb.deleteDonation(req.params.id);
        res.json({ success: true, summary: await donationDb.getSummary() });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = donationRoute;
