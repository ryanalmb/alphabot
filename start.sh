#!/bin/bash

echo "🚀 Starting Alpha Pack Pro..."

# Start the API server in the background
echo "📡 Starting API server..."
node app.js &
API_PID=$!

# Wait a moment for the API to start
sleep 5

# Start the Telegram bot
echo "🤖 Starting Telegram bot..."
node telegram-bot.js &
BOT_PID=$!

echo "✅ Alpha Pack Pro is running!"
echo "📡 API Server PID: $API_PID"
echo "🤖 Telegram Bot PID: $BOT_PID"
echo "🌐 API URL: http://localhost:3000"
echo "📱 Telegram Bot: Active"

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down Alpha Pack Pro..."
    kill $API_PID 2>/dev/null
    kill $BOT_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $API_PID $BOT_PID
