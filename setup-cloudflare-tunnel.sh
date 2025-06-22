#!/bin/bash

# Setup Cloudflare Tunnel for Alpha Pack HTTPS access
# This provides HTTPS without changing nameservers

echo "🌐 Setting up Cloudflare Tunnel for Alpha Pack..."

# Install cloudflared
echo "📦 Installing cloudflared..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# Login to Cloudflare (this will open browser for authentication)
echo "🔐 Authenticating with Cloudflare..."
cloudflared tunnel login

# Create tunnel
echo "🚇 Creating tunnel..."
cloudflared tunnel create alpha-pack-tunnel

# Create config file
echo "📝 Creating tunnel configuration..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: alpha-pack-tunnel
credentials-file: ~/.cloudflared/alpha-pack-tunnel.json

ingress:
  - hostname: alphapackbot.duckdns.org
    service: http://localhost:3000
  - service: http_status:404
EOF

# Route traffic through tunnel
echo "🔀 Routing traffic through tunnel..."
cloudflared tunnel route dns alpha-pack-tunnel alphapackbot.duckdns.org

# Install as service
echo "⚙️ Installing tunnel as service..."
cloudflared service install

echo "✅ Cloudflare Tunnel setup complete!"
echo "🌐 Your site will be available at: https://alphapackbot.duckdns.org"
echo "🔒 HTTPS is automatically enabled through Cloudflare"
