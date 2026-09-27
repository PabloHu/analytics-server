/**
 * API Key Validation Middleware
 * Validates X-API-Key header against MongoDB apiKeys collection
 */

async function validateApiKey(db) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    try {
      const database = await db();
      const keyRecord = await database.collection('apiKeys').findOne({
        key: apiKey,
        active: true
      });

      if (!keyRecord) {
        return res.status(403).json({ error: 'Invalid or inactive API key' });
      }

      // Track usage
      await database.collection('apiKeys').updateOne(
        { key: apiKey },
        {
          $set: { lastUsed: new Date() },
          $inc: { requestCount: 1 }
        }
      );

      // Attach client info to request
      req.client = {
        name: keyRecord.name,
        domain: keyRecord.domain,
        key: keyRecord.key
      };

      next();
    } catch (err) {
      console.error('API key validation error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Master Key Validation Middleware
 * Validates X-Master-Key header for admin endpoints
 */
function validateMasterKey(req, res, next) {
  const masterKey = req.headers['x-master-key'];

  if (!masterKey || masterKey !== process.env.MASTER_API_KEY) {
    return res.status(403).json({ error: 'Invalid or missing master key' });
  }

  next();
}

module.exports = { validateApiKey, validateMasterKey };
