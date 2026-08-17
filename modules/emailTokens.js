/**
 * Hashed, expiring, single-use tokens for email verification and password reset.
 * Same storage pattern as modules/refreshToken.js — opaque random token given to the
 * client, only its bcrypt hash is stored server-side.
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./mongoDBApi');

const SALT_ROUNDS = 10;
const DB_NAME = 'newHymnal';

const VERIFY_COLLECTION = 'emailVerifications';
const VERIFY_EXPIRY_HOURS = 24;

const RESET_COLLECTION = 'passwordResets';
const RESET_EXPIRY_HOURS = 1;

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function createToken(collection, userId, expiryHours) {
    const token = generateToken();
    const tokenHash = await bcrypt.hash(token, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await db.createListing({
        userId: String(userId),
        token: tokenHash,
        expiresAt,
        usedAt: null,
        createdAt: new Date()
    }, DB_NAME, collection);

    return { token, expiresAt };
}

/**
 * Finds the matching token document, checks expiry/use, and marks it used.
 * Returns { valid, userId, error }.
 */
async function consumeToken(collection, token) {
    const result = await db.readRows({}, DB_NAME, collection);
    if (!result || !result.listings) {
        return { valid: false, error: 'Token not found' };
    }

    for (const doc of result.listings) {
        const matches = await bcrypt.compare(token, doc.token);
        if (!matches) continue;

        if (doc.usedAt) {
            return { valid: false, error: 'Token already used' };
        }
        if (new Date() > new Date(doc.expiresAt)) {
            return { valid: false, error: 'Token expired' };
        }

        await db.updateRow(
            { _id: doc._id },
            { usedAt: new Date() },
            DB_NAME,
            collection
        );

        return { valid: true, userId: doc.userId };
    }

    return { valid: false, error: 'Token not found' };
}

async function createEmailVerificationToken(userId) {
    return createToken(VERIFY_COLLECTION, userId, VERIFY_EXPIRY_HOURS);
}

async function consumeEmailVerificationToken(token) {
    return consumeToken(VERIFY_COLLECTION, token);
}

async function createPasswordResetToken(userId) {
    return createToken(RESET_COLLECTION, userId, RESET_EXPIRY_HOURS);
}

async function consumePasswordResetToken(token) {
    return consumeToken(RESET_COLLECTION, token);
}

module.exports = {
    createEmailVerificationToken,
    consumeEmailVerificationToken,
    createPasswordResetToken,
    consumePasswordResetToken
};
