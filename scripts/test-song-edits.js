const assert = require('assert');
const path = require('path');

const dbPath = require.resolve('../modules/mongoDBApi');

const hymns = {
    luganda: {
        '1': {
            number: '1',
            song: "Gw'oli Mutukuvi",
            EngTit: 'Holy, Holy, Holy',
            EngNo: 'CH 73',
            An: '',
            composer: 'John B.Dykes',
            doh: 'Doh is E',
            signUp: '4',
            signDown: '4',
            lyrics: { 'stanza 1': ["Gw'oli mutukuvu", 'Buli ku nkya'] }
        }
    },
    english: {
        '1': {
            number: '1',
            english: { 'stanza 1': ['Holy, holy, holy!', 'Early in the morning'] }
        }
    }
};

const proposals = new Map();

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function setPath(target, dottedPath, value) {
    const parts = dottedPath.split('.');
    let cursor = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
        cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
}

const mockDb = {
    async readRow(filter, dbName, collection) {
        if (dbName === 'lugandaHymnal') {
            const item = hymns[collection] && hymns[collection][filter.number];
            return { found: !!item, err: false, listing: clone(item) || null };
        }
        const id = filter._id && String(filter._id);
        const item = proposals.get(id);
        return { found: !!item, err: false, listing: clone(item) || null };
    },
    async createListing(document) {
        proposals.set(String(document._id), clone(document));
    },
    async readRowsPaged(filter, _dbName, _collection, page, pageSize) {
        const items = Array.from(proposals.values()).filter((item) => !filter.status || item.status === filter.status);
        return { listings: clone(items), total: items.length, found: !!items.length, err: false, page, pageSize };
    },
    async updateRow(filter, updates, dbName, collection) {
        if (dbName === 'lugandaHymnal') {
            const item = hymns[collection] && hymns[collection][filter.number];
            if (!item) return { updated: 0, err: false };
            Object.entries(updates).forEach(([key, value]) => setPath(item, key, value));
            return { updated: 1, err: false };
        }
        const id = String(filter._id);
        const proposal = proposals.get(id);
        if (!proposal) return { updated: 0, err: false };
        Object.assign(proposal, clone(updates));
        proposals.set(id, proposal);
        return { updated: 1, err: false };
    }
};

require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mockDb };
const songEditDb = require('../modules/songEditDb');

(async function run() {
    const proposal = await songEditDb.createProposal({
        number: '1',
        changes: [
            { path: 'luganda.song', to: "Gw'oli Mutukuvu" },
            { path: 'english.english.stanza 1.1', to: 'Early in the morning our song shall rise' }
        ],
        note: 'Spelling and a missing phrase.'
    }, null);

    assert.strictEqual(proposal.status, 'pending');
    assert.strictEqual(proposal.submittedByName, 'Anonymous');
    assert.strictEqual(proposal.changes.length, 2);
    assert.strictEqual(proposal.changes[0].from, "Gw'oli Mutukuvi");

    const approved = await songEditDb.approveProposal(String(proposal._id), { userName: 'reviewer' }, 'Checked');
    assert.strictEqual(approved.status, 'approved');
    assert.strictEqual(hymns.luganda['1'].song, "Gw'oli Mutukuvu");
    assert.strictEqual(hymns.english['1'].english['stanza 1'][1], 'Early in the morning our song shall rise');

    const stale = await songEditDb.createProposal({
        number: '1',
        changes: [{ path: 'luganda.lyrics.stanza 1.0', to: "Gw'oli ddala mutukuvu" }]
    }, { _id: 'user-1', userName: 'Singer' });
    hymns.luganda['1'].lyrics['stanza 1'][0] = 'Someone already changed this line';
    const conflicted = await songEditDb.approveProposal(String(stale._id), { userName: 'reviewer' }, 'Retry needed');
    assert.strictEqual(conflicted.status, 'conflict');
    assert.strictEqual(conflicted.conflicts.length, 1);

    await assert.rejects(
        songEditDb.createProposal({ number: '1', changes: [{ path: 'luganda.unknown', to: 'No' }] }, null),
        /not valid/
    );
    await assert.rejects(
        songEditDb.createProposal({ number: '1', changes: [{ path: 'luganda.song', to: '<b>Unsafe title</b>' }] }, null),
        /HTML is not allowed/
    );
    await assert.rejects(
        songEditDb.createProposal({
            number: '1',
            changes: [{ path: 'luganda.lyrics.stanza 1.1', to: '<b onclick="alert(1)">Unsafe lyric</b>' }]
        }, null),
        /exact <b>/
    );
    const emphasized = await songEditDb.createProposal({
        number: '1',
        changes: [{ path: 'luganda.lyrics.stanza 1.1', to: '<b>Mutukuvu</b>' }]
    }, null);
    assert.strictEqual(emphasized.changes[0].to, '<b>Mutukuvu</b>');
    assert.strictEqual(songEditDb.cleanNumber('12a'), '12a');

    console.log('Song edit proposal, approval, conflict and validation tests passed.');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
