const express = require('express');
const { validateApiKey } = require('../middleware/apiKey');

function createTrackRouter(db) {
  const router = express.Router();

  /**
   * POST /track
   * Track a page view
   */
  router.post('/track', async (req, res) => {
    // Validate API key
    const apiKeyMiddleware = await validateApiKey(db);

    apiKeyMiddleware(req, res, async () => {
      const { url, referrer, sessionId, screenWidth } = req.body;

      // Validate required fields
      if (!url) {
        return res.status(400).json({ error: 'url is required' });
      }

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      try {
        const database = await db();
        const collection = database.collection('pageViews');

        // Deduplication: check if same session viewed same URL in last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentView = await collection.findOne({
          url,
          sessionId,
          timestamp: { $gte: fiveMinutesAgo }
        });

        if (recentView) {
          return res.json({ success: true, skipped: true });
        }

        // Extract client identifier from domain
        const client = req.client.domain.split('.')[0]; // e.g., "frutasdelcampo" from "frutasdelcampo.com"

        // Insert page view
        await collection.insertOne({
          url,
          referrer: referrer || 'direct',
          sessionId,
          timestamp: new Date(),
          userAgent: req.headers['user-agent'] || 'unknown',
          screenWidth: screenWidth || null,
          client,
          domain: req.client.domain
        });

        return res.json({ success: true });
      } catch (err) {
        console.error('Tracking error:', err);
        return res.status(500).json({ error: 'Failed to track page view' });
      }
    });
  });

  return router;
}

module.exports = createTrackRouter;
