const { Telegraf } = require('telegraf');

// Initialize bot with token from environment
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M');

console.log('🤖 Starting Alpha Pack Telegram Bot...');

// Start command
bot.start(async (ctx) => {
  const welcomeMessage = `
🚀 Welcome to Alpha Pack!

The ultimate social trading game where packs compete for DeFi alpha.

🎯 Launch the Alpha Pack Mini-App for the full experience with:
• Real-time trading interface
• Live market data & charts
• Pack management & leaderboards
• Advanced arbitrage tools

Or use these quick commands:
/balance - Check your token holdings
/pack - View your pack status
/trade - Quick trading
/help - Show all commands
  `;

  await ctx.reply(welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [{
          text: '🚀 Launch Alpha Pack',
          web_app: { url: 'http://54.160.250.73:3000/miniapp' }
        }],
        [{ text: '💰 Quick Balance', callback_data: 'balance' }],
        [{ text: '📊 Leaderboard', callback_data: 'leaderboard' }],
        [{ text: '⚡ Quick Trade', callback_data: 'quick_trade' }],
      ],
    },
  });
});

// Balance command
bot.command('balance', async (ctx) => {
  const balanceMessage = `
💰 Your Balance:

Wallet: 0x1234...5678 (Demo)
Total Value: $12,345.67
P&L: +$2,345.67 (+23.4%)
Win Rate: 78.5%
Social Score: 1,250

🏆 Rank: #42
  `;
  await ctx.reply(balanceMessage);
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
          web_app: { url: 'http://54.160.250.73:3000/miniapp' }
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
  const opportunitiesMessage = `
🔍 Live Arbitrage Opportunities:

1. SOL/USDC
   📈 Raydium: $142.50
   📉 Orca: $141.85
   💰 Profit: +0.46% ($6.50)

2. ETH/USDC
   📈 Uniswap: $2,345.67
   📉 SushiSwap: $2,340.12
   💰 Profit: +0.24% ($5.55)

3. BTC/USDC
   📈 Jupiter: $43,210.50
   📉 Serum: $43,185.20
   💰 Profit: +0.06% ($25.30)

⚡ Auto-execute available!
  `;
  
  await ctx.reply(opportunitiesMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚡ Execute All', callback_data: 'execute_all_arb' }],
        [{ text: '🎯 Execute SOL', callback_data: 'execute_sol_arb' }],
        [{ text: '🔄 Refresh', callback_data: 'opportunities' }],
      ],
    },
  });
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

// Help command
bot.command('help', async (ctx) => {
  const helpMessage = `
🤖 Alpha Pack Bot Commands:

🚀 /start - Welcome & main menu
💰 /balance - Check your holdings
🎯 /pack - View your pack status
🎮 /join_pack - Join or create a pack
🏆 /leaderboard - Top packs ranking
💱 /trade - Quick trading interface
🔍 /opportunities - Live arbitrage opportunities
👤 /profile - Manage your profile
❓ /help - Show this help message

🌐 Web App: http://54.89.202.8:3000

Need support? Contact @AlphaPackSupport
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
  const data = ctx.callbackQuery.data;
  
  await ctx.answerCbQuery();
  
  switch (data) {
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
});

// Handle all text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase();
  
  if (text.includes('price') || text.includes('sol') || text.includes('btc') || text.includes('eth')) {
    await ctx.reply('📊 Current Prices:\n\nSOL: $142.50 (+2.3%)\nBTC: $43,210 (+1.8%)\nETH: $2,345 (+3.1%)\n\nUse /trade to start trading!');
  } else if (text.includes('alpha') || text.includes('pack')) {
    await ctx.reply('🎯 Alpha Pack is the ultimate social trading game!\n\nUse /start to begin your journey or /help for commands.');
  } else {
    await ctx.reply('🤖 I received your message! Use /help to see available commands or /start for the main menu.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Start the bot in polling mode
console.log('🚀 Alpha Pack Bot starting in polling mode...');
bot.launch()
  .then(() => {
    console.log('✅ Alpha Pack Bot is running!');
    console.log('🔗 Bot username: @AlphaPackBot');
    console.log('📱 Ready to receive messages...');
  })
  .catch((error) => {
    console.error('❌ Failed to start bot:', error);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
