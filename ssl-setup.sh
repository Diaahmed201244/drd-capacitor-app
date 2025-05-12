#!/bin/bash

# Install certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Stop nginx
systemctl stop nginx

# Obtain SSL certificate
certbot certonly --standalone \
  --preferred-challenges http \
  --agree-tos \
  --email admin@drdconnect.com \
  -d drdconnect.com \
  -d www.drdconnect.com

# Configure nginx with SSL
cat > /etc/nginx/sites-available/drd-connect << 'EOL'
server {
    listen 80;
    server_name drdconnect.com www.drdconnect.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name drdconnect.com www.drdconnect.com;

    ssl_certificate /etc/letsencrypt/live/drdconnect.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drdconnect.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (uncomment if you're sure)
    # add_header Strict-Transport-Security "max-age=63072000" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Rest of your nginx configuration...
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/drd-connect /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Start nginx
systemctl start nginx

# Set up auto-renewal
echo "0 0 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renew 