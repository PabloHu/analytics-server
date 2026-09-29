/**
 * RBAC Routes
 *
 * User and permission management endpoints
 */

const express = require('express');
const {
  verifyFirebaseToken,
  requirePermission,
  requireOwner,
  requireAdminOrOwner,
  logAudit,
  getKiwiDb,
} = require('../middleware/rbac');

function createRBACRouter(getMongoClient) {
  const router = express.Router();

  // All RBAC routes require Firebase authentication
  router.use(verifyFirebaseToken);

  // Store MongoDB client getter for middleware
  router.use((req, res, next) => {
    req.app.locals.getMongoClient = getMongoClient;
    next();
  });

  /**
   * GET /rbac/users
   * List all users with their roles and permissions
   * Requires: users:read permission (owner, admin)
   */
  router.get('/users', requirePermission('users:read'), async (req, res) => {
    try {
      const db = await getKiwiDb(getMongoClient);
      const users = await db
        .collection('userAccess')
        .find({})
        .project({
          uid: 1,
          email: 1,
          displayName: 1,
          role: 1,
          type: 1,
          status: 1,
          permissions: 1,
          allowedDemos: 1,
          expiresAt: 1,
          requestedAt: 1,
          grantedAt: 1,
          grantedBy: 1,
          updatedAt: 1,
        })
        .sort({ requestedAt: 1 })
        .toArray();

      return res.json({ users });
    } catch (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({ error: 'Failed to list users' });
    }
  });

  /**
   * GET /rbac/users/:uid
   * Get details for a specific user
   * Requires: users:read permission
   */
  router.get('/users/:uid', requirePermission('users:read'), async (req, res) => {
    try {
      const db = await getKiwiDb(getMongoClient);
      const user = await db.collection('userAccess').findOne({ uid: req.params.uid });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (error) {
      console.error('Error getting user:', error);
      return res.status(500).json({ error: 'Failed to get user' });
    }
  });

  /**
   * POST /rbac/users/:uid/grant
   * Grant access to a user
   * Requires: users:grant permission (owner only)
   */
  router.post('/users/:uid/grant', requirePermission('users:grant'), requireOwner, async (req, res) => {
    const { uid } = req.params;
    const { email, role = 'viewer', allowedDemos = [] } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    if (!['viewer', 'admin', 'service'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be viewer, admin, or service' });
    }

    try {
      const db = await getKiwiDb(getMongoClient);

      // Role permission templates
      const ROLE_PERMISSIONS = {
        admin: [
          'users:read',
          'demos:read',
          'demos:write',
          'demos:create',
          'demos:delete',
          'analytics:read',
          'analytics:export',
        ],
        viewer: ['demos:read:assigned', 'settings:read:self'],
        service: ['api:read', 'api:write'],
      };

      const newUser = {
        uid,
        email,
        role,
        type: role === 'service' ? 'service' : 'human',
        isOwner: false,
        status: 'granted',
        permissions: ROLE_PERMISSIONS[role],
        allowedDemos,
        expiresAt: null,
        requestedAt: new Date(),
        grantedBy: req.user.email,
        grantedAt: new Date(),
        updatedBy: req.user.email,
        updatedAt: new Date(),
        schemaVersion: 1,
      };

      await db.collection('userAccess').updateOne(
        { uid },
        { $set: newUser },
        { upsert: true }
      );

      // Log to audit
      await logAudit(db, 'user.grant', req.userAccess, { type: 'user', uid, email }, { role, allowedDemos });

      return res.json({ success: true, user: newUser });
    } catch (error) {
      console.error('Error granting access:', error);
      return res.status(500).json({ error: 'Failed to grant access' });
    }
  });

  /**
   * POST /rbac/users/:uid/revoke
   * Revoke user access
   * Requires: users:revoke permission (owner only)
   */
  router.post('/users/:uid/revoke', requirePermission('users:revoke'), requireOwner, async (req, res) => {
    const { uid } = req.params;

    try {
      const db = await getKiwiDb(getMongoClient);

      // Check if user exists
      const user = await db.collection('userAccess').findOne({ uid });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Cannot revoke owner
      if (user.role === 'owner') {
        return res.status(403).json({ error: 'Cannot revoke owner access' });
      }

      // Revoke access
      await db.collection('userAccess').updateOne(
        { uid },
        {
          $set: {
            status: 'revoked',
            revokedBy: req.user.email,
            revokedAt: new Date(),
            updatedBy: req.user.email,
            updatedAt: new Date(),
          },
        }
      );

      // Log to audit
      await logAudit(db, 'user.revoke', req.userAccess, { type: 'user', uid, email: user.email }, {
        reason: req.body.reason || 'No reason provided',
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Error revoking access:', error);
      return res.status(500).json({ error: 'Failed to revoke access' });
    }
  });

  /**
   * PATCH /rbac/users/:uid/role
   * Change user role
   * Requires: users:changeRole permission (owner only)
   */
  router.patch('/users/:uid/role', requirePermission('users:changeRole'), requireOwner, async (req, res) => {
    const { uid } = req.params;
    const { role } = req.body;

    if (!['viewer', 'admin', 'service'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be viewer, admin, or service' });
    }

    try {
      const db = await getKiwiDb(getMongoClient);

      // Check if user exists
      const user = await db.collection('userAccess').findOne({ uid });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Cannot change owner role
      if (user.role === 'owner') {
        return res.status(403).json({ error: 'Cannot change owner role' });
      }

      // Cannot promote to owner
      if (role === 'owner') {
        return res.status(403).json({ error: 'Cannot promote to owner role' });
      }

      // Role permission templates
      const ROLE_PERMISSIONS = {
        admin: [
          'users:read',
          'demos:read',
          'demos:write',
          'demos:create',
          'demos:delete',
          'analytics:read',
          'analytics:export',
        ],
        viewer: ['demos:read:assigned', 'settings:read:self'],
        service: ['api:read', 'api:write'],
      };

      const oldRole = user.role;

      // Update role and permissions
      await db.collection('userAccess').updateOne(
        { uid },
        {
          $set: {
            role,
            type: role === 'service' ? 'service' : 'human',
            permissions: ROLE_PERMISSIONS[role],
            updatedBy: req.user.email,
            updatedAt: new Date(),
          },
        }
      );

      // Log to audit
      await logAudit(db, 'user.roleChange', req.userAccess, { type: 'user', uid, email: user.email }, {
        before: oldRole,
        after: role,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Error changing role:', error);
      return res.status(500).json({ error: 'Failed to change role' });
    }
  });

  /**
   * PATCH /rbac/users/:uid/demos
   * Assign/remove demos for a user
   * Requires: demos:write permission (owner, admin)
   */
  router.patch('/rbac/users/:uid/demos', requirePermission('demos:write'), requireAdminOrOwner, async (req, res) => {
    const { uid } = req.params;
    const { allowedDemos } = req.body;

    if (!Array.isArray(allowedDemos)) {
      return res.status(400).json({ error: 'allowedDemos must be an array' });
    }

    try {
      const db = await getKiwiDb(getMongoClient);

      // Check if user exists
      const user = await db.collection('userAccess').findOne({ uid });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const oldDemos = user.allowedDemos || [];

      // Update allowed demos
      await db.collection('userAccess').updateOne(
        { uid },
        {
          $set: {
            allowedDemos,
            updatedBy: req.user.email,
            updatedAt: new Date(),
          },
        }
      );

      // Log to audit
      await logAudit(db, 'user.demosAssigned', req.userAccess, { type: 'user', uid, email: user.email }, {
        before: oldDemos,
        after: allowedDemos,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Error updating demos:', error);
      return res.status(500).json({ error: 'Failed to update demos' });
    }
  });

  /**
   * GET /rbac/audit-log
   * View audit log
   * Requires: users:read permission (owner, admin)
   */
  router.get('/audit-log', requirePermission('users:read'), async (req, res) => {
    const { limit = 100, skip = 0, action, actorEmail } = req.query;

    try {
      const db = await getKiwiDb(getMongoClient);

      // Build filter
      const filter = {};
      if (action) {
        filter.action = action;
      }
      if (actorEmail) {
        filter['actor.email'] = actorEmail;
      }

      const logs = await db
        .collection('auditLog')
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();

      const total = await db.collection('auditLog').countDocuments(filter);

      return res.json({
        logs,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  /**
   * GET /rbac/me
   * Get current user's access info
   */
  router.get('/me', requirePermission('settings:read:self'), async (req, res) => {
    try {
      const db = await getKiwiDb(getMongoClient);
      const user = await db.collection('userAccess').findOne({
        uid: req.user.uid,
        status: 'granted',
      });

      if (!user) {
        return res.status(404).json({ error: 'User access not found' });
      }

      return res.json({ user });
    } catch (error) {
      console.error('Error getting user info:', error);
      return res.status(500).json({ error: 'Failed to get user info' });
    }
  });

  /**
   * GET /rbac/demos
   * List all demos
   * Requires: demos:read permission
   */
  router.get('/demos', requirePermission('demos:read'), async (req, res) => {
    try {
      const db = await getKiwiDb(getMongoClient);
      const demos = await db.collection('demos').find({}).toArray();

      return res.json({ demos });
    } catch (error) {
      console.error('Error listing demos:', error);
      return res.status(500).json({ error: 'Failed to list demos' });
    }
  });

  return router;
}

module.exports = createRBACRouter;
