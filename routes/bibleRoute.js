/**
 * Bible API routes — read-only, backed by bible.db (SQLite).
 */
const express = require('express');
const bibleDb = require('../modules/bibleDb');

const bibleRoute = express.Router();

// GET /api/bible/books - list all 66 books, grouped by testament
bibleRoute.get('/books', (req, res) => {
    try {
        const books = bibleDb.getBooks();
        res.json({
            success: true,
            data: {
                oldTestament: books.filter((b) => b.testament === 'OT'),
                newTestament: books.filter((b) => b.testament === 'NT')
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/bible/search?q=... - full-text search across all verses
bibleRoute.get('/search', (req, res) => {
    try {
        const { q, limit } = req.query;
        if (!q || !q.trim()) {
            return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
        }
        const results = bibleDb.search(q, Math.min(Number(limit) || 30, 100));
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Search failed. Try a simpler query.' });
    }
});

// GET /api/bible/:book - list chapter numbers available for a book
bibleRoute.get('/:book', (req, res) => {
    try {
        const result = bibleDb.getChapterList(req.params.book);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/bible/:book/:chapter - full chapter text
bibleRoute.get('/:book/:chapter', (req, res) => {
    try {
        const chapter = Number(req.params.chapter);
        if (!Number.isInteger(chapter) || chapter < 1) {
            return res.status(400).json({ success: false, message: 'Invalid chapter number' });
        }
        const result = bibleDb.getChapter(req.params.book, chapter);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Chapter not found' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/bible/:book/:chapter/:verse - single verse, or a range like 16-18
bibleRoute.get('/:book/:chapter/:verse', (req, res) => {
    try {
        const chapter = Number(req.params.chapter);
        const [startRaw, endRaw] = String(req.params.verse).split('-');
        const startVerse = Number(startRaw);
        const endVerse = endRaw ? Number(endRaw) : startVerse;

        if (!Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(startVerse) || startVerse < 1 || !Number.isInteger(endVerse) || endVerse < startVerse) {
            return res.status(400).json({ success: false, message: 'Invalid chapter/verse reference' });
        }
        if (endVerse - startVerse > 50) {
            return res.status(400).json({ success: false, message: 'Verse range too large (max 50 verses)' });
        }

        const result = bibleDb.getVerses(req.params.book, chapter, startVerse, endVerse);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Verse not found' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = bibleRoute;
