const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

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

// Telegram authentication endpoint
app.post('/api/v1/auth/telegram', (req, res) => {
  try {
    const { telegramUser, initData } = req.body;

    // In production, validate initData with bot token
    // For now, create/update user based on Telegram data
    const user = {
      id: telegramUser.id,
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      balance: 10000, // Starting balance
      packId: null,
      joinedAt: new Date().toISOString(),
    };

    // Generate JWT token (simplified)
    const token = 'jwt_' + telegramUser.id + '_' + Date.now();

    res.json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Mini-app API routes
app.use('/api/miniapp', require('./routes/miniapp'));

// Mini-app static files - serve at root for React build
app.use('/static', express.static(path.join(__dirname, 'build', 'static')));

// Mini-app static files - serve entire build directory at /miniapp
app.use('/miniapp', express.static(path.join(__dirname, 'build')));

// Serve React app for mini-app routes (including root)
app.get('/miniapp', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('Mini-app build files not found at:', indexPath);
    res.status(500).json({
      error: 'Mini-app not available',
      message: 'React build files not found. Please check build process.'
    });
  }
});

app.get('/miniapp/*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('Mini-app build files not found at:', indexPath);
    res.status(500).json({
      error: 'Mini-app not available',
      message: 'React build files not found. Please check build process.'
    });
  }
});

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
        text: `Alpha Pack received: ${text}\n\nWelcome to the future of DeFi social trading!`
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

// Get arbitrage opportunities
app.get('/api/v1/trading/opportunities', (req, res) => {
  res.json([
    {
      id: 1,
      pair: 'SOL/USDC',
      buyExchange: 'Orca',
      sellExchange: 'Raydium',
      buyPrice: 142.50,
      sellPrice: 143.15,
      profit: 0.46,
      volume: 50000,
      confidence: 'High',
    },
    {
      id: 2,
      pair: 'ETH/USDC',
      buyExchange: 'SushiSwap',
      sellExchange: 'Uniswap',
      buyPrice: 2340.12,
      sellPrice: 2345.67,
      profit: 0.24,
      volume: 25000,
      confidence: 'Medium',
    },
  ]);
});

// Execute trade
app.post('/api/v1/trading/execute', (req, res) => {
  const { pair, type, amount, price } = req.body;

  // Simulate trade execution
  setTimeout(() => {
    res.json({
      success: true,
      tradeId: 'trade_' + Date.now(),
      pair,
      type,
      amount,
      price,
      executedAt: new Date().toISOString(),
    });
  }, 1000);
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
  console.log(`Alpha Pack API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Start Telegram bot
  console.log('Starting Telegram bot...');
  require('./telegram-bot.js');
});

module.exports = app;
