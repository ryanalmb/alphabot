#!/bin/bash

echo "Building Alpha Pack with Mini-App..."

# Install backend dependencies (optimized)
echo "Installing backend dependencies..."
npm install --production --silent

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
npm install --silent
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
