const express = require('express');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Alpha Pack API'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Alpha Pack API',
    version: '1.0.0',
    status: 'running',
    deployment: 'AWS Lambda'
  });
});

// Telegram webhook
app.post('/api/v1/telegram/webhook', (req, res) => {
  console.log('Telegram webhook:', req.body);
  
  const { message } = req.body;
  if (message && message.text) {
    const chatId = message.chat.id;
    const text = message.text;
    
    res.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `🚀 Alpha Pack received: ${text}\n\n🎯 Welcome to DeFi social trading!`
    });
  } else {
    res.json({ ok: true });
  }
});

// Trading endpoints
app.get('/api/v1/trading/status', (req, res) => {
  res.json({
    status: 'active',
    markets: ['SOL/USDC', 'ETH/USDC'],
    performance: '+15.7%'
  });
});

module.exports.handler = serverless(app);
