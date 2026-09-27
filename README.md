# Analytics Server

Privacy-friendly analytics server for tracking page views across multiple websites.

## Features

- ✅ API key authentication per website
- ✅ Page view tracking with deduplication
- ✅ Privacy-first (no cookies, auto-delete after 90 days)
- ✅ Admin endpoints for managing API keys and viewing stats
- ✅ Rate limiting (60 req/min)
- ✅ CORS whitelist

## Tech Stack

- Node.js + Express
- MongoDB
- PM2 (process manager)

## Setup

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start server
npm start
```

### Production (Raspberry Pi)

```bash
# Install dependencies
npm install --production

# Start with PM2
pm2 start server.js --name analytics-server
pm2 save
pm2 startup
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `MASTER_API_KEY` | Yes | Master key for admin endpoints |
| `PORT` | No | Server port (default: 3100) |
| `NODE_ENV` | No | Environment (development/production) |

## API Endpoints

### Public Endpoints

#### POST /track
Track a page view (requires API key)

**Headers:**
- `X-API-Key: <your-api-key>`

**Body:**
```json
{
  "url": "/products",
  "referrer": "https://google.com",
  "sessionId": "uuid-here",
  "screenWidth": 1920
}
```

#### GET /health
Health check (no auth required)

### Admin Endpoints (require master key)

#### GET /admin/keys
List all API keys

**Headers:**
- `X-Master-Key: <master-key>`

#### POST /admin/keys
Create new API key

**Headers:**
- `X-Master-Key: <master-key>`

**Body:**
```json
{
  "name": "My Website",
  "domain": "example.com"
}
```

#### PATCH /admin/keys/:id
Toggle API key active status

**Headers:**
- `X-Master-Key: <master-key>`

**Body:**
```json
{
  "active": false
}
```

#### GET /admin/stats
View analytics summary

**Headers:**
- `X-Master-Key: <master-key>`

**Query Parameters:**
- `client` (optional): Filter by client name
- `days` (optional): Last N days (default: 7)

## MongoDB Collections

### apiKeys
```javascript
{
  key: "ak_example_uuid",
  name: "Example Site",
  domain: "example.com",
  active: true,
  createdAt: Date,
  lastUsed: Date,
  requestCount: Number
}
```

### pageViews
```javascript
{
  url: "/products",
  referrer: "https://google.com",
  sessionId: "uuid",
  timestamp: Date,
  userAgent: "Mozilla/5.0...",
  screenWidth: 1920,
  client: "example",
  domain: "example.com"
}
```

## Frontend Integration

Add to your website's HTML:

```html
<script>
  window.ANALYTICS_API_KEY = 'ak_your_key_here';
</script>
<script src="https://analytics.kiwichito.com/analytics.js"></script>
```

## License

ISC
