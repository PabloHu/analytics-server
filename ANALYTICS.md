# Analytics Server - Current State & Features

**Repository:** https://github.com/PabloHu/analytics-server  
**Status:** ✅ Deployed & Operational  
**Version:** v1.1.0 (Enhanced Browser Data)  
**Last Updated:** 2026-09-28

---

## Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Data Collection](#data-collection)
4. [Privacy Features](#privacy-features)
5. [Website Integrations](#website-integrations)
6. [API Endpoints](#api-endpoints)
7. [Viewing Analytics Data](#viewing-analytics-data)
8. [Maintenance](#maintenance)
9. [Future Enhancements](#future-enhancements)

---

## Overview

**Kiwichito Analytics** is a privacy-friendly, self-hosted analytics solution that tracks page views across all your websites. Built with Node.js + Express, it provides valuable insights while respecting user privacy.

**Key Principles:**
- ✅ No cookies (sessionStorage only)
- ✅ No IP address storage
- ✅ No personal identifiable information
- ✅ GDPR compliant (no consent banner needed)
- ✅ Open source and self-hosted

---

## Current Status

### Deployment

| Component | Value |
|-----------|-------|
| **Server** | Raspberry Pi 4 |
| **Port** | 3100 |
| **Local URL** | http://192.168.12.179:3100 |
| **Public URL** | https://analytics.kiwichito.com |
| **Container** | analytics-server |
| **Image** | ghcr.io/pablohu/analytics-server:latest |
| **Database** | MongoDB (port 27017, analyticsDb) |
| **Status** | ✅ Running |

### CI/CD

| Workflow | Status | Description |
|----------|--------|-------------|
| **CI** | ✅ Active | Build & push Docker image to GHCR |
| **Deploy** | ✅ Active | Auto-deploy to Raspberry Pi via workflow_run |
| **Method** | Registry-based | Pull pre-built ARM64 images from GHCR |

**Deployment Flow:**
1. Push to main → CI builds Docker image
2. CI pushes to GHCR (ghcr.io/pablohu/analytics-server:latest)
3. Deploy workflow pulls image to Raspberry Pi
4. Container restart with new image

---

## Data Collection

### v1.1.0 - Enhanced Browser Data (2026-09-28)

#### 🌍 Geographic Information
- **Country** (e.g., "United States", "Mexico")
- **Country Code** (e.g., "US", "MX")  
- **City** (e.g., "San Francisco")
- **Region** (e.g., "California")
- **Coordinates** (latitude, longitude)
- **IP Address:** ❌ NOT stored (privacy-friendly)

**Source:** Cloudflare CDN headers (`CF-IPCountry`, `CF-IPCity`, etc.)

#### 📱 Device Information
- **Screen Resolution** (e.g., "1920x1080", "393x852")
- **Viewport Size** (visible browser area)
- **Device Pixel Ratio** (1 = standard, 2-3 = retina/high-DPI)
- **Platform** (Mac, Windows, Android, iOS, Linux)
- **CPU Cores** (if available via navigator.hardwareConcurrency)
- **RAM** (if available via navigator.deviceMemory)
- **Touch Support** (boolean - mobile vs desktop detection)

**Source:** JavaScript `navigator` API, `window.screen`, `window.devicePixelRatio`

#### ⚡ Performance Metrics
- **Page Load Time** (total time in milliseconds)
- **Time to First Byte (TTFB)** (server response time)
- **DOM Interactive** (when DOM is ready for interaction)
- **DOM Content Loaded** (when scripts finish loading)
- **Resource Load Time** (images, CSS, fonts, etc.)

**Source:** `performance.timing` API

#### 🌐 Locale & Network
- **Language** (e.g., "en-US", "es-MX")
- **Languages** (array of all preferred languages)
- **Timezone** (e.g., "America/Los_Angeles")
- **Connection Type** (4G, 3G, WiFi, etc.)
- **Connection Speed** (Mbps, if available)
- **Data Saver Mode** (enabled/disabled)

**Source:** `navigator.language`, `navigator.connection`, `Intl.DateTimeFormat`

#### 🔗 Navigation
- **URL** (full page path)
- **Referrer** (where visitor came from, "direct" if none)
- **Session ID** (unique per browser tab, resets on close)
- **Timestamp** (ISO 8601 format)

**Source:** `window.location`, `document.referrer`, sessionStorage

---

## Privacy Features

| Feature | Status | Details |
|---------|--------|---------|
| **No Cookies** | ✅ | Uses sessionStorage only (clears on tab close) |
| **No IP Storage** | ✅ | Only stores country/city derived from Cloudflare headers |
| **No Personal Data** | ✅ | Only collects device/performance info, no PII |
| **Auto-Delete** | ✅ | Data deleted after 90 days (GDPR compliant) |
| **Session-Based** | ✅ | Tracking resets when tab closes |
| **No Cross-Site Tracking** | ✅ | Each website tracked independently via API keys |
| **Open Source** | ✅ | All code public on GitHub |

**GDPR Compliant:** No consent banner needed (no cookies, no personal identifiable information).

**What We DON'T Collect:**
- ❌ IP addresses
- ❌ Names, emails, or contact info
- ❌ Passwords or credentials
- ❌ Payment information
- ❌ Persistent tracking cookies
- ❌ Cross-site user identification

---

## Website Integrations

### ✅ Integrated Websites

All websites use the same script tag pattern with unique API keys:

#### 1. Kiwichito Demos (kiwichito.com)

**Status:** ✅ Deployed  
**API Key:** `ak_kiwitochitodemos_ac6e1369-bb20-4e40-a422-adfacdbe6c33`

**Integration (Angular):**
```html
<!-- src/index.html -->
<script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="ak_kiwitochitodemos_ac6e1369-bb20-4e40-a422-adfacdbe6c33"
  defer
></script>
```

#### 2. Little Anime Shop (littleanimeshop.com)

**Status:** ✅ Deployed  
**API Key:** `ak_littleanimeshop_1d34e63e-df78-43ce-bee0-6d22754fa4c4`

**Integration (Vanilla JS):**
```html
<!-- index.html -->
<script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="ak_littleanimeshop_1d34e63e-df78-43ce-bee0-6d22754fa4c4"
  defer
></script>
```

#### 3. Frutales del Carmelo (frutalesdelcarmelo.com)

**Status:** ✅ Deployed  
**API Key:** `ak_frutalesdelcarmelo_3b1e8220-96f7-4b96-9f60-e46a2365ae1b`

**Integration (Next.js):**
```tsx
// app/[locale]/layout.tsx
import Script from 'next/script'

<Script
  src="https://analytics.kiwichito.com/analytics.min.js"
  data-api-key="ak_frutalesdelcarmelo_3b1e8220-96f7-4b96-9f60-e46a2365ae1b"
  strategy="afterInteractive"
/>
```

### Technical Features

#### Deduplication
Same URL + session ID within 5 minutes = counted once  
(Prevents double-counting on page refreshes)

#### SPA Support
Automatically tracks:
- Angular Router navigation
- React Router navigation  
- Vue Router navigation
- History API (pushState/replaceState)

No additional configuration needed.

#### Performance
- **Script Size:** ~3KB minified + gzipped
- **Load Impact:** Deferred/async loading, non-blocking
- **Server Response:** < 50ms average
- **Database:** MongoDB with indexes on timestamp, sessionId, url

---

## API Endpoints

### Public Endpoints

#### GET `/analytics.min.js`
Returns minified tracking script

**Response:** JavaScript file  
**Cache:** Public, max-age=3600

#### POST `/track`
Records a page view

**Authentication:** API key in request body  
**Request Body:**
```json
{
  "apiKey": "ak_website_uuid",
  "url": "/projects/tiktok-live",
  "referrer": "https://google.com",
  "sessionId": "uuid-v4",
  "timestamp": "2026-09-28T08:00:00.000Z",
  "country": "United States",
  "city": "San Francisco",
  "screenResolution": "1920x1080",
  "platform": "Mac",
  "performance": {
    "pageLoadTime": 1234,
    "ttfb": 123,
    "domInteractive": 456
  }
}
```

**Response:**
```json
{ "success": true }
```

**Errors:**
- 403 Forbidden: Invalid or missing API key
- 400 Bad Request: Missing required fields

### Admin Endpoints

#### GET `/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-28T08:00:00.000Z",
  "database": "connected"
}
```

---

## Viewing Analytics Data

### Quick Queries (From Your Mac)

**Count total views:**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --quiet --eval "db.pageViews.countDocuments()"
```

**Recent views (last 10):**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "
db.pageViews.find().sort({timestamp: -1}).limit(10).pretty()
"
```

**Views by country:**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "
db.pageViews.aggregate([
  { \$group: { _id: '\$country', visits: { \$sum: 1 } } },
  { \$sort: { visits: -1 } }
])
"
```

**Average page load time:**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "
db.pageViews.aggregate([
  { \$match: { 'performance.pageLoadTime': { \$exists: true } } },
  { \$group: { _id: null, avgLoad: { \$avg: '\$performance.pageLoadTime' } } }
])
"
```

**Mobile vs Desktop (touch support):**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "
db.pageViews.aggregate([
  { \$group: { _id: '\$touchSupport', count: { \$sum: 1 } } }
])
"
```

**Views by website:**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "
db.pageViews.aggregate([
  { \$group: { _id: '\$apiKey', visits: { \$sum: 1 } } },
  { \$sort: { visits: -1 } }
])
"
```

**Top pages by views:**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "
db.pageViews.aggregate([
  { \$group: { _id: '\$url', views: { \$sum: 1 } } },
  { \$sort: { views: -1 } },
  { \$limit: 10 }
])
"
```

### From Raspberry Pi

```bash
ssh kiwichito@192.168.12.179
docker run --rm mongo:7 mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "db.pageViews.countDocuments()"
```

---

## Maintenance

### Check Health

```bash
curl https://analytics.kiwichito.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-28T08:00:00.000Z",
  "database": "connected"
}
```

### View Container Logs

```bash
ssh kiwichito@192.168.12.179
docker logs analytics-server --tail 50 --follow
```

### Restart Container

```bash
ssh kiwichito@192.168.12.179
docker restart analytics-server
```

### Check MongoDB Connection

```bash
ssh kiwichito@192.168.12.179
docker run --rm mongo:7 mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "db.runCommand({ ping: 1 })"
```

### Database Indexes

Current indexes for performance:

```javascript
db.pageViews.createIndex({ timestamp: -1 })
db.pageViews.createIndex({ sessionId: 1 })
db.pageViews.createIndex({ url: 1 })
db.pageViews.createIndex({ apiKey: 1 })
db.pageViews.createIndex({ country: 1 })
```

### Auto-Cleanup (90 days)

Analytics data is automatically deleted after 90 days (GDPR compliance).

**Check cleanup job:**
```bash
mongosh mongodb://192.168.12.179:27017/analyticsDb --eval "
db.pageViews.find({
  timestamp: { \$lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
}).count()
"
```

---

## Future Enhancements

### Planned Features

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| **Analytics Dashboard** | High | 📋 Planned | Web UI to visualize analytics data |
| **Real-time Views** | Medium | 📋 Planned | WebSocket connection for live view counts |
| **Custom Events** | Medium | 📋 Planned | Track button clicks, form submissions, etc. |
| **A/B Testing** | Low | 📋 Planned | Split testing framework |
| **Conversion Funnels** | Medium | 📋 Planned | Track user journey through site |
| **Export to CSV** | Low | 📋 Planned | Export analytics data for analysis |
| **Email Reports** | Low | 📋 Planned | Weekly/monthly analytics summaries |

### Dashboard Requirements

When building the analytics dashboard:

1. **Authentication:** Password-protected admin panel
2. **Visualizations:**
   - Line chart: Views over time
   - Bar chart: Views by country
   - Pie chart: Mobile vs Desktop
   - Table: Top pages
   - Map: Geographic distribution
3. **Filters:**
   - Date range picker
   - Website selector (API key filter)
   - URL filter
4. **Tech Stack:**
   - Frontend: React or Angular
   - Charts: Chart.js or D3.js
   - Backend: Use existing analytics-server API
5. **Deployment:** Same Raspberry Pi, different port (e.g., 3101)

---

## Changelog

### v1.1.0 (2026-09-28) - Enhanced Browser Data
- ✅ Added geographic information (country, city, region)
- ✅ Added device information (screen resolution, platform, CPU, RAM)
- ✅ Added performance metrics (page load time, TTFB, DOM timing)
- ✅ Added locale & network info (language, timezone, connection)
- ✅ Updated all 3 websites with enhanced tracking
- ✅ Documented all features in this file

### v1.0.0 (2026-09-27) - Initial Release
- ✅ Basic page view tracking
- ✅ Session-based tracking
- ✅ SPA router support
- ✅ Privacy-friendly (no cookies, no IP storage)
- ✅ MongoDB integration
- ✅ Deployed to Raspberry Pi

---

## Contributing

When adding new features or making changes:

1. Create a feature branch: `git checkout -b feat/feature-name`
2. Make changes and test locally
3. Update this ANALYTICS.md file with new features/status
4. Push to GitHub (CI/CD will auto-deploy)
5. Create PR for review

**Never commit directly to main** - use feature branches and PRs.

---

**Last Updated:** 2026-09-28  
**Maintained By:** Pablo Huamani (phuaman)
