/**
 * RBAC Middleware
 *
 * Validates Firebase ID tokens and checks role-based permissions
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'kiwichito-website',
  });
}

/**
 * Verify Firebase ID token and attach user to request
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Get MongoDB connection to kiwichitoDb
 */
async function getKiwiDb(mongoClientFn) {
  const client = await mongoClientFn();
  return client.db('kiwichitoDb');
}

/**
 * Check if user has a specific permission
 */
function hasPermission(permissions, required) {
  // Check for god mode
  if (permissions.includes('*:*')) {
    return true;
  }

  // Check exact match
  if (permissions.includes(required)) {
    return true;
  }

  // Check wildcard match (e.g., "users:*" matches "users:read")
  const [resource, action] = required.split(':');
  if (permissions.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

/**
 * Middleware to require specific permission
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const kiwiDb = await getKiwiDb(req.app.locals.getMongoClient);
      const userAccess = await kiwiDb.collection('userAccess').findOne({
        uid: req.user.uid,
        status: 'granted',
      });

      if (!userAccess) {
        return res.status(403).json({ error: 'Access denied: No granted access' });
      }

      // Check if access has expired
      if (userAccess.expiresAt && new Date(userAccess.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'Access denied: Access expired' });
      }

      // Check permission
      if (!hasPermission(userAccess.permissions, permission)) {
        return res.status(403).json({
          error: `Access denied: Missing permission '${permission}'`,
        });
      }

      // Attach user access info to request
      req.userAccess = userAccess;
      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to require owner role
 */
function requireOwner(req, res, next) {
  if (req.userAccess.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Owner role required' });
  }
  next();
}

/**
 * Middleware to require owner or admin role
 */
function requireAdminOrOwner(req, res, next) {
  if (req.userAccess.role !== 'owner' && req.userAccess.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin or owner role required' });
  }
  next();
}

/**
 * Log action to audit log
 */
async function logAudit(db, action, actor, target, changes, result = 'success') {
  try {
    const auditLog = db.collection('auditLog');
    await auditLog.insertOne({
      timestamp: new Date(),
      action,
      actor: {
        uid: actor.uid,
        email: actor.email,
        role: actor.role,
      },
      target,
      changes,
      result,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year retention
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't fail the request if audit logging fails
  }
}

module.exports = {
  verifyFirebaseToken,
  requirePermission,
  requireOwner,
  requireAdminOrOwner,
  hasPermission,
  logAudit,
  getKiwiDb,
};
