#!/bin/bash

# Complete Free HTTPS Setup for Alpha Pack using acme.sh + DuckDNS + Let's Encrypt
# NO SUBSCRIPTIONS REQUIRED - 100% FREE SOLUTION

echo "🚀 Setting up FREE HTTPS for Alpha Pack..."
echo "📋 Components: acme.sh + DuckDNS + Let's Encrypt + NGINX"

# Configuration
DOMAIN="alphapackbot.duckdns.org"
ALB_URL="alpha-pack-alb-1477014246.us-east-1.elb.amazonaws.com"

echo "🌐 Domain: ${DOMAIN}"
echo "🔗 Backend: ${ALB_URL}"

# Step 1: Install acme.sh (completely free)
echo "📦 Installing acme.sh..."
curl https://get.acme.sh | sh -s email=admin@${DOMAIN}
source ~/.bashrc

# Step 2: Install NGINX for SSL termination
echo "🔧 Installing NGINX..."
apt-get update
apt-get install -y nginx

# Step 3: Create NGINX configuration
echo "📝 Creating NGINX configuration..."
cat > /etc/nginx/sites-available/alphapack << EOF
# HTTP server (for Let's Encrypt validation)
server {
    listen 80;
    server_name ${DOMAIN};
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server (SSL termination + proxy to ALB)
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL certificates (will be configured by acme.sh)
    ssl_certificate /etc/nginx/ssl/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/${DOMAIN}/key.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Proxy to ALB
    location / {
        proxy_pass http://${ALB_URL};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/alphapack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Create SSL directory
mkdir -p /etc/nginx/ssl/${DOMAIN}

# Create web root for Let's Encrypt
mkdir -p /var/www/html

echo "✅ NGINX configuration complete!"
echo ""
echo "🔑 NEXT STEPS FOR YOU:"
echo "1. Get your DuckDNS token from: https://www.duckdns.org/domains"
echo "2. Run: export DuckDNS_Token='YOUR_TOKEN_HERE'"
echo "3. Run: ~/.acme.sh/acme.sh --issue --dns dns_duckdns -d ${DOMAIN}"
echo "4. Run: ~/.acme.sh/acme.sh --install-cert -d ${DOMAIN} \\"
echo "   --key-file /etc/nginx/ssl/${DOMAIN}/key.pem \\"
echo "   --fullchain-file /etc/nginx/ssl/${DOMAIN}/fullchain.pem \\"
echo "   --reloadcmd 'systemctl reload nginx'"
echo "5. Run: systemctl restart nginx"
echo ""
echo "🎉 After these steps, your mini-app will be available at:"
echo "   https://${DOMAIN}/miniapp"
