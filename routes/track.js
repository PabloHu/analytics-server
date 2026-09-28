const express = require('express');
const geoip = require('geoip-lite');
const { validateApiKey } = require('../middleware/apiKey');

function createTrackRouter(db) {
  const router = express.Router();

  /**
   * Helper function to get client IP address
   */
  function getClientIp(req) {
    // Check for IP from various headers (Cloudflare, nginx, etc.)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return req.headers['x-real-ip'] ||
           req.headers['cf-connecting-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Helper function to get geolocation from IP
   */
  function getGeolocation(ip) {
    // Clean up IP (remove IPv6 prefix if present)
    const cleanIp = ip.replace(/^::ffff:/, '');

    // Skip private/local IPs
    if (cleanIp === 'unknown' ||
        cleanIp.startsWith('127.') ||
        cleanIp.startsWith('192.168.') ||
        cleanIp.startsWith('10.') ||
        cleanIp === '::1') {
      return { country: 'Local', countryCode: 'LOCAL', city: null, region: null };
    }

    const geo = geoip.lookup(cleanIp);

    if (!geo) {
      return { country: 'Unknown', countryCode: 'XX', city: null, region: null };
    }

    return {
      country: geo.country,
      countryCode: geo.country,
      city: geo.city || null,
      region: geo.region || null,
      timezone: geo.timezone || null,
      ll: geo.ll || null  // [latitude, longitude]
    };
  }

  /**
   * POST /track
   * Track a page view
   */
  router.post('/track', async (req, res) => {
    // Validate API key
    const apiKeyMiddleware = await validateApiKey(db);

    apiKeyMiddleware(req, res, async () => {
      const {
        url,
        referrer,
        sessionId,
        // Screen & Display
        screenWidth,
        screenHeight,
        screenResolution,
        viewportWidth,
        viewportHeight,
        devicePixelRatio,
        colorDepth,
        // Locale & Preferences
        language,
        languages,
        timezone,
        timezoneOffset,
        // Platform & Device
        platform,
        hardwareConcurrency,
        deviceMemory,
        maxTouchPoints,
        touchSupport,
        // Network
        connectionType,
        connectionDownlink,
        connectionRtt,
        saveData,
        // Performance
        performance
      } = req.body;

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

        // Get geolocation from IP
        const clientIp = getClientIp(req);
        const geo = getGeolocation(clientIp);

        // Extract client identifier from domain
        const client = req.client.domain.split('.')[0]; // e.g., "frutasdelcampo" from "frutasdelcampo.com"

        // Insert page view with all collected data
        await collection.insertOne({
          // Basic tracking
          url,
          referrer: referrer || 'direct',
          sessionId,
          timestamp: new Date(),

          // User Agent
          userAgent: req.headers['user-agent'] || 'unknown',

          // Geolocation (from IP)
          country: geo.country,
          countryCode: geo.countryCode,
          city: geo.city,
          region: geo.region,
          geoTimezone: geo.timezone,
          coordinates: geo.ll,

          // Screen & Display
          screenWidth: screenWidth || null,
          screenHeight: screenHeight || null,
          screenResolution: screenResolution || null,
          viewportWidth: viewportWidth || null,
          viewportHeight: viewportHeight || null,
          devicePixelRatio: devicePixelRatio || null,
          colorDepth: colorDepth || null,

          // Locale & Preferences
          language: language || null,
          languages: languages || null,
          timezone: timezone || null,
          timezoneOffset: timezoneOffset || null,

          // Platform & Device
          platform: platform || null,
          hardwareConcurrency: hardwareConcurrency || null,
          deviceMemory: deviceMemory || null,
          maxTouchPoints: maxTouchPoints || null,
          touchSupport: touchSupport || false,

          // Network
          connectionType: connectionType || null,
          connectionDownlink: connectionDownlink || null,
          connectionRtt: connectionRtt || null,
          saveData: saveData || false,

          // Performance
          performance: performance || null,

          // Client identification
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
