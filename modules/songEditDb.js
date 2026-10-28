const { ObjectId } = require('mongodb');
const db = require('./mongoDBApi');
const roleAccess = require('./roleAccess');

const EDIT_DB = 'newHymnal';
const EDIT_COLLECTION = 'songEdits';
const HYMN_DB = 'lugandaHymnal';

const LUGANDA_FIELDS = new Set([
    'song', 'EngTit', 'EngNo', 'An', 'composer', 'doh', 'signUp', 'signDown'
]);

function cleanNumber(value) {
    const number = String(value || '').trim();
    if (!/^\d{1,3}[a-z]?$/i.test(number)) {
        throw new Error('Choose a valid main-hymnal number.');
    }
    return number;
}

function cleanText(value, maxLength, allowBold) {
    if (typeof value !== 'string') {
        throw new Error('Every edited value must be text.');
    }
    const text = value.replace(/\r\n?/g, '\n').trim();
    if (text.length > maxLength) {
        throw new Error(`An edited value is longer than ${maxLength} characters.`);
    }
    const tags = text.match(/<[^>]*>/g) || [];
    const hasUnsupportedTag = tags.some((tag) => !allowBold || !/^<\/?b>$/i.test(tag));
    if (hasUnsupportedTag) {
        throw new Error(allowBold
            ? 'Only the exact <b> and </b> emphasis markers are allowed in lyrics.'
            : 'HTML is not allowed in this field.');
    }
    return text;
}

function getAtPath(object, pathParts) {
    let value = object;
    for (const part of pathParts) {
        if (value === null || value === undefined) {
            return undefined;
        }
        value = value[part];
    }
    return value;
}

function targetForPath(path, luganda, english) {
    const parts = String(path || '').split('.');
    const language = parts.shift();

    if (language === 'luganda' && parts.length === 1 && LUGANDA_FIELDS.has(parts[0])) {
        return { language, collection: 'luganda', mongoPath: parts[0], current: luganda ? luganda[parts[0]] : undefined, kind: 'field' };
    }

    if (language === 'english' && parts.length === 1 && parts[0] === 'title') {
        return { language, collection: 'english', mongoPath: 'title', current: english ? english.title : undefined, kind: 'field' };
    }

    const lyricRoot = language === 'luganda' ? 'lyrics' : language === 'english' ? 'english' : null;
    const document = language === 'luganda' ? luganda : language === 'english' ? english : null;
    if (!lyricRoot || !document || parts.length !== 3 || parts[0] !== lyricRoot) {
        return null;
    }

    const section = parts[1];
    const index = Number(parts[2]);
    const sectionLines = document[lyricRoot] && document[lyricRoot][section];
    if (!Array.isArray(sectionLines) || !Number.isInteger(index) || index < 0 || index >= sectionLines.length) {
        return null;
    }

    return {
        language,
        collection: language,
        mongoPath: `${lyricRoot}.${section}.${index}`,
        current: getAtPath(document, [lyricRoot, section, index]),
        kind: 'line',
        section,
        index
    };
}

async function getHymnPair(numberValue) {
    const number = cleanNumber(numberValue);
    const [lugandaResult, englishResult] = await Promise.all([
        db.readRow({ number }, HYMN_DB, 'luganda'),
        db.readRow({ number }, HYMN_DB, 'english')
    ]);

    const luganda = lugandaResult && lugandaResult.found ? lugandaResult.listing : null;
    const english = englishResult && englishResult.found ? englishResult.listing : null;
    if (!luganda && !english) {
        throw new Error(`Hymn ${number} was not found.`);
    }

    return {
        number,
        luganda,
        english,
        suggestedEnglishTitle: (english && english.title) || (luganda && luganda.EngTit) || ''
    };
}

async function createProposal(input, actor) {
    if (!roleAccess.hasPermission(actor, roleAccess.PERMISSIONS.SONG_EDITS_SUBMIT)) {
        throw new Error('The songEdits:submit permission is required to submit hymn edits.');
    }
    const pair = await getHymnPair(input.number);
    const incoming = Array.isArray(input.changes) ? input.changes : [];
    if (!incoming.length || incoming.length > 80) {
        throw new Error('Submit between 1 and 80 changed fields or lyric lines.');
    }

    const seen = new Set();
    const changes = [];
    for (const item of incoming) {
        const path = String(item && item.path || '').trim();
        if (!path || seen.has(path)) {
            continue;
        }
        seen.add(path);

        const target = targetForPath(path, pair.luganda, pair.english);
        if (!target) {
            throw new Error(`The edit target "${path}" is not valid for hymn ${pair.number}.`);
        }

        const to = cleanText(item.to, target.kind === 'line' ? 1000 : 250, target.kind === 'line');
        const from = target.current === undefined || target.current === null ? '' : String(target.current);
        if (to === from) {
            continue;
        }
        if (target.kind === 'line' && !to) {
            throw new Error('A lyric line cannot be empty. Suggest a replacement instead.');
        }
        if (target.kind === 'field' && ['song', 'EngTit', 'title'].includes(target.mongoPath) && !to) {
            throw new Error('A hymn title cannot be empty.');
        }

        changes.push({
            path,
            language: target.language,
            field: target.mongoPath,
            kind: target.kind,
            section: target.section || null,
            line: Number.isInteger(target.index) ? target.index : null,
            from,
            to
        });
    }

    if (!changes.length) {
        throw new Error('Nothing changed. Edit at least one field or lyric line.');
    }

    const now = new Date();
    const proposal = {
        _id: new ObjectId(),
        hymnNumber: pair.number,
        hymnTitle: pair.luganda ? pair.luganda.song : pair.suggestedEnglishTitle,
        changes,
        note: cleanText(String(input.note || ''), 1000),
        status: 'pending',
        submittedBy: actor._id ? String(actor._id) : null,
        submittedByName: actor.userName || actor.email || 'Editor',
        createdAt: now,
        updatedAt: now,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: ''
    };

    await db.createListing(proposal, EDIT_DB, EDIT_COLLECTION);
    return proposal;
}

async function listProposals({ status, page, pageSize } = {}) {
    const filter = {};
    if (['pending', 'approved', 'rejected', 'conflict'].includes(status)) {
        filter.status = status;
    }
    const result = await db.readRowsPaged(filter, EDIT_DB, EDIT_COLLECTION, page || 1, pageSize || 20, { createdAt: -1 });
    return {
        items: result && Array.isArray(result.listings) ? result.listings : [],
        total: result ? result.total : 0,
        page: Math.max(1, parseInt(page, 10) || 1),
        pageSize: Math.max(1, parseInt(pageSize, 10) || 20)
    };
}

async function getProposal(id) {
    if (!ObjectId.isValid(id)) {
        return null;
    }
    const result = await db.readRow({ _id: new ObjectId(id) }, EDIT_DB, EDIT_COLLECTION);
    return result && result.found ? result.listing : null;
}

async function markProposal(id, updates) {
    await db.updateRow({ _id: new ObjectId(id) }, { ...updates, updatedAt: new Date() }, EDIT_DB, EDIT_COLLECTION);
    return getProposal(id);
}

async function approveProposal(id, reviewer, reviewNote) {
    const proposal = await getProposal(id);
    if (!proposal) {
        throw new Error('Edit proposal not found.');
    }
    if (proposal.status !== 'pending' && proposal.status !== 'conflict') {
        throw new Error(`This proposal is already ${proposal.status}.`);
    }

    const pair = await getHymnPair(proposal.hymnNumber);
    const conflicts = [];
    const grouped = { luganda: {}, english: {} };

    for (const change of proposal.changes) {
        const target = targetForPath(change.path, pair.luganda, pair.english);
        const current = target && target.current !== undefined && target.current !== null ? String(target.current) : '';
        if (!target || current !== String(change.from)) {
            conflicts.push({ path: change.path, expected: change.from, current });
            continue;
        }
        grouped[target.collection][target.mongoPath] = change.to;
    }

    const reviewerName = reviewer && (reviewer.userName || reviewer.email) ? (reviewer.userName || reviewer.email) : 'admin';
    if (conflicts.length) {
        return markProposal(id, {
            status: 'conflict',
            conflicts,
            reviewedBy: reviewerName,
            reviewedAt: new Date(),
            reviewNote: cleanText(String(reviewNote || ''), 1000)
        });
    }

    for (const collection of ['luganda', 'english']) {
        const updates = grouped[collection];
        if (Object.keys(updates).length) {
            updates.updatedAt = new Date();
            const result = await db.updateRow({ number: proposal.hymnNumber }, updates, HYMN_DB, collection);
            if (!result || result.err || result.updated !== 1) {
                throw new Error(`Could not update the ${collection} hymn record.`);
            }
        }
    }

    return markProposal(id, {
        status: 'approved',
        conflicts: [],
        reviewedBy: reviewerName,
        reviewedAt: new Date(),
        reviewNote: cleanText(String(reviewNote || ''), 1000)
    });
}

async function rejectProposal(id, reviewer, reviewNote) {
    const proposal = await getProposal(id);
    if (!proposal) {
        throw new Error('Edit proposal not found.');
    }
    if (proposal.status === 'approved') {
        throw new Error('An approved proposal cannot be rejected.');
    }
    const reviewerName = reviewer && (reviewer.userName || reviewer.email) ? (reviewer.userName || reviewer.email) : 'admin';
    return markProposal(id, {
        status: 'rejected',
        reviewedBy: reviewerName,
        reviewedAt: new Date(),
        reviewNote: cleanText(String(reviewNote || ''), 1000)
    });
}

module.exports = {
    cleanNumber,
    getHymnPair,
    createProposal,
    listProposals,
    getProposal,
    approveProposal,
    rejectProposal,
    targetForPath
};
