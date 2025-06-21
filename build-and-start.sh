#!/bin/bash

echo "Building Alpha Pack with Mini-App..."

# Install backend dependencies (faster with npm ci)
echo "Installing backend dependencies..."
npm ci --production --silent

# Build React frontend separately (optimized)
echo "Building React frontend..."
cp frontend-package.json package-frontend.json
mkdir -p frontend-temp
cp package-frontend.json frontend-temp/package.json
cp -r src frontend-temp/
cp -r public frontend-temp/
cd frontend-temp

# Install frontend dependencies and build (faster with npm ci)
npm ci --silent
npm run build

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
