#!/bin/bash

# Analytics Server Deployment Script
# Run this ON THE RASPBERRY PI after copying the project files

set -e

echo "📊 Analytics Server Deployment"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Please run this from the analytics-server directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << EOF
MONGO_URI=mongodb://localhost:27017
MASTER_API_KEY=master_kiwichito_analytics_2024
PORT=3100
NODE_ENV=production
EOF
    echo "✅ .env created. Please update MASTER_API_KEY if needed."
fi

# Create MongoDB indexes
echo "🗄️  Creating MongoDB indexes..."
mongosh << 'MONGOEOF'
use analyticsDb

db.apiKeys.createIndex({ key: 1 }, { unique: true })
db.apiKeys.createIndex({ active: 1 })

db.pageViews.createIndex({ url: 1, timestamp: -1 })
db.pageViews.createIndex({ client: 1, timestamp: -1 })
db.pageViews.createIndex({ sessionId: 1, timestamp: -1 })

// TTL index - auto-delete after 90 days
db.pageViews.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 })

print("✅ Indexes created")
exit
MONGOEOF

# Stop existing PM2 process if running
echo "🔄 Checking for existing PM2 process..."
pm2 stop analytics-server 2>/dev/null || true
pm2 delete analytics-server 2>/dev/null || true

# Start with PM2
echo "🚀 Starting server with PM2..."
pm2 start server.js --name analytics-server
pm2 save

# Enable PM2 startup
echo "⚙️  Configuring PM2 auto-start..."
pm2 startup | tail -n 1 | bash || true

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Server Status:"
pm2 status

echo ""
echo "📝 Next steps:"
echo "1. Test health check: curl http://localhost:3100/health"
echo "2. View logs: pm2 logs analytics-server"
echo "3. Monitor: pm2 monit"
echo ""
echo "🔐 API Keys are saved in .env.keys"
echo "📖 Documentation: see README.md"
