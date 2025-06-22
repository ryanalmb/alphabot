#!/bin/bash

# Setup SSL termination with NGINX and Let's Encrypt for DuckDNS
# This script sets up SSL directly in the container

echo "🔐 Setting up SSL termination with NGINX and Let's Encrypt..."

# Install NGINX and Certbot
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Create NGINX configuration for Alpha Pack
cat > /etc/nginx/sites-available/alphapack << 'EOF'
server {
    listen 80;
    server_name alphapackbot.duckdns.org;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name alphapackbot.duckdns.org;
    
    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/alphapackbot.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alphapackbot.duckdns.org/privkey.pem;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/alphapack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test NGINX configuration
nginx -t

echo "✅ NGINX SSL termination setup complete!"
echo "📝 Next: Run certbot to get SSL certificate"
echo "🔧 Command: certbot --nginx -d alphapackbot.duckdns.org"
