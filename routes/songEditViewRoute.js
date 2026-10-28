const express = require('express');

const route = express.Router();

route.get('/hymns/:number/edit', (req, res) => {
    res.render('song-editor', { hymnNumber: req.params.number });
});

route.get('/admin/song-edits', (_req, res) => {
    res.render('song-edits-admin');
});

module.exports = route;
