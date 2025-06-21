#!/bin/sh

# Create app directory
mkdir -p /app
cd /app

# Create package.json with all dependencies
cat > package.json << 'EOF'
{
  "name": "alpha-pack",
  "version": "1.0.0",
  "description": "Enterprise-grade Solana-first social trading ecosystem",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "telegraf": "^4.15.6",
    "redis": "^4.6.10",
    "pg": "^8.11.3",
    "mongodb": "^6.2.0",
    "axios": "^1.6.0",
    "ws": "^8.14.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "express-rate-limit": "^7.1.5",
    "compression": "^1.7.4",
    "express-validator": "^7.0.1",
    "uuid": "^9.0.1",
    "crypto-js": "^4.2.0",
    "moment": "^2.29.4",
    "lodash": "^4.17.21",
    "multer": "^1.4.5-lts.1",
    "node-cron": "^3.0.3",
    "socket.io": "^4.7.4",
    "ioredis": "^5.3.2",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "express-session": "^1.17.3",
    "express-mongo-sanitize": "^2.2.0",
    "hpp": "^0.2.3",
    "xss": "^1.0.14",
    "validator": "^13.11.0",
    "stripe": "^14.9.0",
    "ccxt": "^4.1.64",
    "technicalindicators": "^3.1.0",
    "brain.js": "^2.0.0-beta.23",
    "natural": "^6.8.0",
    "sentiment": "^5.0.2",
    "cheerio": "^1.0.0-rc.12"
  }
}
EOF

# Install dependencies
npm install --production

echo "✅ Alpha Pack Pro dependencies installed successfully!"
