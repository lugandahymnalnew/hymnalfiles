const { ObjectId } = require('mongodb');
const db = require('../modules/mongoDBApi');
const { verifyAccessToken, sanitizeUser } = require('../modules/jwtAuth');

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (typeof req.headers['x-access-token'] === 'string') {
    return req.headers['x-access-token'].trim();
  }

  return null;
}

async function hydrateUser(req, decodedToken) {
  if (!decodedToken || !decodedToken.sub || !ObjectId.isValid(decodedToken.sub)) {
    return null;
  }

  const lookup = await db.readRow({ _id: new ObjectId(decodedToken.sub) }, 'newHymnal', 'users');
  if (!lookup || lookup.err || !lookup.found) {
    return null;
  }

  return sanitizeUser(lookup.listing);
}

async function attachUserIfPresent(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return next();
    }

    const decodedToken = verifyAccessToken(token);
    const user = await hydrateUser(req, decodedToken);
    if (user) {
      req.user = user;
      req.token = token;
    }
  } catch (_error) {
  }

  next();
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decodedToken = verifyAccessToken(token);
    const user = await hydrateUser(req, decodedToken);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
  }
}

function requireApproved(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (req.user.status !== 'approved') {
    return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (req.user.status !== 'approved' || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  next();
}

function isLogin(_req, _res, next) {
  next();
}

function isLogout(_req, _res, next) {
  next();
}

module.exports = {
  attachUserIfPresent,
  requireAuth,
  requireApproved,
  requireAdmin,
  isLogin,
  isLogout
};
