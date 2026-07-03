const jwt = require('jsonwebtoken');
const con = require('../config.json');

const jwtSecret = process.env.JWT_ACCESS_SECRET || con.sessionSecret;
const jwtExpiry = process.env.JWT_ACCESS_EXPIRES_IN || '7d';

const refreshSecret = process.env.JWT_REFRESH_SECRET || con.sessionSecret + '_refresh';
const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function buildTokenPayload(user) {
  return {
    sub: String(user._id),
    userName: user.userName,
    email: user.email,
    role: user.role || 'user',
    status: user.status || 'pending'
  };
}

function signAccessToken(user) {
  return jwt.sign(buildTokenPayload(user), jwtSecret, { expiresIn: jwtExpiry });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret);
}

function signRefreshToken(user) {
  return jwt.sign(buildTokenPayload(user), refreshSecret, { expiresIn: refreshExpiry });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    fullName: user.fullName || '',
    userName: user.userName || '',
    email: user.email || '',
    role: user.role || 'user',
    status: user.status || 'pending',
    profile: user.profile || '',
    createdAt: user.createdAt || null,
    approvedAt: user.approvedAt || null,
    lastLoginAt: user.lastLoginAt || null
  };
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sanitizeUser
};
