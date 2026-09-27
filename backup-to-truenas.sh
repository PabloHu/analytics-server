#!/bin/bash

# Analytics Database Backup Script
# Backs up MongoDB analyticsDb to TrueNAS
# Add to crontab: 0 2 * * 0 /path/to/backup-to-truenas.sh

BACKUP_DIR="/tmp/analytics-backup"
DATE=$(date +%Y%m%d_%H%M%S)
TRUENAS_HOST="YOUR_TRUENAS_IP"  # UPDATE THIS
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

# Sync to TrueNAS via rsync (or use scp)
echo "📤 Syncing to TrueNAS..."
rsync -avz "$BACKUP_DIR/" "$TRUENAS_HOST:$TRUENAS_PATH/" 2>/dev/null

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
