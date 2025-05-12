#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/drd-connect"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
echo "Backing up database..."
pg_dump -h localhost -U postgres -d supabase > "$BACKUP_DIR/db_backup_$DATE.sql"

# Backup application files
echo "Backing up application files..."
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" /var/www/drd-connect

# Backup environment variables
echo "Backing up environment variables..."
cp /var/www/drd-connect/.env "$BACKUP_DIR/env_backup_$DATE"

# Upload to cloud storage (example using AWS S3)
echo "Uploading backups to cloud storage..."
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql" "s3://drd-connect-backups/database/"
aws s3 cp "$BACKUP_DIR/app_backup_$DATE.tar.gz" "s3://drd-connect-backups/application/"
aws s3 cp "$BACKUP_DIR/env_backup_$DATE" "s3://drd-connect-backups/environment/"

# Clean up old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

# Verify backup integrity
echo "Verifying backup integrity..."
if [ -f "$BACKUP_DIR/db_backup_$DATE.sql" ] && [ -f "$BACKUP_DIR/app_backup_$DATE.tar.gz" ]; then
    echo "Backup completed successfully"
else
    echo "Backup failed"
    exit 1
fi 