import { Telegraf, Context } from 'telegraf';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secretsmanager';
import { User, Pack, TelegramMessage, APIResponse } from '../types';
import { logger } from '../utils/logger';
import { validateUser, validatePack } from '../utils/validation';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// Bot instance
let bot: Telegraf;

// Initialize bot with token from Secrets Manager
async function initializeBot(): Promise<Telegraf> {
  if (bot) return bot;

  try {
    const secretResponse = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: 'alphapack/telegram/bot-token',
      })
    );

    const secret = JSON.parse(secretResponse.SecretString || '{}');
    const botToken = secret.token;

    if (!botToken) {
      throw new Error('Bot token not found in secrets');
    }

    bot = new Telegraf(botToken);
    setupBotCommands();
    return bot;
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    throw error;
  }
}

// Setup bot commands and handlers
function setupBotCommands(): void {
  // Start command
  bot.start(async (ctx) => {
    const user = await getOrCreateUser(ctx);
    const welcomeMessage = `
🚀 Welcome to Alpha Pack!

The ultimate social trading game where packs compete for DeFi alpha.

Available commands:
/balance - Check your token holdings
/pack - View your pack status
/join_pack - Join or create a pack
/leaderboard - View top packs
/trade - Execute a trade
/opportunities - View arbitrage opportunities
/profile - Manage your profile
/help - Show all commands

Ready to hunt for alpha? 🎯
    `;
    
    await ctx.reply(welcomeMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Join Pack', callback_data: 'join_pack' }],
          [{ text: '📊 View Leaderboard', callback_data: 'leaderboard' }],
          [{ text: '💰 Check Balance', callback_data: 'balance' }],
        ],
      },
    });
  });

  // Balance command
  bot.command('balance', async (ctx) => {
    try {
      const user = await getUser(ctx.from?.id.toString());
      if (!user) {
        await ctx.reply('Please use /start to register first.');
        return;
      }

      const balanceMessage = `
💰 Your Balance:

Wallet: ${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-8)}
Total Value: $${user.stats.totalVolume.toLocaleString()}
P&L: ${user.stats.profitLoss >= 0 ? '+' : ''}$${user.stats.profitLoss.toLocaleString()}
Win Rate: ${(user.stats.winRate * 100).toFixed(1)}%
Social Score: ${user.stats.socialScore}

🏆 Rank: #${user.stats.rank}
      `;

      await ctx.reply(balanceMessage);
    } catch (error) {
      logger.error('Balance command error:', error);
      await ctx.reply('Error fetching balance. Please try again.');
    }
  });

  // Pack command
  bot.command('pack', async (ctx) => {
    try {
      const user = await getUser(ctx.from?.id.toString());
      if (!user) {
        await ctx.reply('Please use /start to register first.');
        return;
      }

      if (!user.packId) {
        await ctx.reply('You are not in a pack. Use /join_pack to join one!', {
          reply_markup: {
            inline_keyboard: [[{ text: '🎮 Join Pack', callback_data: 'join_pack' }]],
          },
        });
        return;
      }

      const pack = await getPack(user.packId);
      if (!pack) {
        await ctx.reply('Pack not found. Please contact support.');
        return;
      }

      const packMessage = `
🎯 Pack: ${pack.name}

📊 Stats:
Score: ${pack.score.toLocaleString()}
Members: ${pack.members.length}/${pack.maxMembers}
Win Rate: ${(pack.winRate * 100).toFixed(1)}%
Total Volume: $${pack.totalVolume.toLocaleString()}

🏆 Status: ${pack.status.toUpperCase()}
💰 Treasury: $${pack.treasury.totalValue.toLocaleString()}

Strategy: ${pack.strategy.focus} (${pack.strategy.riskLevel} risk)
      `;

      await ctx.reply(packMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📈 View Trades', callback_data: `pack_trades_${pack.packId}` }],
            [{ text: '👥 View Members', callback_data: `pack_members_${pack.packId}` }],
            [{ text: '🚪 Leave Pack', callback_data: `leave_pack_${pack.packId}` }],
          ],
        },
      });
    } catch (error) {
      logger.error('Pack command error:', error);
      await ctx.reply('Error fetching pack info. Please try again.');
    }
  });

  // Leaderboard command
  bot.command('leaderboard', async (ctx) => {
    try {
      // This would typically fetch from DynamoDB with GSI
      const leaderboardMessage = `
🏆 Top Packs Leaderboard:

1. 🥇 Alpha Hunters - 125,430 pts
2. 🥈 DeFi Wolves - 98,750 pts  
3. 🥉 Arbitrage Kings - 87,220 pts
4. 🔥 Yield Farmers - 76,890 pts
5. ⚡ Flash Traders - 65,440 pts

Your pack rank: Loading...

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
    } catch (error) {
      logger.error('Leaderboard command error:', error);
      await ctx.reply('Error fetching leaderboard. Please try again.');
    }
  });

  // Quick trade command
  bot.command('trade', async (ctx) => {
    await ctx.reply('🔄 Quick Trade', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💱 SOL → USDC', callback_data: 'quick_trade_SOL_USDC' }],
          [{ text: '💱 USDC → SOL', callback_data: 'quick_trade_USDC_SOL' }],
          [{ text: '⚡ Auto Arbitrage', callback_data: 'auto_arbitrage' }],
          [{ text: '📊 Advanced Trading', url: 'https://app.alphapack.io/trade' }],
        ],
      },
    });
  });

  // Opportunities command
  bot.command('opportunities', async (ctx) => {
    try {
      // Send message to trading queue to fetch opportunities
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: process.env.TRADING_QUEUE_URL,
          MessageBody: JSON.stringify({
            action: 'fetch_opportunities',
            userId: ctx.from?.id.toString(),
            chatId: ctx.chat?.id,
          }),
        })
      );

      await ctx.reply('🔍 Scanning for arbitrage opportunities...\n\nResults will appear shortly.');
    } catch (error) {
      logger.error('Opportunities command error:', error);
      await ctx.reply('Error fetching opportunities. Please try again.');
    }
  });

  // Alert command
  bot.command('alert', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) {
      await ctx.reply('Usage: /alert <token> <price>\nExample: /alert SOL 150');
      return;
    }

    const [token, priceStr] = args;
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
      await ctx.reply('Invalid price. Please enter a valid number.');
      return;
    }

    // Store alert in DynamoDB (implementation would go here)
    await ctx.reply(`✅ Alert set for ${token.toUpperCase()} at $${price}`);
  });

  // Callback query handlers
  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    if (data === 'balance') {
      await ctx.answerCbQuery();
      await bot.telegram.sendMessage(ctx.chat?.id!, '/balance');
    } else if (data === 'leaderboard') {
      await ctx.answerCbQuery();
      await bot.telegram.sendMessage(ctx.chat?.id!, '/leaderboard');
    } else if (data === 'join_pack') {
      await ctx.answerCbQuery();
      await showAvailablePacks(ctx);
    } else if (data.startsWith('quick_trade_')) {
      await ctx.answerCbQuery();
      await handleQuickTrade(ctx, data);
    } else if (data === 'auto_arbitrage') {
      await ctx.answerCbQuery();
      await handleAutoArbitrage(ctx);
    }
  });

  // Error handling
  bot.catch((err, ctx) => {
    logger.error('Bot error:', err);
    ctx.reply('An error occurred. Please try again later.');
  });
}

// Helper functions
async function getUser(telegramId: string): Promise<User | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId: telegramId },
      })
    );
    return response.Item as User || null;
  } catch (error) {
    logger.error('Error getting user:', error);
    return null;
  }
}

async function getOrCreateUser(ctx: Context): Promise<User> {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) throw new Error('No Telegram ID');

  let user = await getUser(telegramId);
  
  if (!user) {
    // Create new user
    user = {
      userId: telegramId,
      telegramId,
      walletAddress: '', // Will be set when user connects wallet
      username: ctx.from?.username || `user_${telegramId}`,
      role: 'member' as any,
      stats: {
        totalTrades: 0,
        totalVolume: 0,
        winRate: 0,
        profitLoss: 0,
        socialScore: 0,
        rank: 0,
        achievements: [],
      },
      preferences: {
        riskTolerance: 'medium',
        tradingStyle: 'moderate',
        notifications: {
          tradingAlerts: true,
          packUpdates: true,
          competitionAlerts: true,
          socialMentions: true,
          priceAlerts: true,
        },
        privacy: {
          showStats: true,
          showTrades: false,
          allowPackInvites: true,
          publicProfile: true,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.USER_TABLE_NAME,
        Item: user,
      })
    );
  }

  return user;
}

async function getPack(packId: string): Promise<Pack | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: process.env.PACK_TABLE_NAME,
        Key: { packId },
      })
    );
    return response.Item as Pack || null;
  } catch (error) {
    logger.error('Error getting pack:', error);
    return null;
  }
}

async function showAvailablePacks(ctx: Context): Promise<void> {
  // This would query DynamoDB for available packs
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
        [{ text: '🔥 Join Alpha Hunters', callback_data: 'join_pack_alpha_hunters' }],
        [{ text: '⚡ Join Flash Traders', callback_data: 'join_pack_flash_traders' }],
        [{ text: '🛡️ Join Safe Haven', callback_data: 'join_pack_safe_haven' }],
        [{ text: '➕ Create New Pack', callback_data: 'create_pack' }],
      ],
    },
  });
}

async function handleQuickTrade(ctx: Context, data: string): Promise<void> {
  const [, , fromToken, toToken] = data.split('_');
  
  await ctx.reply(`🔄 Executing ${fromToken} → ${toToken} trade...\n\nThis will open the trading interface.`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Open Trading App', url: 'https://app.alphapack.io/trade' }],
      ],
    },
  });
}

async function handleAutoArbitrage(ctx: Context): Promise<void> {
  await ctx.reply('⚡ Auto Arbitrage Mode\n\nScanning cross-chain opportunities...', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎯 Enable Auto-Trading', callback_data: 'enable_auto_trading' }],
        [{ text: '⚙️ Configure Settings', callback_data: 'arbitrage_settings' }],
      ],
    },
  });
}

// Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const bot = await initializeBot();
    
    if (event.body) {
      const update = JSON.parse(event.body);
      await bot.handleUpdate(update);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    logger.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
