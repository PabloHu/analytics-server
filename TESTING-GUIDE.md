# Analytics Server Testing Guide

## Overview
Complete testing checklist to verify the analytics server is working correctly.

---

## Pre-Deployment Testing (Local)

### 1. Start Server Locally

```bash
cd /Users/phuaman/KiwiDocuments/work/backend/analytics-server
npm install
node server.js
```

Expected output:
```
🍃 MongoDB connected
📊 Analytics server running on http://localhost:3100
```

### 2. Test Health Endpoint

```bash
curl http://localhost:3100/health
```

Expected response:
```json
{"status":"ok","uptime":5,"timestamp":"2026-09-27T20:00:00.000Z","mongodb":"connected"}
```

### 3. Test Admin Endpoints

**List API Keys**:
```bash
curl http://localhost:3100/admin/keys \
  -H "X-Master-Key: master_kiwichito_analytics_2024"
```

Expected: Array of 3 API keys

**Create New API Key**:
```bash
curl -X POST http://localhost:3100/admin/keys \
  -H "X-Master-Key: master_kiwichito_analytics_2024" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Website",
    "domain": "test.com"
  }'
```

Expected: New API key object

### 4. Test Tracking Endpoint

```bash
curl -X POST http://localhost:3100/track \
  -H "X-API-Key: ak_frutasdelcampo_c1ae2a2f-3e36-4bd8-91fb-3f30f737de7c" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3100/test",
    "referrer": "direct",
    "sessionId": "test-session-123",
    "screenWidth": 1920
  }'
```

Expected response:
```json
{"success":true}
```

### 5. Verify Data in MongoDB

```bash
mongosh

use analyticsDb
db.pageViews.find().sort({timestamp: -1}).limit(1).pretty()
```

Should show the test page view you just created.

### 6. Test Deduplication

Run the same tracking request twice within 5 minutes:
```bash
# First request - should succeed
curl -X POST http://localhost:3100/track \
  -H "X-API-Key: ak_frutasdelcampo_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://test.com/page",
    "sessionId": "same-session",
    "referrer": "direct",
    "screenWidth": 1920
  }'

# Second request - should be skipped
curl -X POST http://localhost:3100/track \
  -H "X-API-Key: ak_frutasdelcampo_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://test.com/page",
    "sessionId": "same-session",
    "referrer": "direct",
    "screenWidth": 1920
  }'
```

Expected second response:
```json
{"success":true,"skipped":true}
```

### 7. Test Rate Limiting

```bash
# Send 65 requests rapidly (exceeds 60/min limit)
for i in {1..65}; do
  curl http://localhost:3100/health
done
```

After 60 requests, should receive:
```json
{"error":"Too many requests, please try again later"}
```

### 8. Test Static File Serving

```bash
curl http://localhost:3100/analytics.js
curl http://localhost:3100/analytics.min.js
```

Should return JavaScript file content.

---

## Post-Deployment Testing (Raspberry Pi)

### 1. Verify Docker Container

```bash
ssh kiwichito@192.168.12.179

# Check container is running
docker ps | grep analytics-server

# Check logs
docker logs analytics-server --tail 50
```

Expected in logs:
```
🍃 MongoDB connected
📊 Analytics server running on http://0.0.0.0:3100
```

### 2. Test Local Access

```bash
ssh kiwichito@192.168.12.179
curl http://localhost:3100/health
```

Expected:
```json
{"status":"ok","uptime":123,"timestamp":"...","mongodb":"connected"}
```

### 3. Test From Your Mac

```bash
# From your Mac (local network)
curl http://192.168.12.179:3100/health
```

Should work if firewall allows.

### 4. Test DNS Resolution

After configuring DNS:

```bash
# Check DNS
nslookup analytics.kiwichito.com

# Test health endpoint
curl https://analytics.kiwichito.com/health
```

### 5. Test SSL Certificate

If using Cloudflare Tunnel or Caddy:

```bash
# Check SSL certificate
curl -vI https://analytics.kiwichito.com/health 2>&1 | grep -i "SSL\|TLS\|certificate"

# Verify HTTPS works
curl https://analytics.kiwichito.com/health
```

Should see valid SSL certificate.

---

## Browser Testing

### 1. Test Analytics Script Loading

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Analytics Test</title>
  <script
    src="https://analytics.kiwichito.com/analytics.min.js"
    data-api-key="ak_frutasdelcampo_c1ae2a2f-3e36-4bd8-91fb-3f30f737de7c"
    defer
  ></script>
</head>
<body>
  <h1>Test Page</h1>
  <button onclick="testTracking()">Test Manual Track</button>
  <button onclick="showSession()">Show Session ID</button>

  <script>
    function testTracking() {
      window.kiwiAnalytics.track();
      console.log('✅ Manual track sent');
    }

    function showSession() {
      const sessionId = window.kiwiAnalytics.getSessionId();
      alert('Session ID: ' + sessionId);
    }
  </script>
</body>
</html>
```

### 2. Open in Browser

1. Open the test HTML in Chrome/Firefox
2. Open DevTools (F12)
3. Go to Console tab

### 3. Check Script Loaded

In console, type:
```javascript
window.kiwiAnalytics
```

Expected output:
```javascript
{track: ƒ, getSessionId: ƒ}
```

### 4. Check Session ID

In console, type:
```javascript
window.kiwiAnalytics.getSessionId()
```

Expected: UUID like `"a1b2c3d4-1234-4567-8901-abcdef123456"`

### 5. Check Network Request

1. Go to Network tab
2. Filter by XHR/Fetch
3. Reload page
4. Look for POST request to `https://analytics.kiwichito.com/track`
5. Click on it
6. Check:
   - Status: `200 OK`
   - Request Headers: Contains `X-API-Key`
   - Request Payload: Contains `url`, `sessionId`, etc.
   - Response: `{"success":true}`

### 6. Test Navigation Tracking (SPA)

Create a simple SPA test:

```html
<!DOCTYPE html>
<html>
<head>
  <title>SPA Test</title>
  <script
    src="https://analytics.kiwichito.com/analytics.min.js"
    data-api-key="ak_frutasdelcampo_c1ae2a2f-3e36-4bd8-91fb-3f30f737de7c"
    defer
  ></script>
</head>
<body>
  <div id="app"></div>
  <button onclick="navigate('page1')">Page 1</button>
  <button onclick="navigate('page2')">Page 2</button>
  <button onclick="navigate('page3')">Page 3</button>

  <script>
    function navigate(page) {
      // Simulate SPA navigation
      history.pushState({page}, page, '/' + page);
      document.getElementById('app').innerHTML = '<h1>' + page + '</h1>';
    }
  </script>
</body>
</html>
```

Click buttons and verify each navigation triggers a tracking request in Network tab.

### 7. Test Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

---

## Database Verification

### 1. Check Page Views Collection

```bash
ssh kiwichito@192.168.12.179
mongosh

use analyticsDb

// Count total page views
db.pageViews.countDocuments()

// View recent page views
db.pageViews.find().sort({timestamp: -1}).limit(10).pretty()

// Group by client
db.pageViews.aggregate([
  { $group: { _id: "$client", count: { $sum: 1 } } }
])

// Group by URL
db.pageViews.aggregate([
  { $group: { _id: "$url", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])
```

### 2. Check API Keys Collection

```bash
mongosh

use analyticsDb

// List all API keys
db.apiKeys.find().pretty()

// Check request counts
db.apiKeys.find({}, {name: 1, domain: 1, requestCount: 1, lastUsed: 1})
```

### 3. Verify TTL Index

```bash
mongosh

use analyticsDb

// Check indexes
db.pageViews.getIndexes()

// Should see index with expireAfterSeconds: 7776000 (90 days)
```

### 4. Test Data Cleanup

```bash
# Insert old document (should be deleted automatically)
db.pageViews.insertOne({
  url: "http://test.com/old",
  sessionId: "old-session",
  timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
  client: "Test",
  domain: "test.com"
})

// Wait a minute, then check if it was deleted
db.pageViews.find({sessionId: "old-session"})
// Should return empty (TTL index deleted it)
```

---

## Analytics API Testing

### 1. Test Stats Endpoint

```bash
curl https://analytics.kiwichito.com/admin/stats \
  -H "X-Master-Key: master_kiwichito_analytics_2024"
```

Expected response with aggregated data:
```json
{
  "totalViews": 1234,
  "last24Hours": 45,
  "topPages": [...],
  "topReferrers": [...],
  "byClient": [...]
}
```

### 2. Test Filtering

```bash
# Stats for specific client
curl https://analytics.kiwichito.com/admin/stats?client=Frutales%20del%20Campo \
  -H "X-Master-Key: master_kiwichito_analytics_2024"
```

---

## Performance Testing

### 1. Load Test

Use Apache Bench:

```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 \
  -H "X-API-Key: ak_frutasdelcampo_..." \
  -H "Content-Type: application/json" \
  -p tracking-payload.json \
  https://analytics.kiwichito.com/track
```

Create `tracking-payload.json`:
```json
{
  "url": "http://test.com",
  "referrer": "direct",
  "sessionId": "load-test-session",
  "screenWidth": 1920
}
```

Check results:
- Time per request should be < 100ms
- No failed requests (after rate limit)

### 2. Memory Usage

```bash
ssh kiwichito@192.168.12.179

# Check Docker container stats
docker stats analytics-server --no-stream
```

Memory should stay under 100MB.

### 3. MongoDB Performance

```bash
mongosh

use analyticsDb

// Explain query plan (should use index)
db.pageViews.find({url: "http://test.com"}).sort({timestamp: -1}).explain("executionStats")

// Check index usage
db.pageViews.aggregate([
  { $indexStats: {} }
])
```

---

## Security Testing

### 1. Test Without API Key

```bash
curl -X POST https://analytics.kiwichito.com/track \
  -H "Content-Type: application/json" \
  -d '{"url":"http://test.com","sessionId":"test"}'
```

Expected:
```json
{"error":"Invalid or inactive API key"}
```

### 2. Test With Invalid API Key

```bash
curl -X POST https://analytics.kiwichito.com/track \
  -H "X-API-Key: invalid_key_123" \
  -H "Content-Type: application/json" \
  -d '{"url":"http://test.com","sessionId":"test"}'
```

Expected:
```json
{"error":"Invalid or inactive API key"}
```

### 3. Test Admin Endpoints Without Master Key

```bash
curl https://analytics.kiwichito.com/admin/keys
```

Expected:
```json
{"error":"Unauthorized - master key required"}
```

### 4. Test CORS

```bash
# Request from unauthorized origin
curl -X POST https://analytics.kiwichito.com/track \
  -H "Origin: https://evil.com" \
  -H "X-API-Key: ak_frutasdelcampo_..." \
  -H "Content-Type: application/json" \
  -d '{"url":"http://test.com","sessionId":"test"}'
```

Should be blocked by CORS (check browser console for CORS error).

---

## Monitoring

### 1. Set Up Log Monitoring

```bash
ssh kiwichito@192.168.12.179

# Watch logs in real-time
docker logs analytics-server -f

# Check for errors
docker logs analytics-server | grep -i "error"
```

### 2. Monitor MongoDB

```bash
mongosh

use analyticsDb

// Current operations
db.currentOp()

// Server status
db.serverStatus()

// Collection stats
db.pageViews.stats()
```

### 3. Monitor System Resources

```bash
ssh kiwichito@192.168.12.179

# CPU and memory
htop

# Disk usage
df -h

# Network connections
sudo netstat -tulpn | grep 3100
```

---

## Troubleshooting Checklist

| Issue | Check | Fix |
|-------|-------|-----|
| Server won't start | Docker logs | `docker restart analytics-server` |
| MongoDB connection failed | MongoDB running | `sudo systemctl start mongod` |
| Tracking not working | API key valid | Check `/admin/keys` |
| CORS errors | Origin whitelisted | Update server.js CORS config |
| No data in DB | Deduplication | Wait 5 minutes, try different session |
| SSL errors | Certificate valid | Check Caddy/Cloudflare config |
| Rate limit errors | Too many requests | Wait 1 minute |

---

## Success Criteria

✅ All tests pass:
- [x] Health endpoint returns 200
- [x] Admin endpoints require master key
- [x] Tracking endpoint accepts API key
- [x] Data appears in MongoDB
- [x] Deduplication works
- [x] Rate limiting works
- [x] Static files served
- [x] Browser script loads
- [x] SPA navigation tracked
- [x] TTL index deletes old data
- [x] CORS blocks unauthorized origins
- [x] Invalid API keys rejected

✅ Production ready when:
- Server runs on Pi with Docker
- DNS resolves to Pi
- SSL certificate valid
- All 3 websites integrated
- Data flowing to MongoDB
- No errors in logs
