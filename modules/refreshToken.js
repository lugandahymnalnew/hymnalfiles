const bcrypt = require('bcrypt');
const db = require('./mongoDBApi');

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const SALT_ROUNDS = 10;

/**
 * Generate a secure random refresh token
 * @returns {string}
 */
function generateToken() {
  const crypto = require('crypto');
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
 * Compare a token against a hash
 * @param {string} token
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function compareToken(token, hash) {
  return bcrypt.compare(token, hash);
}

/**
 * Generate and store a new refresh token
 * @param {string} userId
 * @param {string} userAgent
 * @param {string} ipAddress
 * @returns {Promise<{refreshToken: string, expiresAt: Date}>}
 */
async function generateRefreshToken(userId, userAgent = '', ipAddress = '') {
  const token = generateToken();
  const hashedToken = await hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const tokenDoc = {
    userId: String(userId),
    token: hashedToken,
    expiresAt,
    revokedAt: null,
    replacedByToken: null,
    createdAt: new Date(),
    userAgent,
    ipAddress
  };

  await db.createListing(tokenDoc, 'newHymnal', 'refreshTokens');

  return {
    refreshToken: token,
    expiresAt
  };
}

/**
 * Verify a refresh token and return the associated user ID
 * @param {string} token
 * @returns {Promise<{valid: boolean, userId?: string, error?: string}>}
 */
async function verifyRefreshToken(token) {
  const tokens = await db.readRows({}, 'newHymnal', 'refreshTokens');

  if (!tokens || !tokens.listings) {
    return { valid: false, error: 'No tokens found' };
  }

  // Find matching token
  for (const tokenDoc of tokens.listings) {
    const matches = await compareToken(token, tokenDoc.token);

    if (matches) {
      // Check if expired
      if (new Date() > new Date(tokenDoc.expiresAt)) {
        return { valid: false, error: 'Token expired' };
      }

      // Check if revoked
      if (tokenDoc.revokedAt) {
        return { valid: false, error: 'Token revoked' };
      }

      return { valid: true, userId: tokenDoc.userId };
    }
  }

  return { valid: false, error: 'Token not found' };
}

/**
 * Revoke a refresh token (mark as revoked)
 * @param {string} token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function revokeRefreshToken(token) {
  const tokens = await db.readRows({}, 'newHymnal', 'refreshTokens');

  if (!tokens || !tokens.listings) {
    return { success: false, error: 'No tokens found' };
  }

  for (const tokenDoc of tokens.listings) {
    const matches = await compareToken(token, tokenDoc.token);

    if (matches) {
      await db.updateRow(
        { _id: tokenDoc._id },
        { revokedAt: new Date(), updatedAt: new Date() },
        'newHymnal',
        'refreshTokens'
      );
      return { success: true };
    }
  }

  return { success: false, error: 'Token not found' };
}

/**
 * Rotate a refresh token (revoke old, issue new)
 * @param {string} oldToken
 * @param {string} userAgent
 * @param {string} ipAddress
 * @returns {Promise<{success: boolean, refreshToken?: string, expiresAt?: Date, error?: string}>}
 */
async function rotateRefreshToken(oldToken, userAgent = '', ipAddress = '') {
  const tokens = await db.readRows({}, 'newHymnal', 'refreshTokens');

  if (!tokens || !tokens.listings) {
    return { success: false, error: 'No tokens found' };
  }

  let foundToken = null;

  for (const tokenDoc of tokens.listings) {
    const matches = await compareToken(oldToken, tokenDoc.token);

    if (matches) {
      foundToken = tokenDoc;
      break;
    }
  }

  if (!foundToken) {
    return { success: false, error: 'Token not found' };
  }

  // Check if already revoked
  if (foundToken.revokedAt) {
    return { success: false, error: 'Token already revoked' };
  }

  // Check if expired
  if (new Date() > new Date(foundToken.expiresAt)) {
    return { success: false, error: 'Token expired' };
  }

  // Generate new token
  const { refreshToken: newToken, expiresAt } = await generateRefreshToken(
    foundToken.userId,
    userAgent,
    ipAddress
  );

  // Mark old token as replaced
  const newTokenHash = await hashToken(newToken);
  await db.updateRow(
    { _id: foundToken._id },
    { revokedAt: new Date(), replacedByToken: newTokenHash, updatedAt: new Date() },
    'newHymnal',
    'refreshTokens'
  );

  return {
    success: true,
    refreshToken: newToken,
    expiresAt
  };
}

/**
 * Clean up expired tokens from the database
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
async function cleanupExpiredTokens() {
  try {
    const expiredTokens = await db.readRows(
      { expiresAt: { $lt: new Date() } },
      'newHymnal',
      'refreshTokens'
    );

    if (!expiredTokens || !expiredTokens.listings || expiredTokens.listings.length === 0) {
      return { success: true, count: 0 };
    }

    const deletePromises = expiredTokens.listings.map(t =>
      db.deleteRow({ _id: t._id }, 'newHymnal', 'refreshTokens')
    );

    await Promise.all(deletePromises);

    return { success: true, count: expiredTokens.listings.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
async function revokeAllUserTokens(userId) {
  try {
    const userTokens = await db.readRows({ userId: String(userId) }, 'newHymnal', 'refreshTokens');

    if (!userTokens || !userTokens.listings || userTokens.listings.length === 0) {
      return { success: true, count: 0 };
    }

    const revokePromises = userTokens.listings
      .filter(t => !t.revokedAt)
      .map(t => db.updateRow(
        { _id: t._id },
        { revokedAt: new Date(), updatedAt: new Date() },
        'newHymnal',
        'refreshTokens'
      ));

    await Promise.all(revokePromises);

    return { success: true, count: userTokens.listings.length };
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
  compareToken
};
