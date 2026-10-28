/**
 * Donation Database Module
 * Donor records + the public "progress toward the goal" numbers.
 *
 * Collections (database "newHymnal"):
 *   donations         one document per donation
 *   donationSettings  one document {key: 'main'} holding the goal, the amount
 *                     already raised before tracking began, and FX rates
 *
 * A donation only counts toward progress once its status is "approved".
 * Donors can report their own gift (status "pending"); an admin approves it
 * after checking the PayPal / MoMo / Airtel / bank statement. Admins can also
 * record gifts directly (created already approved).
 *
 * Every gift stores the rate it was converted at ("rate", "goalAmount",
 * "goalCurrency"). That is what stops a later rate change from quietly
 * revaluing the whole history.
 */

const db = require('./mongoDBApi');
const { ObjectId } = require('mongodb');

const DB_NAME = 'newHymnal';
const DONATIONS = 'donations';
const SETTINGS = 'donationSettings';

const STATUSES = ['pending', 'approved', 'rejected'];
const METHODS = ['paypal', 'worldremit', 'mtn', 'airtel', 'bank', 'cash', 'other'];

// Rates are "units of <currency> per 1 unit of the goal currency" (goal is USD).
const DEFAULT_SETTINGS = {
    key: 'main',
    title: 'Bring the hymnal to iPhone and Windows',
    goalAmount: 300,
    goalCurrency: 'USD',
    baseRaised: 0,
    // Units of the local currency per 1 unit of the goal currency.
    // Mid-market 28 Oct 2026: XE 4391.89, TradingEconomics 4393.20,
    // Investing.com 4382.70. The previous 3700 was roughly 16% below the
    // market, which silently over-credited the progress bar. This number
    // wants a monthly look.
    rates: { UGX: 4390 },
    // When this default rate was set, so the page can date it.
    ratesUpdatedAt: new Date('2026-10-28T00:00:00Z'),
    updatedAt: null,
    updatedBy: null
};

function cleanText(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

async function getSettings() {
    const result = await db.readRow({ key: 'main' }, DB_NAME, SETTINGS);
    if (result && result.found) {
        const s = result.listing;
        return Object.assign({}, DEFAULT_SETTINGS, s, { rates: Object.assign({}, DEFAULT_SETTINGS.rates, s.rates || {}) });
    }
    return Object.assign({}, DEFAULT_SETTINGS);
}

async function saveSettings(input, adminName) {
    const current = await getSettings();
    const next = {
        key: 'main',
        title: input.title !== undefined ? cleanText(input.title, 120) || current.title : current.title,
        goalAmount: input.goalAmount !== undefined ? Number(input.goalAmount) : current.goalAmount,
        goalCurrency: cleanText(input.goalCurrency || current.goalCurrency, 3).toUpperCase() || 'USD',
        baseRaised: input.baseRaised !== undefined ? Number(input.baseRaised) : current.baseRaised,
        rates: current.rates,
        updatedAt: new Date(),
        updatedBy: adminName || null
    };
    if (!(next.goalAmount > 0) || next.goalAmount > 1e9) {
        throw new Error('goalAmount must be a positive number');
    }
    if (!(next.baseRaised >= 0) || next.baseRaised > 1e9) {
        throw new Error('baseRaised must be zero or more');
    }
    if (input.rates && typeof input.rates === 'object') {
        // Normalise the submitted keys first, so "is this currency being
        // managed?" compares like with like.
        const submitted = {};
        Object.keys(input.rates).slice(0, 10).forEach((code) => {
            const key = cleanText(code, 3).toUpperCase();
            if (key) { submitted[key] = Number(input.rates[code]); }
        });
        const rates = {};
        // Only the currencies the settings form manages are replaced. Anything
        // else the organisation had configured is left alone.
        Object.keys(current.rates).forEach((code) => {
            if (!(code in submitted)) { rates[code] = current.rates[code]; }
        });
        Object.keys(submitted).forEach((key) => {
            const rate = submitted[key];
            // A blank or zero rate removes that currency: it can no longer be
            // given, because a currency with no rate is worth zero.
            if (rate > 0 && rate < 1e9) { rates[key] = rate; }
        });
        next.rates = rates;
        // Record when the rates were last touched, so a stale rate is visible
        // rather than silently over-crediting the goal.
        next.ratesUpdatedAt = JSON.stringify(next.rates) === JSON.stringify(current.rates)
            ? (current.ratesUpdatedAt || null)
            : new Date();
    } else {
        next.ratesUpdatedAt = current.ratesUpdatedAt || null;
    }
    await db.updateRow2({ key: 'main' }, next, DB_NAME, SETTINGS);
    return next;
}

// Converts one donation into the goal currency (0 if the currency is unknown).
function toGoalCurrency(donation, settings) {
    const amount = Number(donation.amount) || 0;
    const cur = String(donation.currency || settings.goalCurrency).toUpperCase();
    if (cur === settings.goalCurrency) { return amount; }
    const rate = Number(settings.rates[cur]);
    return rate > 0 ? amount / rate : 0;
}

// Units of a currency per 1 unit of the goal currency. 0 means the currency
// has no rate yet, so a gift in it cannot be valued.
function rateFor(currency, settings) {
    if (currency === settings.goalCurrency) { return 1; }
    const rate = Number(settings.rates[currency]);
    return rate > 0 ? rate : 0;
}

// The value of one gift in the goal currency.
//
// A gift stores the rate it was converted at, so changing the rate later does
// not quietly revalue the history. Gifts recorded before that field existed
// are converted with the current rate, which is the only value they ever had.
function giftValue(donation, settings) {
    if (donation.goalCurrency === settings.goalCurrency && typeof donation.goalAmount === 'number') {
        return donation.goalAmount;
    }
    return toGoalCurrency(donation, settings);
}

// The currencies a donor can actually give in: the goal currency plus every
// currency that has a rate. A currency without a rate would be recorded but
// worth zero, so the public form must not offer it.
function convertibleCurrencies(settings) {
    const list = [settings.goalCurrency];
    Object.keys(settings.rates || {}).forEach((code) => {
        const cur = String(code).toUpperCase();
        if (rateFor(cur, settings) > 0 && list.indexOf(cur) === -1) { list.push(cur); }
    });
    return list;
}

/**
 * Public numbers for the donate page: total raised, percentage of the goal,
 * donor count and a "wall" of recent approved donors. Names are only shown for
 * donors who opted in (showName); everyone else appears as "Anonymous".
 * Individual amounts are deliberately not published.
 */
async function getSummary() {
    const settings = await getSettings();
    const result = await db.readRows({ status: 'approved' }, DB_NAME, DONATIONS);
    const list = result && !result.err && Array.isArray(result.listings) ? result.listings : [];

    // Only gifts that convert are counted. A gift in a currency with no rate
    // stays on record but adds nothing to the bar and nobody to the donor
    // count, which is what used to make it look as if a gift had landed.
    let raised = Number(settings.baseRaised) || 0;
    let donorCount = 0;
    let unconvertedCount = 0;
    list.forEach((d) => {
        const value = giftValue(d, settings);
        if (value > 0) { raised += value; donorCount++; } else { unconvertedCount++; }
    });
    raised = Math.round(raised * 100) / 100;

    const percent = Math.min(100, Math.round((raised / settings.goalAmount) * 1000) / 10);

    // The goal and the raised amount expressed in every currency that has a
    // rate, so a donor can see what the goal means in the money they will
    // actually send. The server does the conversion; the page says plainly
    // that the figure is an approximation because the rate moves.
    const localValues = {};
    Object.keys(settings.rates || {}).forEach((code) => {
        const cur = String(code).toUpperCase();
        const rate = rateFor(cur, settings);
        if (rate > 0) {
            localValues[cur] = {
                goal: Math.round(settings.goalAmount * rate),
                raised: Math.round(raised * rate),
                rate: rate
            };
        }
    });

    const wall = list
        .slice()
        .sort((a, b) => new Date(b.donatedAt || b.createdAt) - new Date(a.donatedAt || a.createdAt))
        .slice(0, 12)
        .map((d) => ({
            name: d.showName && d.name ? d.name : 'Anonymous',
            message: d.showName ? d.message || '' : '',
            date: d.donatedAt || d.createdAt
        }));

    return {
        title: settings.title,
        goalAmount: settings.goalAmount,
        currency: settings.goalCurrency,
        raised,
        remaining: Math.max(0, Math.round((settings.goalAmount - raised) * 100) / 100),
        percent,
        reached: raised >= settings.goalAmount,
        donorCount,
        unconvertedCount,
        currencies: convertibleCurrencies(settings),
        localValues,
        wall,
        updatedAt: settings.updatedAt,
        ratesUpdatedAt: settings.ratesUpdatedAt
    };
}

function normalizeDonation(input, { source, approved, adminName }, settings) {
    const amount = Number(input.amount);
    if (!(amount > 0) || amount > 1e9) {
        throw new Error('Amount must be a number greater than zero');
    }
    const currency = cleanText(input.currency || 'UGX', 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
        throw new Error('Currency must be a 3-letter code such as UGX or USD');
    }
    const method = METHODS.indexOf(input.method) !== -1 ? input.method : 'other';
    let donatedAt = input.donatedAt ? new Date(input.donatedAt) : new Date();
    if (isNaN(donatedAt.getTime())) { donatedAt = new Date(); }

    // The rate this gift is converted at, stored on the gift. goalAmount is 0
    // when the currency has no rate yet, which means the gift is on record but
    // is not yet worth anything toward the goal.
    const rate = rateFor(currency, settings);
    const goalAmount = rate > 0 ? Math.round((amount / rate) * 100) / 100 : 0;

    return {
        _id: new ObjectId(),
        name: cleanText(input.name, 60),
        showName: input.showName === true || input.showName === 'true' || input.showName === 'on',
        amount: Math.round(amount * 100) / 100,
        currency,
        goalCurrency: settings.goalCurrency,
        rate,
        goalAmount,
        method,
        reference: cleanText(input.reference, 80),
        message: cleanText(input.message, 200),
        // Set by the mobile app so a report retried after a dropped connection
        // can't be counted twice.
        clientId: cleanText(input.clientId, 64),
        status: approved ? 'approved' : 'pending',
        source,
        donatedAt,
        createdAt: new Date(),
        reviewedBy: approved ? adminName || null : null,
        reviewedAt: approved ? new Date() : null
    };
}

async function addDonation(input, options) {
    const clientId = cleanText(input.clientId, 64);
    if (clientId) {
        const dup = await db.readRow({ clientId }, DB_NAME, DONATIONS);
        if (dup && dup.found) { return dup.listing; }
    }
    const settings = await getSettings();
    const doc = normalizeDonation(input, options, settings);
    await db.createListing(doc, DB_NAME, DONATIONS);
    return doc;
}

async function listDonations({ status, page, pageSize }) {
    const query = STATUSES.indexOf(status) !== -1 ? { status } : {};
    const result = await db.readRowsPaged(query, DB_NAME, DONATIONS, page, pageSize || 25, { createdAt: -1 });
    if (!result || result.err) { throw new Error((result && result.message) || 'Failed to load donations'); }
    const counts = {};
    for (const s of STATUSES) {
        const r = await db.readRowsPaged({ status: s }, DB_NAME, DONATIONS, 1, 1);
        counts[s] = r && !r.err ? r.total : 0;
    }
    // goalValue is what a gift is actually worth toward the goal, so the
    // console can show that a gift in a currency with no rate is not counting.
    const settings = await getSettings();
    const items = result.listings.map((d) => Object.assign({}, d, { goalValue: giftValue(d, settings) }));
    return { items, total: result.total, counts };
}

async function updateDonation(id, input, adminName) {
    if (!ObjectId.isValid(id)) { throw new Error('Invalid donation ID'); }
    const existing = await db.readRow({ _id: new ObjectId(id) }, DB_NAME, DONATIONS);
    if (!existing || !existing.found) { return null; }

    const settings = await getSettings();
    const update = {};
    if (input.status !== undefined) {
        if (STATUSES.indexOf(input.status) === -1) { throw new Error('Invalid status'); }
        update.status = input.status;
        update.reviewedBy = adminName || null;
        update.reviewedAt = new Date();
    }
    if (input.name !== undefined) { update.name = cleanText(input.name, 60); }
    if (input.showName !== undefined) { update.showName = input.showName === true || input.showName === 'true'; }
    if (input.amount !== undefined) {
        const amount = Number(input.amount);
        if (!(amount > 0) || amount > 1e9) { throw new Error('Amount must be greater than zero'); }
        update.amount = Math.round(amount * 100) / 100;
    }
    if (input.currency !== undefined) { update.currency = cleanText(input.currency, 3).toUpperCase(); }
    if (input.method !== undefined) { update.method = METHODS.indexOf(input.method) !== -1 ? input.method : 'other'; }
    if (input.reference !== undefined) { update.reference = cleanText(input.reference, 80); }
    if (input.message !== undefined) { update.message = cleanText(input.message, 200); }
    if (input.donatedAt !== undefined) {
        const d = new Date(input.donatedAt);
        if (!isNaN(d.getTime())) { update.donatedAt = d; }
    }
    // Correcting the amount or the currency changes what the gift is worth, so
    // the stored conversion is recalculated. The gift keeps the rate it was
    // recorded at unless the currency itself changed.
    if (update.amount !== undefined || update.currency !== undefined) {
        const currency = update.currency || existing.listing.currency;
        const amount = update.amount !== undefined ? update.amount : Number(existing.listing.amount);
        const rate = (currency === existing.listing.currency && existing.listing.rate > 0)
            ? existing.listing.rate
            : rateFor(currency, settings);
        update.goalCurrency = settings.goalCurrency;
        update.rate = rate;
        update.goalAmount = rate > 0 ? Math.round((amount / rate) * 100) / 100 : 0;
    }
    if (!Object.keys(update).length) { throw new Error('Nothing to update'); }

    await db.updateRow({ _id: new ObjectId(id) }, update, DB_NAME, DONATIONS);
    const fresh = await db.readRow({ _id: new ObjectId(id) }, DB_NAME, DONATIONS);
    return fresh.listing;
}

async function deleteDonation(id) {
    if (!ObjectId.isValid(id)) { throw new Error('Invalid donation ID'); }
    await db.deleteRow({ _id: new ObjectId(id) }, DB_NAME, DONATIONS);
}

module.exports = {
    METHODS,
    STATUSES,
    getSettings,
    saveSettings,
    getSummary,
    addDonation,
    listDonations,
    updateDonation,
    deleteDonation
};
