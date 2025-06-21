const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Alpha Pack API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      telegram: '/api/v1/telegram/webhook',
      trading: '/api/v1/trading',
      packs: '/api/v1/packs'
    }
  });
});

// Telegram webhook endpoint
app.post('/api/v1/telegram/webhook', async (req, res) => {
  try {
    console.log('Telegram webhook received:', req.body);
    
    const { message } = req.body;
    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text;
      
      // Simple echo response for now
      const response = {
        method: 'sendMessage',
        chat_id: chatId,
        text: `🚀 Alpha Pack received: ${text}\n\n🎯 Welcome to the future of DeFi social trading!`
      };
      
      res.json(response);
    } else {
      res.status(200).json({ ok: true });
    }
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trading API endpoints
app.get('/api/v1/trading/status', (req, res) => {
  res.json({
    status: 'active',
    markets: ['SOL/USDC', 'ETH/USDC', 'BTC/USDC'],
    activeStrategies: 3,
    totalVolume24h: '$1,234,567'
  });
});

// Packs API endpoints
app.get('/api/v1/packs', (req, res) => {
  res.json({
    packs: [
      {
        id: 'alpha-wolves',
        name: 'Alpha Wolves',
        members: 156,
        performance: '+23.4%',
        strategies: ['DeFi Yield', 'Arbitrage', 'Momentum']
      },
      {
        id: 'crypto-titans',
        name: 'Crypto Titans',
        members: 89,
        performance: '+18.7%',
        strategies: ['Swing Trading', 'Options', 'Futures']
      }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Alpha Pack API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
