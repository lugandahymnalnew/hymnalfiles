const { ObjectId } = require('mongodb');
const db = require('../modules/mongoDBApi');
const { verifyAccessToken, sanitizeUser } = require('../modules/jwtAuth');
const roleAccess = require('../modules/roleAccess');

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

  const user = sanitizeUser(lookup.listing);
  user.permissions = await roleAccess.resolvePermissions(user.role || 'user');
  return user;
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

function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roleAccess.hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission required: ${permission}`
      });
    }
    next();
  };
}

function requireAnyPermission(...permissions) {
  return function anyPermissionMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!permissions.some((permission) => roleAccess.hasPermission(req.user, permission))) {
      return res.status(403).json({ success: false, message: 'This account does not have the required permission' });
    }
    next();
  };
}

const requireAdmin = requirePermission(roleAccess.PERMISSIONS.ADMIN_ACCESS);
const requireEditor = requirePermission(roleAccess.PERMISSIONS.SONG_EDITS_SUBMIT);

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
  requirePermission,
  requireAnyPermission,
  requireEditor,
  requireAdmin,
  hasPermission: roleAccess.hasPermission,
  isLogin,
  isLogout
};
