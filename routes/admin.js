const express = require('express');
const crypto = require('crypto');
const { validateMasterKey } = require('../middleware/apiKey');
const { ObjectId } = require('mongodb');

function createAdminRouter(db) {
  const router = express.Router();

  // All admin routes require master key
  router.use(validateMasterKey);

  /**
   * GET /admin/keys
   * List all API keys
   */
  router.get('/keys', async (req, res) => {
    try {
      const database = await db();
      const keys = await database.collection('apiKeys')
        .find({})
        .project({ _id: 1, key: 1, name: 1, domain: 1, active: 1, requestCount: 1, lastUsed: 1, createdAt: 1 })
        .toArray();

      return res.json(keys);
    } catch (err) {
      console.error('Error listing keys:', err);
      return res.status(500).json({ error: 'Failed to list API keys' });
    }
  });

  /**
   * POST /admin/keys
   * Create a new API key
   */
  router.post('/keys', async (req, res) => {
    const { name, domain } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ error: 'name and domain are required' });
    }

    try {
      const database = await db();

      // Generate API key
      const keyPrefix = name.toLowerCase().replace(/\s+/g, '');
      const key = `ak_${keyPrefix}_${crypto.randomUUID()}`;

      const newKey = {
        key,
        name,
        domain,
        active: true,
        createdAt: new Date(),
        requestCount: 0
      };

      await database.collection('apiKeys').insertOne(newKey);

      return res.json(newKey);
    } catch (err) {
      console.error('Error creating key:', err);
      return res.status(500).json({ error: 'Failed to create API key' });
    }
  });

  /**
   * PATCH /admin/keys/:id
   * Toggle active status of an API key
   */
  router.patch('/keys/:id', async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' });
    }

    try {
      const database = await db();
      const result = await database.collection('apiKeys').updateOne(
        { _id: new ObjectId(id) },
        { $set: { active } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'API key not found' });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('Error updating key:', err);
      return res.status(500).json({ error: 'Failed to update API key' });
    }
  });

  /**
   * GET /admin/stats
   * Get analytics summary
   */
  router.get('/stats', async (req, res) => {
    const { client, days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      // Build filter
      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
      };
      if (client) {
        filter.client = client;
      }

      // Total views
      const totalViews = await collection.countDocuments(filter);

      // Unique sessions
      const uniqueSessions = await collection.distinct('sessionId', filter);

      // Top pages
      const topPages = await collection.aggregate([
        { $match: filter },
        { $group: { _id: '$url', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { url: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      // Top referrers
      const topReferrers = await collection.aggregate([
        { $match: filter },
        { $group: { _id: '$referrer', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { referrer: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      // By client (if not filtered)
      let byClient = [];
      if (!client) {
        byClient = await collection.aggregate([
          { $match: filter },
          { $group: { _id: '$client', views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $project: { client: '$_id', views: 1, _id: 0 } }
        ]).toArray();
      }

      return res.json({
        totalViews,
        uniqueSessions: uniqueSessions.length,
        topPages,
        topReferrers,
        byClient
      });
    } catch (err) {
      console.error('Error getting stats:', err);
      return res.status(500).json({ error: 'Failed to get statistics' });
    }
  });

  return router;
}

module.exports = createAdminRouter;
