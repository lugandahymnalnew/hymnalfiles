/**
 * Read-only query layer over bible.db (SQLite, built by scripts/generate-bible-db.js).
 * Uses Node's built-in node:sqlite — synchronous, no native dependency to install.
 */
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'bible.db');

let db = null;

function getDb() {
    if (db) return db;
    if (!fs.existsSync(DB_PATH)) {
        throw new Error('bible.db not found — run: node scripts/generate-bible-db.js');
    }
    db = new DatabaseSync(DB_PATH, { readOnly: true });
    return db;
}

/**
 * All 66 books in canonical order, grouped by testament.
 */
function getBooks() {
    return getDb().prepare('SELECT id, name, slug, testament, book_order FROM books ORDER BY book_order').all();
}

function getBookBySlug(slug) {
    return getDb().prepare('SELECT id, name, slug, testament, book_order FROM books WHERE slug = ?').get(slug) || null;
}

/**
 * Chapter numbers available for a book, in order.
 */
function getChapterList(slug) {
    const book = getBookBySlug(slug);
    if (!book) return null;
    const rows = getDb().prepare('SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter').all(book.id);
    return { book, chapters: rows.map((r) => r.chapter) };
}

/**
 * All verses in a single chapter, in order.
 */
function getChapter(slug, chapter) {
    const book = getBookBySlug(slug);
    if (!book) return null;
    const verses = getDb()
        .prepare('SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse')
        .all(book.id, chapter);
    if (verses.length === 0) return null;
    return { book, chapter: Number(chapter), verses };
}

/**
 * Single verse, or an inclusive verse range within one chapter.
 */
function getVerses(slug, chapter, startVerse, endVerse) {
    const book = getBookBySlug(slug);
    if (!book) return null;
    const end = endVerse || startVerse;
    const verses = getDb()
        .prepare('SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse')
        .all(book.id, chapter, startVerse, end);
    if (verses.length === 0) return null;
    return { book, chapter: Number(chapter), verses };
}

/**
 * Full-text search across all verses. Query is sanitized into an FTS5 phrase
 * match so raw user input can't break the MATCH syntax.
 */
function search(query, limit = 30) {
    const cleaned = String(query || '').trim();
    if (!cleaned) return [];

    // Treat the whole query as a single phrase match, escaping embedded quotes.
    const ftsQuery = '"' + cleaned.replace(/"/g, '""') + '"';

    return getDb()
        .prepare(`
            SELECT b.name AS bookName, b.slug AS bookSlug, v.chapter, v.verse,
                   snippet(verses_fts, 0, '<mark>', '</mark>', '…', 10) AS snippet
            FROM verses_fts
            JOIN verses v ON v.id = verses_fts.rowid
            JOIN books b ON b.id = v.book_id
            WHERE verses_fts MATCH ?
            ORDER BY b.book_order, v.chapter, v.verse
            LIMIT ?
        `)
        .all(ftsQuery, limit);
}

module.exports = {
    getBooks,
    getBookBySlug,
    getChapterList,
    getChapter,
    getVerses,
    search
};
