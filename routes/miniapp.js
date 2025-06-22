const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Telegram WebApp data validation
function validateTelegramWebAppData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return calculatedHash === hash;
}

// Middleware to validate Telegram WebApp data
const validateWebAppData = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!initData) {
    // For development, allow requests without validation
    if (process.env.NODE_ENV === 'development') {
      req.telegramUser = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      };
      return next();
    }
    return res.status(401).json({ error: 'Missing Telegram WebApp data' });
  }
  
  try {
    if (!validateTelegramWebAppData(initData, botToken)) {
      return res.status(401).json({ error: 'Invalid Telegram WebApp data' });
    }
    
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    if (userParam) {
      req.telegramUser = JSON.parse(userParam);
    }
    
    next();
  } catch (error) {
    console.error('WebApp validation error:', error);
    res.status(401).json({ error: 'Invalid Telegram WebApp data' });
  }
};

// Mini-app dashboard data
router.get('/dashboard', validateWebAppData, async (req, res) => {
  try {
    const userId = req.telegramUser.id;
    
    // In a real app, fetch from database
    const dashboardData = {
      user: req.telegramUser,
      stats: {
        portfolioValue: 12847.50,
        dailyPnL: 347.20,
        winRate: 73.5,
        packRank: 8,
        socialScore: 2456,
        totalTrades: 127,
      },
      recentTrades: [
        {
          id: 1,
          pair: 'SOL/USDC',
          type: 'BUY',
          amount: 15.5,
          price: 98.42,
          pnl: 127.50,
          time: '2m ago',
        },
        {
          id: 2,
          pair: 'ETH/USDC',
          type: 'SELL',
          amount: 0.8,
          price: 2341.20,
          pnl: -45.30,
          time: '15m ago',
        },
      ],
      opportunities: [
        {
          id: 1,
          pair: 'SOL/USDC',
          exchange1: 'Raydium',
          exchange2: 'Orca',
          spread: 0.45,
          profit: 23.50,
          confidence: 95,
        },
      ],
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Trading pairs and market data
router.get('/trading/pairs', validateWebAppData, async (req, res) => {
  try {
    // In a real app, fetch live market data
    const tradingPairs = [
      {
        symbol: 'SOL/USDC',
        price: 98.42,
        change24h: 5.67,
        volume: '2.4M',
        high24h: 102.15,
        low24h: 94.30,
      },
      {
        symbol: 'ETH/USDC',
        price: 2341.20,
        change24h: -2.34,
        volume: '8.7M',
        high24h: 2398.50,
        low24h: 2320.80,
      },
      {
        symbol: 'BTC/USDC',
        price: 43250.00,
        change24h: 1.89,
        volume: '15.2M',
        high24h: 43890.00,
        low24h: 42100.00,
      },
    ];
    
    res.json({ pairs: tradingPairs });
  } catch (error) {
    console.error('Trading pairs error:', error);
    res.status(500).json({ error: 'Failed to fetch trading pairs' });
  }
});

// Execute trade
router.post('/trading/execute', validateWebAppData, async (req, res) => {
  try {
    const { pair, type, amount } = req.body;
    const userId = req.telegramUser.id;
    
    // Validate trade parameters
    if (!pair || !type || !amount) {
      return res.status(400).json({ error: 'Missing trade parameters' });
    }
    
    // In a real app, execute the trade through DeFi protocols
    const trade = {
      id: Date.now(),
      userId,
      pair,
      type,
      amount: parseFloat(amount),
      price: type === 'BUY' ? 98.42 : 98.40, // Mock price
      timestamp: new Date().toISOString(),
      status: 'completed',
      txHash: '0x' + crypto.randomBytes(32).toString('hex'),
    };
    
    res.json({
      success: true,
      trade,
      message: `${type} order executed successfully!`,
    });
  } catch (error) {
    console.error('Trade execution error:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

// Pack data
router.get('/pack', validateWebAppData, async (req, res) => {
  try {
    const userId = req.telegramUser.id;
    
    const packData = {
      currentPack: {
        id: 'alpha-wolves',
        name: 'Alpha Wolves 🐺',
        rank: 8,
        members: 47,
        totalValue: 2847392.50,
        dailyPnL: 12847.30,
        winRate: 73.5,
        strategy: 'Aggressive DeFi',
        leader: 'CryptoWolf',
        joinedDate: '2024-01-15',
        level: 'Elite',
        badges: ['🏆 Top 10', '🔥 Hot Streak', '⚡ Speed Trader'],
      },
      members: [
        {
          id: 1,
          username: 'CryptoWolf',
          role: 'Leader',
          contribution: 347892.50,
          trades: 156,
          winRate: 78.2,
          isOnline: true,
        },
        {
          id: 2,
          username: req.telegramUser.username || 'You',
          role: 'Member',
          contribution: 127845.60,
          trades: 67,
          winRate: 73.1,
          isOnline: true,
          isCurrentUser: true,
        },
      ],
      leaderboard: [
        { rank: 1, name: 'Solana Sharks 🦈', value: 4892347.20, change: 8.7 },
        { rank: 8, name: 'Alpha Wolves 🐺', value: 2847392.50, change: 1.8, isCurrentPack: true },
      ],
    };
    
    res.json(packData);
  } catch (error) {
    console.error('Pack data error:', error);
    res.status(500).json({ error: 'Failed to fetch pack data' });
  }
});

// Competitions
router.get('/competitions', validateWebAppData, async (req, res) => {
  try {
    const competitions = {
      live: [
        {
          id: 1,
          title: 'Solana Speed Trading 🚀',
          description: 'Fastest SOL trades win',
          prize: 5000,
          participants: 247,
          timeLeft: '2h 34m',
          difficulty: 'Medium',
          category: 'Speed',
          isJoined: true,
          currentRank: 23,
        },
      ],
      upcoming: [
        {
          id: 4,
          title: 'Weekly Profit Challenge 💰',
          description: 'Highest weekly returns win',
          prize: 25000,
          participants: 0,
          startsIn: '6h 30m',
          difficulty: 'Medium',
          category: 'Profit',
          entryFee: 50,
        },
      ],
      my: [
        {
          id: 1,
          title: 'Solana Speed Trading 🚀',
          status: 'Active',
          rank: 23,
          score: 1247,
          prize: 5000,
          timeLeft: '2h 34m',
        },
      ],
    };
    
    res.json(competitions);
  } catch (error) {
    console.error('Competitions error:', error);
    res.status(500).json({ error: 'Failed to fetch competitions' });
  }
});

// Social feed
router.get('/social/feed', validateWebAppData, async (req, res) => {
  try {
    const feed = [
      {
        id: 1,
        user: 'CryptoWolf',
        avatar: '🐺',
        time: '5m ago',
        type: 'trade',
        content: 'Just executed a perfect arbitrage on SOL/USDC! 🚀',
        trade: {
          pair: 'SOL/USDC',
          profit: 247.50,
          percentage: 12.3,
        },
        likes: 23,
        comments: 7,
        shares: 4,
        isLiked: false,
      },
    ];
    
    res.json({ feed });
  } catch (error) {
    console.error('Social feed error:', error);
    res.status(500).json({ error: 'Failed to fetch social feed' });
  }
});

// User profile
router.get('/social/profile', validateWebAppData, async (req, res) => {
  try {
    const profile = {
      username: req.telegramUser.first_name || 'Alpha Trader',
      avatar: '🚀',
      level: 'Advanced',
      score: 11234,
      rank: 5,
      followers: 234,
      following: 156,
      totalTrades: 127,
      winRate: 73.5,
      totalProfit: 28394.60,
      achievements: [
        { id: 1, title: 'First Trade', icon: '🎯', rarity: 'Common' },
        { id: 2, title: 'Speed Demon', icon: '⚡', rarity: 'Rare' },
        { id: 3, title: 'Pack Member', icon: '🐺', rarity: 'Epic' },
      ],
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Health check for mini-app
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Alpha Pack Mini-App API',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
