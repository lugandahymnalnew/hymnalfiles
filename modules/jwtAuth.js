const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.SESSION_SECRET;
const jwtExpiry = process.env.JWT_ACCESS_EXPIRES_IN || '7d';

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
  sanitizeUser
};
