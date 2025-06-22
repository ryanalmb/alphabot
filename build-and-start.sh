#!/bin/bash

echo "Building Alpha Pack with Mini-App..."

# Install backend dependencies (optimized with memory limits)
echo "Installing backend dependencies..."
export NODE_OPTIONS="--max-old-space-size=6144"
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
echo "Starting npm install with increased memory..."
node --max-old-space-size=6144 $(which npm) install --production --silent --no-audit --no-fund

# Build React frontend separately (optimized)
echo "Building React frontend..."
cp frontend-package.json package-frontend.json
mkdir -p frontend-temp
cp package-frontend.json frontend-temp/package.json
cp -r src frontend-temp/
cp -r public frontend-temp/
cd frontend-temp

# Install ALL dependencies (including dev) for React build
echo "Installing frontend dependencies (including dev for build)..."
export NODE_OPTIONS="--max-old-space-size=6144"
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
echo "Starting frontend npm install with increased memory..."
node --max-old-space-size=6144 $(which npm) install --silent --no-audit --no-fund
echo "Building React frontend with increased memory..."
node --max-old-space-size=6144 $(which npm) run build

# Copy built files to main app
cd ..
mkdir -p build
cp -r frontend-temp/build/* build/
rm -rf frontend-temp
rm package-frontend.json

echo "Frontend built successfully!"

# Start the backend server
echo "Starting Alpha Pack server..."
node app.js
