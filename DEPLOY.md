# Deployment Instructions for Raspberry Pi

## 🚀 Quick Deploy (Automated)

### Step 1: Copy project to Pi

From your Mac, run:

```bash
cd /Users/phuaman/KiwiDocuments/work/backend
rsync -avz --exclude 'node_modules' analytics-server/ kiwichito@192.168.12.179:~/analytics-server/
```

### Step 2: SSH into Pi and deploy

```bash
ssh kiwichito@192.168.12.179
cd ~/analytics-server
chmod +x deploy-to-pi.sh
./deploy-to-pi.sh
```

**That's it!** The script will:
- Install dependencies
- Create MongoDB indexes
- Start server with PM2
- Configure auto-start on reboot

---

## 🛠️ Manual Deploy (Step-by-Step)

If the automated script fails, follow these steps:

### 1. Copy files to Pi

```bash
# From your Mac
cd /Users/phuaman/KiwiDocuments/work/backend
scp -r analytics-server kiwichito@192.168.12.179:~/
```

### 2. SSH into Pi

```bash
ssh kiwichito@192.168.12.179
cd ~/analytics-server
```

### 3. Install dependencies

```bash
npm install --production
```

### 4. Verify .env file

```bash
cat .env
# Should show:
# MONGO_URI=mongodb://localhost:27017
# MASTER_API_KEY=master_kiwichito_analytics_2024
# PORT=3100
# NODE_ENV=production
```

### 5. Create MongoDB indexes

```bash
mongosh
```

Then in mongosh:
```javascript
use analyticsDb

db.apiKeys.createIndex({ key: 1 }, { unique: true })
db.apiKeys.createIndex({ active: 1 })

db.pageViews.createIndex({ url: 1, timestamp: -1 })
db.pageViews.createIndex({ client: 1, timestamp: -1 })
db.pageViews.createIndex({ sessionId: 1, timestamp: -1 })

// TTL index - auto-delete after 90 days (7776000 seconds)
db.pageViews.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 })

exit
```

### 6. Start with PM2

```bash
# Stop old process if exists
pm2 stop analytics-server 2>/dev/null || true
pm2 delete analytics-server 2>/dev/null || true

# Start new process
pm2 start server.js --name analytics-server

# Save PM2 process list
pm2 save

# Enable auto-start on reboot
pm2 startup
# Follow the command it outputs
```

### 7. Verify deployment

```bash
# Check PM2 status
pm2 status

# Check server health
curl http://localhost:3100/health

# View logs
pm2 logs analytics-server --lines 50
```

---

## 📊 Post-Deployment

### Test health endpoint

```bash
curl http://localhost:3100/health
```

Expected response:
```json
{"status":"ok","uptime":123,"timestamp":"...","mongodb":"connected"}
```

### Test API keys endpoint

```bash
curl http://localhost:3100/admin/keys \
  -H "X-Master-Key: master_kiwichito_analytics_2024"
```

Should return array of 3 API keys.

### Monitor server

```bash
# Real-time logs
pm2 logs analytics-server

# Monitor CPU/memory
pm2 monit

# Check status
pm2 status
```

---

## 🔄 Setup Automated Backups (Optional)

### 1. Update TrueNAS settings in backup script

```bash
nano backup-to-truenas.sh
```

Update these lines:
```bash
TRUENAS_HOST="192.168.12.XXX"  # Your TrueNAS IP
TRUENAS_PATH="/mnt/pool/backups/analytics"
```

### 2. Make script executable

```bash
chmod +x backup-to-truenas.sh
```

### 3. Test backup manually

```bash
./backup-to-truenas.sh
```

### 4. Add to crontab (weekly backup on Sundays at 2 AM)

```bash
crontab -e
```

Add this line:
```
0 2 * * 0 /home/kiwichito/analytics-server/backup-to-truenas.sh >> /var/log/analytics-backup.log 2>&1
```

---

## 🐛 Troubleshooting

### Server won't start

```bash
# Check logs
pm2 logs analytics-server --err

# Check if port is in use
sudo netstat -tulpn | grep 3100

# Check MongoDB is running
sudo systemctl status mongod
```

### MongoDB connection failed

```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB if stopped
sudo systemctl start mongod

# Check MongoDB logs
sudo journalctl -u mongod -n 50
```

### PM2 not found

```bash
# Install PM2 globally
sudo npm install -g pm2
```

### Cannot connect from outside

```bash
# Check if server is listening on all interfaces
netstat -tulpn | grep 3100

# Should show: 0.0.0.0:3100 or :::3100
# If showing 127.0.0.1:3100, update server.js HOST setting
```

---

## 🔧 Useful Commands

```bash
# Restart server
pm2 restart analytics-server

# Stop server
pm2 stop analytics-server

# View logs (last 50 lines)
pm2 logs analytics-server --lines 50

# Monitor in real-time
pm2 monit

# Check process details
pm2 describe analytics-server

# Remove from PM2
pm2 delete analytics-server
```

---

## 📝 Next Steps After Deployment

1. ✅ Server is running on Pi
2. ⏭️ Configure DNS (analytics.kiwichito.com → Pi IP)
3. ⏭️ Optional: Setup SSL with Caddy
4. ⏭️ Add tracking script to websites
5. ⏭️ Test from browser

See Phase 5 and 6 instructions for next steps.
