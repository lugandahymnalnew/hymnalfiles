const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./mongoDBApi');

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const SALT_ROUNDS = 10;

// How long the token that was just replaced keeps working. Rotation happens
// in two places at once sometimes (the timer fires while a page is also
// retrying a 401, or two tabs refresh together), and the loser of that race
// used to be logged out even though its token was fine. Keeping the old token
// alive for a short window means both sides of the race stay signed in.
const ROTATION_GRACE_MS = 2 * 60 * 1000;

// How long a revoked token row is kept before it is deleted. Rows are kept
// briefly so that "you signed out here" can still be explained, and so the
// collection does not grow without bound.
const REVOKED_RETENTION_MS = 24 * 60 * 60 * 1000;

const DB_NAME = 'newHymnal';
const COLLECTION = 'refreshTokens';

/**
 * Generate a secure random refresh token
 * @returns {string}
 */
function generateToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash a refresh token for storage
 * @param {string} token
 * @returns {Promise<string>}
 */
async function hashToken(token) {
  return bcrypt.hash(token, SALT_ROUNDS);
}

/**
 * A deterministic hash of the token, stored alongside the bcrypt hash.
 *
 * bcrypt cannot be used to look a row up — it is salted, so the same token
 * produces a different hash every time. Comparing the token against every
 * row in the collection meant a refresh cost one bcrypt round trip per token
 * ever issued, so the site got slower the longer it ran. The SHA-256 lookup
 * hash can be indexed, so finding the row is a single indexed read and the
 * bcrypt comparison only happens for the row we actually found.
 *
 * @param {string} token
 * @returns {string}
 */
function lookupHashFor(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Compare a token against a hash
 * @param {string} token
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function compareToken(token, hash) {
  // bcrypt rejects a missing hash outright, and a row can be missing one if
  // it was written badly. A failed comparison is the answer we want, not a
  // crash.
  if (!token || !hash || typeof hash !== 'string') return false;
  try {
    return await bcrypt.compare(token, hash);
  } catch (e) {
    return false;
  }
}

let indexesReady = null;

/**
 * Make sure the indexes this module relies on exist.
 *
 * @returns {Promise<void>}
 */
function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = Promise.all([
      db.createIndex({ lookupHash: 1 }, DB_NAME, COLLECTION, { unique: true, sparse: true }),
      db.createIndex({ previousLookupHash: 1 }, DB_NAME, COLLECTION, { sparse: true }),
      db.createIndex({ userId: 1 }, DB_NAME, COLLECTION)
    ]).catch((error) => {
      console.log(`An error occurred: ${error.message}`);
    });
  }
  return indexesReady;
}

/**
 * Find the row holding a token, by its lookup hash.
 * @param {string} lookupHash
 * @returns {Promise<Object|null>}
 */
async function findByLookup(lookupHash) {
  const result = await db.readRow({ lookupHash }, DB_NAME, COLLECTION);
  return result && result.found ? result.listing : null;
}

/**
 * Find the row where a token has just been replaced, but is still inside the
 * grace window.
 * @param {string} lookupHash
 * @returns {Promise<Object|null>}
 */
async function findByPreviousLookup(lookupHash) {
  const result = await db.readRow({ previousLookupHash: lookupHash }, DB_NAME, COLLECTION);
  return result && result.found ? result.listing : null;
}

// Tokens issued before the lookup hash existed have no lookupHash, so they
// cannot be found by index. They are rare and short lived. They are only
// looked for when an indexed lookup misses, and once one of them is used it
// is given a lookup hash, so the set shrinks on its own.
const LEGACY_SCAN_INTERVAL_MS = 60 * 1000;
let legacyDocsCache = null;
let legacyDocsCachedAt = 0;

/**
 * The rows written before the lookup hash existed, read again at most once
 * a minute so that a miss does not scan the collection every time.
 * @returns {Promise<Array<Object>>}
 */
async function getLegacyDocs() {
  const now = Date.now();
  if (legacyDocsCache && now - legacyDocsCachedAt < LEGACY_SCAN_INTERVAL_MS) {
    return legacyDocsCache;
  }

  const result = await db.readRows(
    {
      lookupHash: { $exists: false },
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    },
    DB_NAME,
    COLLECTION
  );

  legacyDocsCachedAt = now;
  legacyDocsCache = (!result || result.err || !Array.isArray(result.listings)) ? [] : result.listings;
  return legacyDocsCache;
}

/**
 * Look for a token among the rows written before the lookup hash existed.
 *
 * A row that matches is given a lookup hash, so the next use of that token
 * is an indexed lookup like every other one.
 *
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
async function findLegacyDoc(token) {
  const docs = await getLegacyDocs();

  for (const doc of docs) {
    if (await compareToken(token, doc.token)) {
      // Give the row a lookup hash so that it is found the quick way from
      // now on.
      const update = await db.updateRow(
        { _id: doc._id },
        { lookupHash: lookupHashFor(token), updatedAt: new Date() },
        DB_NAME,
        COLLECTION
      );
      const migrated = !!(update && !update.err && update.updated === 1);
      return migrated ? Object.assign({}, doc, { lookupHash: lookupHashFor(token) }) : doc;
    }
  }

  return null;
}

/**
 * Generate and store a new refresh token
 * @param {string} userId
 * @param {string} userAgent
 * @param {string} ipAddress
 * @returns {Promise<{refreshToken: string, expiresAt: Date}>}
 */
async function generateRefreshToken(userId, userAgent = '', ipAddress = '') {
  await ensureIndexes();

  const token = generateToken();
  const hashedToken = await hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const tokenDoc = {
    userId: String(userId),
    token: hashedToken,
    lookupHash: lookupHashFor(token),
    previousToken: null,
    previousLookupHash: null,
    previousValidUntil: null,
    expiresAt,
    revokedAt: null,
    replacedByToken: null,
    createdAt: new Date(),
    userAgent,
    ipAddress
  };

  await db.createListing(tokenDoc, DB_NAME, COLLECTION);

  return {
    refreshToken: token,
    expiresAt
  };
}

/**
 * Look a token up and say whether it may still be used.
 * @param {string} token
 * @returns {Promise<{valid: boolean, userId?: string, error?: string}>}
 */
async function verifyRefreshToken(token) {
  if (!token) return { valid: false, error: 'Token not found' };

  await ensureIndexes();

  const lookupHash = lookupHashFor(token);

  let doc = await findByLookup(lookupHash);
  let viaGrace = false;

  if (!doc) {
    doc = await findByPreviousLookup(lookupHash);
    viaGrace = !!doc;
  }

  if (!doc) doc = await findLegacyDoc(token);

  if (!doc) return { valid: false, error: 'Token not found' };

  if (doc.revokedAt) return { valid: false, error: 'Token revoked' };

  if (new Date() > new Date(doc.expiresAt)) return { valid: false, error: 'Token expired' };

  if (viaGrace) {
    if (!doc.previousValidUntil || new Date() > new Date(doc.previousValidUntil)) {
      return { valid: false, error: 'Token expired' };
    }
  }

  const storedHash = viaGrace ? doc.previousToken : doc.token;
  if (!(await compareToken(token, storedHash))) {
    return { valid: false, error: 'Token invalid' };
  }

  return { valid: true, userId: doc.userId };
}

/**
 * Revoke a refresh token (mark as revoked)
 * @param {string} token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function revokeRefreshToken(token) {
  if (!token) return { success: false, error: 'Token not found' };

  await ensureIndexes();

  const lookupHash = lookupHashFor(token);

  let doc = await findByLookup(lookupHash);
  if (!doc) doc = await findByPreviousLookup(lookupHash);
  if (!doc) doc = await findLegacyDoc(token);

  if (!doc) return { success: false, error: 'Token not found' };

  await db.updateRow(
    { _id: doc._id },
    { revokedAt: new Date(), updatedAt: new Date() },
    DB_NAME,
    COLLECTION
  );

  return { success: true };
}

/**
 * Replace a refresh token with a new one.
 *
 * The row is updated in place: the new token becomes the current one and the
 * token that was used becomes the previous one, which stays usable until the
 * grace window closes. That way a refresh that happens while another refresh
 * is in flight does not leave either side signed out.
 *
 * @param {string} oldToken
 * @param {string} userAgent
 * @param {string} ipAddress
 * @returns {Promise<{success: boolean, refreshToken?: string, expiresAt?: Date, userId?: string, error?: string}>}
 */
async function rotateRefreshToken(oldToken, userAgent = '', ipAddress = '') {
  if (!oldToken) return { success: false, error: 'Token not found' };

  await ensureIndexes();

  const lookupHash = lookupHashFor(oldToken);

  // Three attempts is plenty: the second one normally succeeds, because by
  // then the token that lost the race has moved into the grace slot.
  for (let attempt = 0; attempt < 3; attempt++) {
    let doc = await findByLookup(lookupHash);
    let viaGrace = false;

    if (!doc) {
      doc = await findByPreviousLookup(lookupHash);
      viaGrace = !!doc;
    }

    if (!doc) doc = await findLegacyDoc(oldToken);

    if (!doc) return { success: false, error: 'Token not found' };

    if (doc.revokedAt) return { success: false, error: 'Token revoked' };

    if (new Date() > new Date(doc.expiresAt)) return { success: false, error: 'Token expired' };

    if (viaGrace && (!doc.previousValidUntil || new Date() > new Date(doc.previousValidUntil))) {
      return { success: false, error: 'Token expired' };
    }

    const storedHash = viaGrace ? doc.previousToken : doc.token;
    if (!(await compareToken(oldToken, storedHash))) {
      return { success: false, error: 'Token invalid' };
    }

    const newToken = generateToken();
    const hashedToken = await hashToken(newToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime());
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // The token that is being replaced becomes the previous one. When the
    // caller came in through the grace slot, the token currently in the row
    // is the one that moves into the grace slot, so that whoever holds it
    // keeps working too.
    const update = {
      token: hashedToken,
      lookupHash: lookupHashFor(newToken),
      previousToken: doc.token || storedHash,
      previousLookupHash: doc.lookupHash || (viaGrace ? lookupHash : null),
      previousValidUntil: new Date(now.getTime() + ROTATION_GRACE_MS),
      expiresAt,
      updatedAt: now,
      userAgent: userAgent || doc.userAgent,
      ipAddress: ipAddress || doc.ipAddress
    };

    // The lookup hash is part of the filter, so if another rotation landed
    // first this update matches nothing and we go round again with fresh
    // numbers instead of overwriting the other rotation's token.
    const filter = { _id: doc._id };
    if (doc.lookupHash) {
      filter.lookupHash = doc.lookupHash;
    } else {
      filter.lookupHash = { $exists: false };
    }

    const result = await db.updateRow(filter, update, DB_NAME, COLLECTION);

    if (result && !result.err && result.updated === 1) {
      return {
        success: true,
        refreshToken: newToken,
        expiresAt,
        userId: doc.userId
      };
    }
  }

  return { success: false, error: 'Token rotation failed' };
}

/**
 * Clean up expired tokens from the database
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
async function cleanupExpiredTokens() {
  try {
    await ensureIndexes();

    const now = new Date();
    const revokedBefore = new Date(now.getTime() - REVOKED_RETENTION_MS);

    const expired = await db.readRows({ expiresAt: { $lt: now } }, DB_NAME, COLLECTION);
    const revoked = await db.readRows(
      { revokedAt: { $ne: null, $lt: revokedBefore } },
      DB_NAME,
      COLLECTION
    );

    const toDelete = [];
    if (expired && !expired.err && Array.isArray(expired.listings)) {
      toDelete.push(...expired.listings);
    }
    if (revoked && !revoked.err && Array.isArray(revoked.listings)) {
      toDelete.push(...revoked.listings);
    }

    if (toDelete.length === 0) return { success: true, count: 0 };

    await Promise.all(
      toDelete.map(t => db.deleteRow({ _id: t._id }, DB_NAME, COLLECTION))
    );

    return { success: true, count: toDelete.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId
 * @param {string} [keepToken] - a token that should survive, so that the
 *   session making the request is not signed out by its own request
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
async function revokeAllUserTokens(userId, keepToken) {
  try {
    await ensureIndexes();

    const userTokens = await db.readRows({ userId: String(userId) }, DB_NAME, COLLECTION);

    if (!userTokens || userTokens.err || !Array.isArray(userTokens.listings) || userTokens.listings.length === 0) {
      return { success: true, count: 0 };
    }

    const keepLookup = keepToken ? lookupHashFor(keepToken) : null;

    const toRevoke = userTokens.listings.filter(t => {
      if (t.revokedAt) return false;
      if (keepLookup && (t.lookupHash === keepLookup || t.previousLookupHash === keepLookup)) {
        return false;
      }
      return true;
    });

    await Promise.all(
      toRevoke.map(t => db.updateRow(
        { _id: t._id },
        { revokedAt: new Date(), updatedAt: new Date() },
        DB_NAME,
        COLLECTION
      ))
    );

    return { success: true, count: toRevoke.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  cleanupExpiredTokens,
  revokeAllUserTokens,
  hashToken,
  compareToken,
  lookupHashFor
};
