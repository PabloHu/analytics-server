# TrueNAS Automated Backup Setup

## Overview
Set up weekly automated backups of the analytics MongoDB database to TrueNAS.

---

## Prerequisites

- TrueNAS server accessible from Raspberry Pi
- SSH access to TrueNAS (or rsync enabled)
- Backup dataset created on TrueNAS

---

## Setup Instructions

### 1. Configure TrueNAS

**Create Backup Dataset**:
1. Login to TrueNAS web interface
2. Storage > Pools > Select your pool
3. Create dataset: `backups/analytics`
4. Set permissions:
   - Owner: Your backup user
   - Permissions: 755

**Enable SSH (if needed)**:
1. Services > SSH
2. Enable: ON
3. Configure:
   - Port: 22 (or custom)
   - Allow Password Authentication: Yes (temporarily)
   - Allow Root Login: No

### 2. Setup SSH Key Authentication

**On Raspberry Pi**:
```bash
ssh kiwichito@192.168.12.179

# Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "analytics-backup"

# Copy public key to TrueNAS
ssh-copy-id truenas-user@TRUENAS_IP

# Test connection (should not prompt for password)
ssh truenas-user@TRUENAS_IP "echo 'Connection successful'"
```

### 3. Update Backup Script

```bash
ssh kiwichito@192.168.12.179
cd ~/analytics-server
nano backup-to-truenas.sh
```

Update these values:
```bash
TRUENAS_HOST="192.168.12.XXX"  # Your TrueNAS IP
TRUENAS_USER="your-backup-user"  # TrueNAS username
TRUENAS_PATH="/mnt/pool/backups/analytics"  # Backup destination path
```

Full script:
```bash
#!/bin/bash

# Analytics Database Backup Script
# Backs up MongoDB analyticsDb to TrueNAS
# Add to crontab: 0 2 * * 0 /path/to/backup-to-truenas.sh

BACKUP_DIR="/tmp/analytics-backup"
DATE=$(date +%Y%m%d_%H%M%S)
TRUENAS_HOST="192.168.12.XXX"  # UPDATE THIS
TRUENAS_USER="backup-user"     # UPDATE THIS
TRUENAS_PATH="/mnt/pool/backups/analytics"  # UPDATE THIS

echo "📦 Starting analytics backup - $DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
echo "🗄️  Dumping MongoDB analyticsDb..."
mongodump --db=analyticsDb --out="$BACKUP_DIR/mongo-$DATE"

if [ $? -ne 0 ]; then
    echo "❌ MongoDB backup failed"
    exit 1
fi

echo "✅ MongoDB backup complete"

# Sync to TrueNAS via rsync
echo "📤 Syncing to TrueNAS..."
rsync -avz --delete \
  "$BACKUP_DIR/" \
  "$TRUENAS_USER@$TRUENAS_HOST:$TRUENAS_PATH/" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Backup synced to TrueNAS"
else
    echo "⚠️  TrueNAS sync failed, backup saved locally only"
fi

# Keep only last 7 days locally
echo "🧹 Cleaning up old local backups..."
find "$BACKUP_DIR" -name "mongo-*" -mtime +7 -exec rm -rf {} \; 2>/dev/null

echo "✅ Backup completed: $DATE"
echo "📊 Backup size: $(du -sh $BACKUP_DIR/mongo-$DATE 2>/dev/null | cut -f1)"
```

### 4. Make Script Executable

```bash
chmod +x backup-to-truenas.sh
```

### 5. Test Backup Manually

```bash
./backup-to-truenas.sh
```

Expected output:
```
📦 Starting analytics backup - 20260927_200000
🗄️  Dumping MongoDB analyticsDb...
✅ MongoDB backup complete
📤 Syncing to TrueNAS...
✅ Backup synced to TrueNAS
🧹 Cleaning up old local backups...
✅ Backup completed: 20260927_200000
📊 Backup size: 1.2M
```

### 6. Verify Backup on TrueNAS

**Via SSH**:
```bash
ssh truenas-user@TRUENAS_IP
ls -lh /mnt/pool/backups/analytics/
```

Should see `mongo-YYYYMMDD_HHMMSS/` directories.

**Via Web Interface**:
1. Shell
2. `ls -lh /mnt/pool/backups/analytics/`

### 7. Schedule Weekly Backup (Cron)

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 2 AM)
0 2 * * 0 /home/kiwichito/analytics-server/backup-to-truenas.sh >> /var/log/analytics-backup.log 2>&1
```

**Cron schedule explanation**:
```
0 2 * * 0
│ │ │ │ │
│ │ │ │ └─ Day of week (0=Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Other schedule options**:
```bash
# Daily at 2 AM
0 2 * * * /home/kiwichito/analytics-server/backup-to-truenas.sh

# Every 6 hours
0 */6 * * * /home/kiwichito/analytics-server/backup-to-truenas.sh

# First day of month at 3 AM
0 3 1 * * /home/kiwichito/analytics-server/backup-to-truenas.sh
```

### 8. Create Log File

```bash
sudo touch /var/log/analytics-backup.log
sudo chown kiwichito:kiwichito /var/log/analytics-backup.log
```

### 9. Verify Cron Job

```bash
# List cron jobs
crontab -l

# Check cron is running
sudo systemctl status cron

# View backup logs
tail -f /var/log/analytics-backup.log
```

---

## Backup Restoration

### Restore Full Database

**On Raspberry Pi**:
```bash
ssh kiwichito@192.168.12.179

# Download backup from TrueNAS
rsync -avz \
  truenas-user@TRUENAS_IP:/mnt/pool/backups/analytics/mongo-YYYYMMDD_HHMMSS/ \
  /tmp/restore-backup/

# Restore to MongoDB
mongorestore --db=analyticsDb /tmp/restore-backup/mongo-YYYYMMDD_HHMMSS/analyticsDb/

# Verify restoration
mongosh

use analyticsDb
db.pageViews.countDocuments()
db.apiKeys.find().pretty()
```

### Restore Specific Collection

```bash
# Restore only pageViews collection
mongorestore --db=analyticsDb \
  --collection=pageViews \
  /tmp/restore-backup/mongo-YYYYMMDD_HHMMSS/analyticsDb/pageViews.bson
```

---

## Monitoring Backups

### View Backup History

```bash
ssh truenas-user@TRUENAS_IP
ls -lhtr /mnt/pool/backups/analytics/ | tail -10
```

### Check Backup Sizes

```bash
du -sh /mnt/pool/backups/analytics/*
```

### Verify Backup Integrity

```bash
# Download and test restore (dry run)
mongorestore --db=analyticsDb_test \
  --dryRun \
  /tmp/restore-backup/mongo-YYYYMMDD_HHMMSS/analyticsDb/
```

### Check Cron Execution

```bash
# View cron log
grep analytics-backup /var/log/syslog

# View backup log
tail -50 /var/log/analytics-backup.log
```

---

## Backup Retention Policy

### Current Policy
- **Local (Pi)**: 7 days
- **TrueNAS**: Unlimited (manual cleanup)

### Setup TrueNAS Snapshots (Optional)

**In TrueNAS**:
1. Storage > Snapshots
2. Add Periodic Snapshot Task
3. Dataset: `pool/backups/analytics`
4. Schedule: Weekly (or daily)
5. Retention: Keep 4 weeks

This gives you point-in-time recovery even if backup script fails.

### Manual Cleanup on TrueNAS

```bash
ssh truenas-user@TRUENAS_IP

# Remove backups older than 90 days
find /mnt/pool/backups/analytics -name "mongo-*" -mtime +90 -exec rm -rf {} \;

# Or keep only last 10 backups
cd /mnt/pool/backups/analytics
ls -t | tail -n +11 | xargs rm -rf
```

---

## Troubleshooting

### Backup Script Fails

**Check MongoDB is running**:
```bash
sudo systemctl status mongod
```

**Check disk space**:
```bash
df -h /tmp
```

**Check TrueNAS connectivity**:
```bash
ping TRUENAS_IP
ssh truenas-user@TRUENAS_IP "echo test"
```

### Rsync Fails

**Check SSH key authentication**:
```bash
ssh -v truenas-user@TRUENAS_IP
```

**Check TrueNAS path exists**:
```bash
ssh truenas-user@TRUENAS_IP "ls -ld /mnt/pool/backups/analytics"
```

**Check permissions**:
```bash
ssh truenas-user@TRUENAS_IP "touch /mnt/pool/backups/analytics/test.txt && rm /mnt/pool/backups/analytics/test.txt"
```

### Cron Not Running

**Check cron service**:
```bash
sudo systemctl status cron
sudo systemctl restart cron
```

**Test cron job manually**:
```bash
/home/kiwichito/analytics-server/backup-to-truenas.sh
```

**Check cron syntax**:
```bash
crontab -l
```

### Restore Fails

**Check backup file integrity**:
```bash
ls -lh /tmp/restore-backup/mongo-YYYYMMDD_HHMMSS/analyticsDb/
```

**Check MongoDB running**:
```bash
sudo systemctl status mongod
```

**Try restore with --drop**:
```bash
mongorestore --db=analyticsDb --drop \
  /tmp/restore-backup/mongo-YYYYMMDD_HHMMSS/analyticsDb/
```

---

## Security Best Practices

✅ Use SSH key authentication (no passwords)
✅ Dedicated backup user on TrueNAS (limited permissions)
✅ Encrypt backups in transit (rsync over SSH)
✅ Regular backup testing (restore dry runs)
✅ Monitor backup logs for failures
✅ Keep multiple backup copies (local + TrueNAS + snapshots)

---

## Next Steps

After backup setup:
1. ✅ Configure TrueNAS
2. ✅ Setup SSH keys
3. ✅ Update backup script
4. ✅ Test manual backup
5. ✅ Schedule cron job
6. ⏭️ Test restoration
7. ⏭️ Monitor weekly backups
