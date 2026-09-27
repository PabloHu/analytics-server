# Frontend Integration Guide

## Overview
Add Kiwichito Analytics tracking script to your websites to start collecting page view analytics.

## Quick Start

### 1. Get Your API Key

Find your API key in `.env.keys` file or create a new one:

```bash
# Existing keys (from seed-keys.js)
# Frutales del Campo:     ak_frutasdelcampo_...
# Little Anime Shop:      ak_littleanimeshop_...
# Frutales del Carmelo:   ak_frutalesdelcarmelo_...
```

Or create a new key via API:
```bash
curl -X POST https://analytics.kiwichito.com/admin/keys \
  -H "X-Master-Key: YOUR_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Website",
    "domain": "example.com"
  }'
```

### 2. Add Script to Your Website

#### Option A: CDN (Recommended)
Add this to your HTML `<head>` tag:

```html
<script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="YOUR_API_KEY"
  defer
></script>
```

#### Option B: Self-Hosted
Download `analytics.min.js` and host it yourself:

```html
<script
  src="/js/analytics.min.js"
  data-api-key="YOUR_API_KEY"
  defer
></script>
```

#### Option C: Custom Endpoint
If you're using a different endpoint:

```html
<script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="YOUR_API_KEY"
  data-endpoint="https://custom.example.com/track"
  defer
></script>
```

## Integration Examples

### Static HTML Website

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Website</title>

  <!-- Kiwichito Analytics -->
  <script
    src="https://analytics.kiwichito.com/analytics.min.js"
    data-api-key="ak_frutasdelcampo_..."
    defer
  ></script>
</head>
<body>
  <h1>Welcome!</h1>
</body>
</html>
```

### Angular Application

**In `src/index.html`**:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Angular App</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Kiwichito Analytics -->
  <script
    src="https://analytics.kiwichito.com/analytics.min.js"
    data-api-key="ak_littleanimeshop_..."
    defer
  ></script>
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

The script automatically handles Angular Router navigation via History API.

### React Application

**In `public/index.html`**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My React App</title>

  <!-- Kiwichito Analytics -->
  <script
    src="https://analytics.kiwichito.com/analytics.min.js"
    data-api-key="ak_frutalesdelcarmelo_..."
    defer
  ></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

Automatic tracking works with React Router.

### Vue.js Application

**In `public/index.html`**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>My Vue App</title>

  <!-- Kiwichito Analytics -->
  <script
    src="https://analytics.kiwichito.com/analytics.min.js"
    data-api-key="YOUR_API_KEY"
    defer
  ></script>
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

Automatic tracking works with Vue Router.

### WordPress

**In theme `header.php` before `</head>`**:
```php
<!-- Kiwichito Analytics -->
<script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="<?php echo esc_attr(get_option('kiwi_analytics_key')); ?>"
  defer
></script>
```

Or use a plugin like "Insert Headers and Footers" to add the script.

## Advanced Usage

### Manual Tracking

Track custom events or page views programmatically:

```javascript
// Track current page manually
window.kiwiAnalytics.track();

// Get current session ID
const sessionId = window.kiwiAnalytics.getSessionId();
console.log('Session:', sessionId);
```

### Track SPA Navigation

The script automatically tracks:
- ✅ `pushState()` - New page navigation
- ✅ `replaceState()` - URL updates
- ✅ `popstate` - Back/forward buttons
- ✅ Initial page load

### Conditional Tracking

Only track in production:

```html
<script>
  if (window.location.hostname !== 'localhost') {
    const script = document.createElement('script');
    script.src = 'https://analytics.kiwichito.com/analytics.min.js';
    script.setAttribute('data-api-key', 'YOUR_API_KEY');
    script.defer = true;
    document.head.appendChild(script);
  }
</script>
```

### Multiple Domains

Use different API keys for each domain:

```html
<!-- frutasdelcampo.com -->
<script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="ak_frutasdelcampo_..."
  defer
></script>

<!-- littleanimeshop.com -->
<script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="ak_littleanimeshop_..."
  defer
></script>
```

## What Gets Tracked

The script automatically collects:

| Field | Description | Example |
|-------|-------------|---------|
| `url` | Full page URL | `https://example.com/products?id=123` |
| `referrer` | Previous page URL | `https://google.com` or `direct` |
| `sessionId` | Browser session ID (non-persistent) | `a1b2c3d4-...` |
| `screenWidth` | Screen width in pixels | `1920` |
| `timestamp` | When page view occurred | `2026-09-27T19:00:00.000Z` |
| `userAgent` | Browser user agent (server-side) | `Mozilla/5.0...` |
| `client` | Your website name (from API key) | `Frutas del Campo` |
| `domain` | Your website domain (from API key) | `frutasdelcampo.com` |

## Privacy Features

✅ **No cookies** - Session ID stored in sessionStorage only
✅ **No IP addresses** - Not stored in database
✅ **No personal data** - Only page URLs and screen width
✅ **Auto-delete** - Data deleted after 90 days (GDPR compliant)
✅ **Deduplication** - Same page within 5 minutes not tracked twice
✅ **Session-based** - Session ID resets when browser tab closes

## Testing

### 1. Open Browser Console
```javascript
// Check if script loaded
window.kiwiAnalytics
// Should show: {track: ƒ, getSessionId: ƒ}

// Get session ID
window.kiwiAnalytics.getSessionId()
// Should show: "a1b2c3d4-1234-4567-8901-abcdef123456"

// Manually track
window.kiwiAnalytics.track()
// Check Network tab for POST request to /track
```

### 2. Check Network Tab
- Open DevTools > Network
- Filter: XHR
- Navigate to different pages
- Look for POST requests to `https://analytics.kiwichito.com/track`
- Status should be `200 OK`

### 3. Verify in Database

SSH into Pi and check MongoDB:
```bash
ssh kiwichito@192.168.12.179
mongosh

use analyticsDb
db.pageViews.find().sort({timestamp: -1}).limit(5).pretty()
```

You should see your recent page views.

## Troubleshooting

### Script not loading

**Check CORS**: Make sure your domain is in server's CORS whitelist.

**Check API key**: Verify key is correct in `data-api-key` attribute.

**Check console**: Open browser console for errors.

### Tracking not working

**Check Network tab**: Look for failed POST requests.

**Test manually**:
```javascript
window.kiwiAnalytics.track()
```

**Check server logs**:
```bash
ssh kiwichito@192.168.12.179
docker logs analytics-server -f
```

### Duplicates appearing

The script has built-in deduplication (5-minute window). If you see duplicates:
- User might have multiple tabs open
- User might have cleared sessionStorage
- Check if you're calling `track()` manually multiple times

### SPA not tracking navigation

The script should auto-track, but if not:
```javascript
// Manually track after route changes
router.afterEach(() => {
  window.kiwiAnalytics?.track();
});
```

## Performance

- **Size**: ~2KB minified
- **Load time**: <50ms (deferred)
- **Network**: 1 request per page view
- **Impact**: Negligible on page load

## Next Steps

After integration:
1. ✅ Add script to all websites
2. ⏭️ Test in browser
3. ⏭️ Verify data in MongoDB
4. ⏭️ View analytics via admin endpoints

---

## Example: Complete Integration

**Frutales del Campo (frutasdelcampo.com)**:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Frutales del Carmelo</title>

  <!-- Kiwichito Analytics -->
  <script
    src="https://analytics.kiwichito.com/analytics.min.js"
    data-api-key="ak_frutasdelcampo_c1ae2a2f-3e36-4bd8-91fb-3f30f737de7c"
    defer
  ></script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

Done! Analytics are now being collected. 🎉
