#!/bin/bash

# Alpha Pack HTTPS startup script
echo "🚀 Starting Alpha Pack with FREE HTTPS..."

# Create web root for Let's Encrypt
mkdir -p /var/www/html

# Check if SSL certificates exist
if [ ! -f "/etc/nginx/ssl/fullchain.pem" ]; then
    echo "🔑 SSL certificates not found. Setting up Let's Encrypt..."
    
    # Check if DuckDNS token is provided
    if [ -z "$DUCKDNS_TOKEN" ]; then
        echo "❌ ERROR: DUCKDNS_TOKEN environment variable not set!"
        echo "Please set DUCKDNS_TOKEN to your DuckDNS token"
        exit 1
    fi
    
    # Export token for acme.sh
    export DuckDNS_Token="$DUCKDNS_TOKEN"
    
    # Start NGINX for HTTP validation
    nginx
    
    # Issue certificate using acme.sh
    echo "📜 Requesting SSL certificate from Let's Encrypt..."
    ~/.acme.sh/acme.sh --issue --dns dns_duckdns -d alphapackbot.duckdns.org
    
    # Install certificate
    echo "📋 Installing SSL certificate..."
    ~/.acme.sh/acme.sh --install-cert -d alphapackbot.duckdns.org \
        --key-file /etc/nginx/ssl/key.pem \
        --fullchain-file /etc/nginx/ssl/fullchain.pem \
        --reloadcmd "nginx -s reload"
    
    echo "✅ SSL certificate installed!"
else
    echo "✅ SSL certificates found, starting services..."
fi

# Start NGINX
nginx

# Start Node.js application
echo "🚀 Starting Alpha Pack application..."
cd /app
npm start
