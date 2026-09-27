# Website-Specific Integration Instructions

## Overview
Step-by-step instructions for adding Kiwichito Analytics to each of your websites.

---

## 1. Frutales del Campo (frutasdelcampo.com)

**API Key**: `ak_frutasdelcampo_c1ae2a2f-3e36-4bd8-91fb-3f30f737de7c`

### Integration Steps

1. **Locate HTML Template**
   - Find your main HTML file (usually `index.html` or header template)
   - Open it in your editor

2. **Add Script Before `</head>`**
   ```html
   <!-- Kiwichito Analytics -->
   <script
     src="https://analytics.kiwichito.com/analytics.min.js"
     data-api-key="ak_frutasdelcampo_c1ae2a2f-3e36-4bd8-91fb-3f30f737de7c"
     defer
   ></script>
   ```

3. **Deploy Changes**
   - Commit and push your changes
   - Deploy to production

4. **Test**
   - Open https://frutasdelcampo.com in browser
   - Open DevTools > Console
   - Type: `window.kiwiAnalytics.getSessionId()`
   - Should return a UUID

---

## 2. Little Anime Shop (littleanimeshop.com)

**API Key**: `ak_littleanimeshop_1d34e63e-df78-43ce-bee0-6d22754fa4c4`

### Integration Steps

1. **Locate HTML Template**
   - If Angular: Edit `src/index.html`
   - If static: Edit main `index.html`

2. **Add Script Before `</head>`**
   ```html
   <!-- Kiwichito Analytics -->
   <script
     src="https://analytics.kiwichito.com/analytics.min.js"
     data-api-key="ak_littleanimeshop_1d34e63e-df78-43ce-bee0-6d22754fa4c4"
     defer
   ></script>
   ```

3. **Deploy Changes**
   - Build your application
   - Deploy to production

4. **Test**
   - Open https://littleanimeshop.com in browser
   - Navigate between pages
   - Check Network tab for POST requests to `/track`

---

## 3. Frutales del Carmelo (frutalesdelcarmelo.com)

**API Key**: `ak_frutalesdelcarmelo_3b1e8220-96f7-4b96-9f60-e46a2365ae1b`

### Integration Steps

1. **Locate HTML Template**
   - If Angular: Edit `src/index.html`
   - If React: Edit `public/index.html`
   - If static: Edit main `index.html`

2. **Add Script Before `</head>`**
   ```html
   <!-- Kiwichito Analytics -->
   <script
     src="https://analytics.kiwichito.com/analytics.min.js"
     data-api-key="ak_frutalesdelcarmelo_3b1e8220-96f7-4b96-9f60-e46a2365ae1b"
     defer
   ></script>
   ```

3. **Deploy Changes**
   - Build and deploy to production

4. **Test**
   - Open https://frutalesdelcarmelo.com in browser
   - Test navigation and page tracking

---

## General Testing Checklist

After adding the script to each website:

### 1. Console Test
```javascript
// Check if script loaded
window.kiwiAnalytics

// Get session ID
window.kiwiAnalytics.getSessionId()

// Manual track
window.kiwiAnalytics.track()
```

### 2. Network Test
- Open DevTools > Network
- Filter by XHR/Fetch
- Navigate between pages
- Look for POST to `https://analytics.kiwichito.com/track`
- Status should be `200 OK`

### 3. Database Verification

SSH into Pi:
```bash
ssh kiwichito@192.168.12.179
mongosh

use analyticsDb
db.pageViews.find({client: "Frutales del Campo"}).sort({timestamp: -1}).limit(5)
db.pageViews.find({client: "Little Anime Shop"}).sort({timestamp: -1}).limit(5)
db.pageViews.find({client: "Frutales del Carmelo"}).sort({timestamp: -1}).limit(5)
```

---

## Quick Copy-Paste Scripts

### Frutales del Campo
```html
<script src="https://analytics.kiwichito.com/analytics.min.js" data-api-key="ak_frutasdelcampo_c1ae2a2f-3e36-4bd8-91fb-3f30f737de7c" defer></script>
```

### Little Anime Shop
```html
<script src="https://analytics.kiwichito.com/analytics.min.js" data-api-key="ak_littleanimeshop_1d34e63e-df78-43ce-bee0-6d22754fa4c4" defer></script>
```

### Frutales del Carmelo
```html
<script src="https://analytics.kiwichito.com/analytics.min.js" data-api-key="ak_frutalesdelcarmelo_3b1e8220-96f7-4b96-9f60-e46a2365ae1b" defer></script>
```

---

## Troubleshooting

### Script not loading
- Check browser console for errors
- Verify analytics.kiwichito.com is accessible
- Check CORS errors (domain should be whitelisted)

### Tracking not working
- Verify API key is correct
- Check Network tab for failed requests
- Verify server is running: `curl https://analytics.kiwichito.com/health`

### No data in database
- Wait a few seconds after page load
- Check server logs: `ssh kiwichito@192.168.12.179 && docker logs analytics-server`
- Verify API key is active: `curl https://analytics.kiwichito.com/admin/keys -H "X-Master-Key: YOUR_MASTER_KEY"`

---

## Next Steps After Integration

1. ✅ Add script to all 3 websites
2. ⏭️ Monitor analytics data
3. ⏭️ Create dashboard (future enhancement)
4. ⏭️ Setup automated reports (future enhancement)
