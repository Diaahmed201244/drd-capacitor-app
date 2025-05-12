#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/drd-connect"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7
LOG_FILE="/var/log/drd-connect/backup.log"
AWS_BUCKET="drd-connect-backups"
NOTIFICATION_EMAIL="admin@drdconnect.com"

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$1"
}

# Error handling
handle_error() {
    log "ERROR: $1"
    echo "Backup failed: $1" | mail -s "DRD Connect Backup Failed" "$NOTIFICATION_EMAIL"
    exit 1
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR" || handle_error "Failed to create backup directory"

# Start backup process
log "Starting backup process"

# Backup database
log "Backing up database..."
pg_dump -h localhost -U postgres -d supabase > "$BACKUP_DIR/db_backup_$DATE.sql" || handle_error "Database backup failed"

# Backup application files
log "Backing up application files..."
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" /var/www/drd-connect || handle_error "Application backup failed"

# Backup environment variables
log "Backing up environment variables..."
cp /var/www/drd-connect/.env "$BACKUP_DIR/env_backup_$DATE" || handle_error "Environment backup failed"

# Upload to AWS S3
log "Uploading backups to AWS S3..."
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql" "s3://$AWS_BUCKET/database/" || handle_error "Database upload failed"
aws s3 cp "$BACKUP_DIR/app_backup_$DATE.tar.gz" "s3://$AWS_BUCKET/application/" || handle_error "Application upload failed"
aws s3 cp "$BACKUP_DIR/env_backup_$DATE" "s3://$AWS_BUCKET/environment/" || handle_error "Environment upload failed"

# Verify backup integrity
log "Verifying backup integrity..."
if [ -f "$BACKUP_DIR/db_backup_$DATE.sql" ] && [ -f "$BACKUP_DIR/app_backup_$DATE.tar.gz" ]; then
    log "Backup verification successful"
else
    handle_error "Backup verification failed"
fi

# Clean up old backups
log "Cleaning up old backups..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete || handle_error "Cleanup failed"

# Remove old backups from S3
log "Cleaning up old S3 backups..."
aws s3 ls "s3://$AWS_BUCKET/database/" | while read -r line; do
    createDate=$(echo "$line" | awk {'print $1" "$2'})
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "-$RETENTION_DAYS days" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo "$line" | awk {'print $4'})
        aws s3 rm "s3://$AWS_BUCKET/database/$fileName"
    fi
done

# Send success notification
log "Backup completed successfully"
echo "Backup completed successfully at $(date)" | mail -s "DRD Connect Backup Successful" "$NOTIFICATION_EMAIL"

exit 0 