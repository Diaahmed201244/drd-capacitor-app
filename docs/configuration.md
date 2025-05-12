# DRD Connect Configuration Guide

## Environment Setup

### Required Environment Variables
```env
# Supabase Configuration
SUPABASE_URL=https://obmufgumrrxjvgjquqro.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Google Analytics
GOOGLE_ANALYTICS_ID=your_ga_id

# Sentry Error Tracking
SENTRY_DSN=your_sentry_dsn

# AWS S3 Backup
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BUCKET_NAME=drd-connect-backups
```

## Server Configuration

### Nginx Configuration
- Rate limiting zones configured
- SSL/TLS enabled with Let's Encrypt
- Security headers implemented
- Static file caching enabled
- Gzip compression configured

### SSL/TLS Setup
1. Run `ssl-setup.sh` to:
   - Install certbot
   - Obtain SSL certificates
   - Configure nginx
   - Set up auto-renewal

### Backup Configuration
1. Daily backups at 2 AM
2. Retention period: 7 days
3. Backup types:
   - Database (PostgreSQL)
   - Application files
   - Environment variables
4. Cloud storage: AWS S3

## Monitoring Setup

### Alert Thresholds
```typescript
{
  errorRate: 0.05,    // 5% error rate
  responseTime: 2000, // 2 seconds
  memoryUsage: 0.8    // 80% memory usage
}
```

### Performance Monitoring
- Memory usage checks every minute
- Error rate monitoring every 5 minutes
- Response time tracking for all API calls

## CDN Configuration (Cloudflare)
- Full SSL mode
- Page rules for caching
- Firewall rules for security
- Rate limiting rules

## Caching Strategy
- Browser cache TTL: 4 hours
- API response cache: 1 hour
- Static assets: 1 year
- User preferences: 1 year

## Security Configuration
- Content Security Policy
- HSTS enabled
- XSS protection
- Frame protection
- Referrer policy
- CORS configuration

## Rate Limiting
- API endpoints: 10 requests/second
- Auth endpoints: 5 requests/second
- Burst handling enabled 