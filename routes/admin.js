const express = require('express');
const crypto = require('crypto');
const analyticsAdmin = require('../middleware/analyticsAdmin');
const { ObjectId } = require('mongodb');

function createAdminRouter(db, getMongoClient) {
  const router = express.Router();

  router.use(analyticsAdmin(getMongoClient));

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

  /**
   * GET /admin/stats/over-time
   * Get views over time (daily aggregation)
   */
  router.get('/stats/over-time', async (req, res) => {
    const { client, days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
      };
      if (client) {
        filter.client = client;
      }

      const viewsOverTime = await collection.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            views: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      return res.json(viewsOverTime);
    } catch (err) {
      console.error('Error getting views over time:', err);
      return res.status(500).json({ error: 'Failed to get views over time' });
    }
  });

  /**
   * GET /admin/stats/by-country
   * Get views by country
   */
  router.get('/stats/by-country', async (req, res) => {
    const { days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        country: { $exists: true, $ne: null }
      };

      const byCountry = await collection.aggregate([
        { $match: filter },
        { $group: { _id: '$country', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 20 },
        { $project: { country: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      return res.json(byCountry);
    } catch (err) {
      console.error('Error getting views by country:', err);
      return res.status(500).json({ error: 'Failed to get views by country' });
    }
  });

  /**
   * GET /admin/stats/by-device
   * Get views by device type (mobile vs desktop)
   */
  router.get('/stats/by-device', async (req, res) => {
    const { days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
      };

      const byDevice = await collection.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $cond: {
                if: { $eq: ['$touchSupport', true] },
                then: 'Mobile',
                else: 'Desktop'
              }
            },
            views: { $sum: 1 }
          }
        },
        { $sort: { views: -1 } },
        { $project: { device: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      return res.json(byDevice);
    } catch (err) {
      console.error('Error getting views by device:', err);
      return res.status(500).json({ error: 'Failed to get views by device' });
    }
  });

  /**
   * GET /admin/stats/by-platform
   * Get views by platform (OS/Browser)
   */
  router.get('/stats/by-platform', async (req, res) => {
    const { days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        platform: { $exists: true, $ne: null }
      };

      const byPlatform = await collection.aggregate([
        { $match: filter },
        { $group: { _id: '$platform', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { platform: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      return res.json(byPlatform);
    } catch (err) {
      console.error('Error getting views by platform:', err);
      return res.status(500).json({ error: 'Failed to get views by platform' });
    }
  });

  /**
   * GET /admin/stats/by-language
   * Get views by language
   */
  router.get('/stats/by-language', async (req, res) => {
    const { days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        language: { $exists: true, $ne: null }
      };

      const byLanguage = await collection.aggregate([
        { $match: filter },
        { $group: { _id: '$language', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { language: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      return res.json(byLanguage);
    } catch (err) {
      console.error('Error getting views by language:', err);
      return res.status(500).json({ error: 'Failed to get views by language' });
    }
  });

  /**
   * GET /admin/stats/by-timezone
   * Get views by timezone
   */
  router.get('/stats/by-timezone', async (req, res) => {
    const { days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        timezone: { $exists: true, $ne: null }
      };

      const byTimezone = await collection.aggregate([
        { $match: filter },
        { $group: { _id: '$timezone', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { timezone: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      return res.json(byTimezone);
    } catch (err) {
      console.error('Error getting views by timezone:', err);
      return res.status(500).json({ error: 'Failed to get views by timezone' });
    }
  });

  /**
   * GET /admin/stats/performance
   * Get average performance metrics
   */
  router.get('/stats/performance', async (req, res) => {
    const { days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        'performance.pageLoadTime': { $exists: true }
      };

      const avgPerformance = await collection.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avgPageLoadTime: { $avg: '$performance.pageLoadTime' },
            avgDomContentLoadedTime: { $avg: '$performance.domContentLoadedTime' },
            avgTimeToFirstByte: { $avg: '$performance.timeToFirstByte' },
            avgDomInteractive: { $avg: '$performance.domInteractive' },
            avgResourceLoadTime: { $avg: '$performance.resourceLoadTime' },
            count: { $sum: 1 }
          }
        },
        { $project: { _id: 0 } }
      ]).toArray();

      return res.json(avgPerformance[0] || {});
    } catch (err) {
      console.error('Error getting performance stats:', err);
      return res.status(500).json({ error: 'Failed to get performance stats' });
    }
  });

  /**
   * GET /admin/stats/by-resolution
   * Get views by screen resolution
   */
  router.get('/stats/by-resolution', async (req, res) => {
    const { days = 7 } = req.query;

    try {
      const database = await db();
      const collection = database.collection('pageViews');

      const filter = {
        timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        screenResolution: { $exists: true, $ne: null }
      };

      const byResolution = await collection.aggregate([
        { $match: filter },
        { $group: { _id: '$screenResolution', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { resolution: '$_id', views: 1, _id: 0 } }
      ]).toArray();

      return res.json(byResolution);
    } catch (err) {
      console.error('Error getting views by resolution:', err);
      return res.status(500).json({ error: 'Failed to get views by resolution' });
    }
  });

  return router;
}

module.exports = createAdminRouter;
