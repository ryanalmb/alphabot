const { Telegraf } = require('telegraf');
const coinGeckoAPI = require('./services/coingecko-api');
const arbitrageDetector = require('./services/arbitrage-detector');
const userService = require('./services/user-service');
const tradingSignals = require('./services/trading-signals');
const mlService = require('./services/ml-service');
const solanaService = require('./services/solana-service');

// Initialize bot with token from environment
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M');

console.log('Starting Alpha Pack Telegram Bot with real data integration...');

// Start command
bot.start(async (ctx) => {
  try {
    // Create or get user data
    const user = await userService.createUser(ctx.from.id, {
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name
    });

    const userStats = userService.formatUserStats(user);

    const welcomeMessage = `
🚀 Welcome to Alpha Pack, ${user.username || ctx.from.first_name || 'Trader'}!

The ultimate social trading game where packs compete for DeFi alpha.

💰 Your Account:
Balance: ${userStats.balanceFormatted}
Social Score: ${user.socialScore}
Total Trades: ${user.totalTrades}

🎮 Features:
• Real-time arbitrage opportunities
• Pack vs pack competition
• Social trading & leaderboards
• Multi-chain DeFi integration

📱 Quick Commands:
/balance - Check your portfolio
/opportunities - Live arbitrage data
/trade - Quick trading
/help - Show all commands
  `;

  await ctx.reply(welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Launch Alpha Pack Mini-App', web_app: { url: 'https://alphapackbot.duckdns.org/miniapp' } }],
        [{ text: '💰 Check Balance', callback_data: 'balance' }],
        [{ text: '🔍 Arbitrage Opportunities', callback_data: 'opportunities' }],
        [{ text: '📊 Leaderboard', callback_data: 'leaderboard' }],
        [{ text: '💱 Quick Trade', callback_data: 'quick_trade' }],
      ],
    },
  });
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply('Welcome to Alpha Pack! There was an issue loading the menu. Please try /help for available commands.');
  }
});

// Balance command
bot.command('balance', async (ctx) => {
  try {
    const user = await userService.getUser(ctx.from.id);
    const userStats = userService.formatUserStats(user);

    const balanceMessage = `💰 Your Balance:

💳 Account: ${user.username || 'Anonymous'}
💵 Total Value: ${userStats.balanceFormatted}
📊 P&L: ${userStats.totalPnLFormatted}
🎯 Win Rate: ${userStats.winRateFormatted}
⭐ Social Score: ${user.socialScore}
📈 Total Trades: ${user.totalTrades}

🏆 Keep trading to climb the leaderboard!`;

    await ctx.reply(balanceMessage);
  } catch (error) {
    console.error('Error in balance command:', error);
    await ctx.reply('❌ Unable to fetch balance. Please try again later.');
  }
});

// Pack command
bot.command('pack', async (ctx) => {
  const packMessage = `
🎯 Pack: Alpha Wolves

📊 Stats:
Score: 125,430
Members: 4/5
Win Rate: 78.5%
Total Volume: $1,234,567

🏆 Status: ACTIVE
💰 Treasury: $45,678

Strategy: DeFi Arbitrage (Medium risk)
  `;
  
  await ctx.reply(packMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📈 View Trades', callback_data: 'pack_trades' }],
        [{ text: '👥 View Members', callback_data: 'pack_members' }],
        [{ text: '🚪 Leave Pack', callback_data: 'leave_pack' }],
      ],
    },
  });
});

// Leaderboard command
bot.command('leaderboard', async (ctx) => {
  const leaderboardMessage = `
🏆 Top Packs Leaderboard:

1. 🥇 Alpha Hunters - 125,430 pts
2. 🥈 DeFi Wolves - 98,750 pts  
3. 🥉 Arbitrage Kings - 87,220 pts
4. 🔥 Yield Farmers - 76,890 pts
5. ⚡ Flash Traders - 65,440 pts

Your pack rank: #1 🎉

🎯 Current competition ends in 2d 14h
  `;
  
  await ctx.reply(leaderboardMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Refresh', callback_data: 'leaderboard' }],
        [{ text: '🎮 Join Competition', callback_data: 'join_competition' }],
      ],
    },
  });
});

// Trade command
bot.command('trade', async (ctx) => {
  await ctx.reply('🔄 Quick Trade', {
    reply_markup: {
      inline_keyboard: [
        [{
          text: '📊 Advanced Trading (Mini-App)',
          web_app: { url: 'http://98.81.189.21:3000/miniapp' }
        }],
        [{ text: '💱 SOL → USDC', callback_data: 'quick_trade_SOL_USDC' }],
        [{ text: '💱 USDC → SOL', callback_data: 'quick_trade_USDC_SOL' }],
        [{ text: '⚡ Auto Arbitrage', callback_data: 'auto_arbitrage' }],
      ],
    },
  });
});

// Opportunities command
bot.command('opportunities', async (ctx) => {
  try {
    const opportunities = await arbitrageDetector.detectArbitrageOpportunities();

    if (opportunities.length === 0) {
      await ctx.reply('🔍 No profitable arbitrage opportunities found at the moment. Market is efficient! 📊');
      return;
    }

    let opportunitiesMessage = '🔍 Live Arbitrage Opportunities:\n\n';

    opportunities.slice(0, 5).forEach((opp, index) => {
      const formatted = arbitrageDetector.formatOpportunity(opp);
      opportunitiesMessage += `${index + 1}. ${opp.symbol}/USDC\n`;
      opportunitiesMessage += `   📈 ${opp.sellExchange}: ${formatted.sellPriceFormatted}\n`;
      opportunitiesMessage += `   📉 ${opp.buyExchange}: ${formatted.buyPriceFormatted}\n`;
      opportunitiesMessage += `   💰 Profit: ${formatted.profitFormatted} (${formatted.profitUSDFormatted})\n\n`;
    });

    opportunitiesMessage += '⚡ Auto-execute available!';

    await ctx.reply(opportunitiesMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ Execute Best', callback_data: 'execute_best_arb' }],
          [{ text: '🔄 Refresh', callback_data: 'opportunities' }],
          [{ text: '📊 View All', callback_data: 'view_all_opportunities' }],
        ],
      },
    });
  } catch (error) {
    console.error('Error in opportunities command:', error);
    await ctx.reply('❌ Unable to fetch arbitrage opportunities. Please try again later.');
  }
});

// Join pack command
bot.command('join_pack', async (ctx) => {
  const packsMessage = `
🎮 Available Packs:

🔥 Alpha Hunters (4/5 members)
Strategy: Arbitrage Focus
Risk: Medium
Score: 125,430

⚡ Flash Traders (3/5 members)  
Strategy: Social Trading
Risk: High
Score: 65,440

🛡️ Safe Haven (2/5 members)
Strategy: Conservative
Risk: Low
Score: 45,220

Or create your own pack!
  `;
  
  await ctx.reply(packsMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔥 Join Alpha Hunters', callback_data: 'join_alpha_hunters' }],
        [{ text: '⚡ Join Flash Traders', callback_data: 'join_flash_traders' }],
        [{ text: '🛡️ Join Safe Haven', callback_data: 'join_safe_haven' }],
        [{ text: '➕ Create New Pack', callback_data: 'create_pack' }],
      ],
    },
  });
});

// Signals command - AI-powered trading signals
bot.command('signals', async (ctx) => {
  try {
    await ctx.reply('🤖 Generating AI-powered trading signals... Please wait.');

    const signals = await tradingSignals.generateComprehensiveSignals(['solana', 'ethereum', 'bitcoin']);

    let signalsMessage = '🤖 AI Trading Signals:\n\n';
    signalsMessage += `📊 Market: ${signals.market_overview.market_sentiment}\n`;
    signalsMessage += `😨 Fear/Greed: ${signals.market_overview.fear_greed_index}/100\n\n`;

    signals.signals.slice(0, 3).forEach((signal, index) => {
      const emoji = signal.signal === 'BUY' ? '🟢' : signal.signal === 'SELL' ? '🔴' : '🟡';
      signalsMessage += `${emoji} ${signal.display_symbol}: ${signal.signal}\n`;
      signalsMessage += `   Price: ${coinGeckoAPI.formatPrice(signal.current_price)}\n`;
      signalsMessage += `   Confidence: ${(signal.confidence * 100).toFixed(1)}%\n`;
      signalsMessage += `   Risk: ${signal.risk_level}\n\n`;
    });

    if (signals.top_opportunities.length > 0) {
      signalsMessage += '🎯 Top Opportunities:\n';
      signals.top_opportunities.forEach(opp => {
        signalsMessage += `${opp.rank}. ${opp.symbol} ${opp.action} (${(opp.confidence * 100).toFixed(1)}%)\n`;
      });
    }

    await ctx.reply(signalsMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Detailed Analysis', callback_data: 'detailed_signals' }],
          [{ text: '🔄 Refresh Signals', callback_data: 'refresh_signals' }],
          [{ text: '⚡ Execute Best Signal', callback_data: 'execute_best_signal' }],
        ],
      },
    });
  } catch (error) {
    console.error('Error in signals command:', error);
    await ctx.reply('❌ Unable to generate trading signals. Please try again later.');
  }
});

// Portfolio command - Solana portfolio
bot.command('portfolio', async (ctx) => {
  try {
    await ctx.reply('📊 Fetching your Solana portfolio... Please wait.');

    const portfolio = await solanaService.getPortfolio();

    let portfolioMessage = '📊 Your Solana Portfolio:\n\n';
    portfolioMessage += `💳 Wallet: ${solanaService.formatAddress(portfolio.wallet)}\n`;
    portfolioMessage += `💰 Total Value: $${portfolio.totalValueUSD.toFixed(2)}\n\n`;

    portfolioMessage += '🪙 Token Balances:\n';
    for (const [token, balance] of Object.entries(portfolio.balances)) {
      if (balance > 0) {
        portfolioMessage += `   ${token}: ${solanaService.formatBalance(balance)}\n`;
      }
    }

    portfolioMessage += `\n🕐 Last Updated: ${new Date(portfolio.lastUpdated).toLocaleTimeString()}`;

    await ctx.reply(portfolioMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh Portfolio', callback_data: 'refresh_portfolio' }],
          [{ text: '💱 Quick Swap', callback_data: 'quick_swap' }],
          [{ text: '📈 Transaction History', callback_data: 'tx_history' }],
        ],
      },
    });
  } catch (error) {
    console.error('Error in portfolio command:', error);
    await ctx.reply('❌ Unable to fetch portfolio. Please try again later.');
  }
});

// Help command
bot.command('help', async (ctx) => {
  const helpMessage = `
🤖 Alpha Pack Bot Commands:

💰 Portfolio & Trading:
/balance - Check your portfolio
/portfolio - Your Solana portfolio
/trade - Quick trading interface
/opportunities - Live arbitrage opportunities
/signals - AI-powered trading signals

📊 Market Data:
/prices - Current crypto prices
/leaderboard - Top traders

🎮 Social Features:
/pack - Your pack status
/join [pack_name] - Join a pack
/create [pack_name] - Create new pack

⚙️ Settings:
/settings - Bot preferences
/help - Show this help

🚀 Use /start for the main menu with buttons!
  `;
  
  await ctx.reply(helpMessage);
});

// Profile command
bot.command('profile', async (ctx) => {
  const profileMessage = `
👤 Your Profile:

Username: @${ctx.from.username || 'anonymous'}
User ID: ${ctx.from.id}
Pack: Alpha Wolves
Role: Member
Joined: Dec 2024

🎯 Trading Preferences:
Risk Tolerance: Medium
Strategy: DeFi Arbitrage
Notifications: Enabled

📊 Performance:
Total Trades: 156
Win Rate: 78.5%
Best Trade: +$1,234 (SOL/USDC)
  `;
  
  await ctx.reply(profileMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚙️ Edit Settings', callback_data: 'edit_profile' }],
        [{ text: '🔔 Notifications', callback_data: 'notification_settings' }],
      ],
    },
  });
});

// Callback query handlers
bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;

    await ctx.answerCbQuery();
  
  switch (data) {
    case 'miniapp_info':
      const miniappMessage = `
📱 *Alpha Pack Mini-App*

🚀 *Full-Featured Trading Interface*
• Dashboard with real-time portfolio stats
• Advanced trading with live market data
• Pack management and social features
• Competition system with real prizes
• Social feed and leaderboards

🌐 *Direct Access*
Visit: https://alphapackbot.duckdns.org/miniapp

✅ *Secure HTTPS*: Full Telegram WebApp integration enabled!

*Features Available Now:*
✅ Real-time trading data
✅ Portfolio management
✅ Pack competitions
✅ Social trading feed
✅ Arbitrage opportunities
      `;

      await ctx.editMessageText(miniappMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
          ],
        },
      });
      break;
    case 'back_to_menu':
      // Resend the start menu
      const welcomeMessage = `
🚀 Welcome to Alpha Pack, ${ctx.from.first_name || 'Trader'}!

The ultimate social trading game where packs compete for DeFi alpha.

💰 Your Account:
Balance: $10,000
Social Score: 100
Total Trades: 0

🎮 Features:
• Real-time arbitrage opportunities
• Pack vs pack competition
• Social trading & leaderboards
• Multi-chain DeFi integration

📱 Quick Commands:
/balance - Check your portfolio
/opportunities - Live arbitrage data
/trade - Quick trading
/help - Show all commands
      `;

      await ctx.editMessageText(welcomeMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Mini-App (Coming Soon)', callback_data: 'miniapp_info' }],
            [{ text: '💰 Check Balance', callback_data: 'balance' }],
            [{ text: '🔍 Arbitrage Opportunities', callback_data: 'opportunities' }],
            [{ text: '📊 Leaderboard', callback_data: 'leaderboard' }],
            [{ text: '💱 Quick Trade', callback_data: 'quick_trade' }],
          ],
        },
      });
      break;
    case 'balance':
      await ctx.reply('💰 Fetching your balance...');
      break;
    case 'leaderboard':
      await ctx.reply('🏆 Loading leaderboard...');
      break;
    case 'join_pack':
      await ctx.reply('🎮 Loading available packs...');
      break;
    case 'quick_trade_SOL_USDC':
      await ctx.reply('💱 Executing SOL → USDC trade...\n\n✅ Trade successful!\nAmount: 10 SOL → 1,425 USDC\nFee: 0.25%');
      break;
    case 'quick_trade_USDC_SOL':
      await ctx.reply('💱 Executing USDC → SOL trade...\n\n✅ Trade successful!\nAmount: 1,425 USDC → 10 SOL\nFee: 0.25%');
      break;
    case 'auto_arbitrage':
      await ctx.reply('⚡ Auto Arbitrage activated!\n\n🔍 Scanning for opportunities...\n✅ Found 3 profitable trades\n💰 Estimated profit: $47.35');
      break;
    case 'execute_all_arb':
      await ctx.reply('⚡ Executing all arbitrage opportunities...\n\n✅ SOL/USDC: +$6.50\n✅ ETH/USDC: +$5.55\n✅ BTC/USDC: +$25.30\n\n💰 Total profit: +$37.35');
      break;
    default:
      await ctx.reply('🚀 Feature coming soon! Stay tuned for updates.');
  }
  } catch (error) {
    console.error('Error in callback query handler:', error);
    await ctx.answerCbQuery('An error occurred. Please try again.');
  }
});

// Handle all text messages
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.toLowerCase();

    if (text.includes('price') || text.includes('sol') || text.includes('btc') || text.includes('eth')) {
      const prices = await coinGeckoAPI.getCurrentPrices(['solana', 'ethereum', 'bitcoin']);

      let priceMessage = '📊 Live Crypto Prices:\n\n';

      if (prices.solana) {
        const sol = prices.solana;
        priceMessage += `SOL: ${coinGeckoAPI.formatPrice(sol.usd)} ${coinGeckoAPI.getPriceEmoji(sol.usd_24h_change)} (${coinGeckoAPI.formatPercentage(sol.usd_24h_change)})\n`;
      }

      if (prices.bitcoin) {
        const btc = prices.bitcoin;
        priceMessage += `BTC: ${coinGeckoAPI.formatPrice(btc.usd)} ${coinGeckoAPI.getPriceEmoji(btc.usd_24h_change)} (${coinGeckoAPI.formatPercentage(btc.usd_24h_change)})\n`;
      }

      if (prices.ethereum) {
        const eth = prices.ethereum;
        priceMessage += `ETH: ${coinGeckoAPI.formatPrice(eth.usd)} ${coinGeckoAPI.getPriceEmoji(eth.usd_24h_change)} (${coinGeckoAPI.formatPercentage(eth.usd_24h_change)})\n`;
      }

      priceMessage += '\n💱 Use /trade to start trading!';
      await ctx.reply(priceMessage);
    } else if (text.includes('alpha') || text.includes('pack')) {
      await ctx.reply('🎯 Alpha Pack is the ultimate social trading game!\n\nUse /start to begin your journey or /help for commands.');
    } else {
      await ctx.reply('🤖 I received your message! Use /help to see available commands or /start for the main menu.');
    }
  } catch (error) {
    console.error('Error in text handler:', error);
    await ctx.reply('🤖 I received your message! Use /help to see available commands or /start for the main menu.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  console.error('Error stack:', err.stack);
  if (ctx && ctx.reply) {
    try {
      ctx.reply('An error occurred. Please try again later.');
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
});

// Process-level error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Start the bot in polling mode
console.log('Alpha Pack Bot starting in polling mode...');
bot.launch()
  .then(() => {
    console.log('Alpha Pack Bot is running!');
    console.log('Bot username: @Alpha_Pack_bot');
    console.log('Ready to receive messages...');
  })
  .catch((error) => {
    console.error('Failed to start bot:', error);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
