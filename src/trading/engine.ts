import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { Connection } from '@solana/web3.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';

import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { Trade, ArbitrageOpportunity, User, Pack, BlockchainNetwork, TradeStatus } from '../types';
import logger from '../utils/logger';
import { validateRequest, tradeExecuteSchema } from '../utils/validation';
import { freeAI } from '../ai/free-alternatives';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sagemakerClient = new SageMakerRuntimeClient({ region: process.env.AWS_REGION });

const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

// Solana connection
let solanaConnection: Connection;

// Initialize Solana connection
async function initializeSolanaConnection(): Promise<Connection> {
  if (solanaConnection) return solanaConnection;
  
  const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
  solanaConnection = new Connection(rpcEndpoint, 'confirmed');
  return solanaConnection;
}

// Main Lambda handler
export const handler = async (event: SQSEvent, _context: Context): Promise<void> => {
  logger.info('Trading engine processing messages:', { messageCount: event.Records.length });
  
  for (const record of event.Records) {
    try {
      await processMessage(record);
    } catch (error) {
      logger.error('Error processing message:', error, { messageId: record.messageId });
      // In production, you might want to send failed messages to a DLQ
    }
  }
};

// Process individual SQS message
async function processMessage(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);
  const { action, userId, tradeData, timestamp } = message;
  
  logger.info('Processing trading action:', { action, userId, timestamp });
  
  switch (action) {
    case 'execute_trade':
      await executeTrade(userId, tradeData);
      break;
    case 'fetch_opportunities':
      await fetchArbitrageOpportunities(userId, message.chatId);
      break;
    case 'auto_arbitrage':
      await executeAutoArbitrage(userId);
      break;
    case 'update_portfolio':
      await updatePortfolioMetrics(userId);
      break;
    default:
      logger.warn('Unknown trading action:', { action });
  }
}

// Execute a trade
async function executeTrade(userId: string, tradeData: any): Promise<void> {
  try {
    // Validate trade data
    const validation = validateRequest(tradeExecuteSchema, tradeData);
    if (!validation.isValid) {
      logger.error('Invalid trade data:', { errors: validation.errors });
      return;
    }
    
    // Get user and pack information
    const user = await getUser(userId);
    if (!user) {
      logger.error('User not found:', { userId });
      return;
    }
    
    const pack = user.packId ? await getPack(user.packId) : null;
    
    // Create trade record
    const trade: Trade = {
      tradeId: `trade_${Date.now()}_${userId}`,
      userId,
      packId: user.packId,
      type: tradeData.type,
      fromToken: tradeData.fromToken,
      toToken: tradeData.toToken,
      fromAmount: tradeData.fromAmount,
      toAmount: 0, // Will be calculated
      price: 0, // Will be fetched
      slippage: tradeData.slippage,
      fee: 0, // Will be calculated
      status: TradeStatus.PENDING,
      timestamp: new Date().toISOString(),
      chain: tradeData.chain || 'solana',
    };
    
    // Save trade to database
    await docClient.send(
      new PutCommand({
        TableName: 'alphapack-trades',
        Item: trade,
      })
    );
    
    // Execute trade based on chain
    let executionResult;
    switch (trade.chain) {
      case 'solana':
        executionResult = await executeSolanaTrade(trade);
        break;
      case 'ethereum':
      case 'base':
      case 'arbitrum':
        executionResult = await executeEVMTrade(trade);
        break;
      default:
        throw new Error(`Unsupported chain: ${trade.chain}`);
    }
    
    // Update trade with execution results
    trade.status = executionResult.success ? TradeStatus.COMPLETED : TradeStatus.FAILED;
    trade.signature = executionResult.signature;
    trade.blockNumber = executionResult.blockNumber;
    trade.toAmount = executionResult.toAmount;
    trade.fee = executionResult.fee;
    
    await docClient.send(
      new UpdateCommand({
        TableName: 'alphapack-trades',
        Key: { tradeId: trade.tradeId },
        UpdateExpression: 'SET #status = :status, signature = :signature, blockNumber = :blockNumber, toAmount = :toAmount, fee = :fee',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': trade.status,
          ':signature': trade.signature,
          ':blockNumber': trade.blockNumber,
          ':toAmount': trade.toAmount,
          ':fee': trade.fee,
        },
      })
    );
    
    // Update user and pack statistics
    await updateUserStats(userId, trade);
    if (pack) {
      await updatePackStats(pack.packId, trade);
    }
    
    // Send event to EventBridge
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [{
          Source: 'alphapack.trading',
          DetailType: 'Trade Executed',
          Detail: JSON.stringify({
            trade,
            user: { userId: user.userId, username: user.username },
            pack: pack ? { packId: pack.packId, name: pack.name } : null,
          }),
        }],
      })
    );
    
    logger.info('Trade executed successfully:', { tradeId: trade.tradeId, status: trade.status });
    
  } catch (error) {
    logger.error('Trade execution failed:', error, { userId, tradeData });
  }
}

// Execute Solana trade
async function executeSolanaTrade(trade: Trade): Promise<{
  success: boolean;
  signature?: string;
  blockNumber?: number;
  toAmount: number;
  fee: number;
}> {
  try {
    await initializeSolanaConnection();
    
    // Get current price from Jupiter or other DEX aggregator
    const price = await getSolanaTokenPrice(trade.fromToken, trade.toToken);
    const toAmount = trade.fromAmount * price * (1 - trade.slippage / 100);
    
    // For demo purposes, simulate trade execution
    // In production, you would integrate with Jupiter, Orca, or other Solana DEXs
    const simulatedSignature = `solana_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const simulatedBlockNumber = Math.floor(Math.random() * 1000000) + 200000000;
    const fee = trade.fromAmount * 0.0025; // 0.25% fee
    
    logger.info('Solana trade simulated:', {
      tradeId: trade.tradeId,
      signature: simulatedSignature,
      toAmount,
      fee,
    });
    
    return {
      success: true,
      signature: simulatedSignature,
      blockNumber: simulatedBlockNumber,
      toAmount,
      fee,
    };
    
  } catch (error) {
    logger.error('Solana trade execution failed:', error);
    return {
      success: false,
      toAmount: 0,
      fee: 0,
    };
  }
}

// Execute EVM chain trade
async function executeEVMTrade(trade: Trade): Promise<{
  success: boolean;
  signature?: string;
  blockNumber?: number;
  toAmount: number;
  fee: number;
}> {
  try {
    // Simulate EVM trade execution
    // In production, integrate with 1inch, Uniswap, or other DEX aggregators
    const price = await getEVMTokenPrice(trade.fromToken, trade.toToken, trade.chain);
    const toAmount = trade.fromAmount * price * (1 - trade.slippage / 100);
    
    const simulatedTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    const simulatedBlockNumber = Math.floor(Math.random() * 1000000) + 18000000;
    const fee = trade.fromAmount * 0.003; // 0.3% fee
    
    logger.info('EVM trade simulated:', {
      tradeId: trade.tradeId,
      chain: trade.chain,
      signature: simulatedTxHash,
      toAmount,
      fee,
    });
    
    return {
      success: true,
      signature: simulatedTxHash,
      blockNumber: simulatedBlockNumber,
      toAmount,
      fee,
    };
    
  } catch (error) {
    logger.error('EVM trade execution failed:', error);
    return {
      success: false,
      toAmount: 0,
      fee: 0,
    };
  }
}

// Fetch arbitrage opportunities using Free AI
async function fetchArbitrageOpportunities(userId: string, chatId?: number): Promise<void> {
  try {
    // Get market data for analysis
    const marketData = await getMultiChainMarketData();

    // Use free AI alternatives for arbitrage detection
    const aiResponse = await freeAI.findArbitrageOpportunities(marketData);

    let opportunities: ArbitrageOpportunity[] = [];

    if (aiResponse.success) {
      opportunities = aiResponse.data.opportunities || [];
      logger.info(`Arbitrage opportunities found using ${aiResponse.service}:`, {
        count: opportunities.length,
        model: aiResponse.model,
      });
    } else {
      logger.warn('Free AI arbitrage detection failed, using fallback');
      opportunities = await getFallbackOpportunities();
    }
    
    // Filter opportunities based on user's risk tolerance
    const user = await getUser(userId);
    const filteredOpportunities = filterOpportunitiesByRisk(opportunities, user?.preferences.riskTolerance || 'medium');
    
    // Send opportunities to user via Telegram if chatId provided
    if (chatId && filteredOpportunities.length > 0) {
      await sendOpportunitiesToTelegram(chatId, filteredOpportunities);
    }
    
    // Store opportunities in cache for quick access
    await storeOpportunities(userId, filteredOpportunities);
    
    logger.info('Arbitrage opportunities fetched:', {
      userId,
      totalOpportunities: opportunities.length,
      filteredOpportunities: filteredOpportunities.length,
    });
    
  } catch (error) {
    logger.error('Failed to fetch arbitrage opportunities:', error, { userId });
  }
}

// Execute auto arbitrage
async function executeAutoArbitrage(userId: string): Promise<void> {
  try {
    const user = await getUser(userId);
    if (!user) return;
    
    // Get stored opportunities
    const opportunities = await getStoredOpportunities(userId);
    
    // Filter by user's auto-trading settings
    const autoOpportunities = opportunities.filter(opp => 
      opp.profitMargin >= 0.02 && // Minimum 2% profit
      opp.confidence >= 0.8 && // High confidence
      opp.volume <= 10000 // Maximum $10k volume
    );
    
    for (const opportunity of autoOpportunities.slice(0, 3)) { // Max 3 auto trades
      const tradeData = {
        type: 'arbitrage',
        fromToken: opportunity.token,
        toToken: 'USDC',
        fromAmount: Math.min(opportunity.volume, 1000), // Max $1k per trade
        slippage: 1.0, // 1% slippage
        chain: 'solana',
      };
      
      await executeTrade(userId, tradeData);
    }
    
  } catch (error) {
    logger.error('Auto arbitrage execution failed:', error, { userId });
  }
}

// Update portfolio metrics
async function updatePortfolioMetrics(userId: string): Promise<void> {
  try {
    // This would calculate and update user's portfolio performance
    // Including total value, P&L, win rate, etc.
    logger.info('Portfolio metrics updated:', { userId });
  } catch (error) {
    logger.error('Failed to update portfolio metrics:', error, { userId });
  }
}

// Helper functions
async function getUser(userId: string): Promise<User | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId },
      })
    );
    return response.Item as User || null;
  } catch (error) {
    logger.error('Error getting user:', error);
    return null;
  }
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

async function getSolanaTokenPrice(fromToken: string, toToken: string): Promise<number> {
  // Simulate price fetching from Jupiter or CoinGecko
  const mockPrices: Record<string, number> = {
    'SOL': 100,
    'USDC': 1,
    'USDT': 1,
    'RAY': 2.5,
    'SRM': 0.5,
  };
  
  const fromPrice = mockPrices[fromToken] || 1;
  const toPrice = mockPrices[toToken] || 1;
  
  return fromPrice / toPrice;
}

async function getEVMTokenPrice(fromToken: string, toToken: string, _chain: BlockchainNetwork): Promise<number> {
  // Simulate price fetching from 1inch or CoinGecko
  const mockPrices: Record<string, number> = {
    'ETH': 2500,
    'USDC': 1,
    'USDT': 1,
    'WBTC': 45000,
    'UNI': 8,
  };
  
  const fromPrice = mockPrices[fromToken] || 1;
  const toPrice = mockPrices[toToken] || 1;
  
  return fromPrice / toPrice;
}

function filterOpportunitiesByRisk(
  opportunities: ArbitrageOpportunity[],
  riskTolerance: 'low' | 'medium' | 'high'
): ArbitrageOpportunity[] {
  const riskThresholds = {
    low: { minProfit: 0.02, minConfidence: 0.9, maxVolume: 5000 },
    medium: { minProfit: 0.015, minConfidence: 0.8, maxVolume: 15000 },
    high: { minProfit: 0.01, minConfidence: 0.7, maxVolume: 50000 },
  };
  
  const threshold = riskThresholds[riskTolerance];
  
  return opportunities.filter(opp =>
    opp.profitMargin >= threshold.minProfit &&
    opp.confidence >= threshold.minConfidence &&
    opp.volume <= threshold.maxVolume
  );
}

async function sendOpportunitiesToTelegram(chatId: number, opportunities: ArbitrageOpportunity[]): Promise<void> {
  // This would send a message to the Telegram bot
  // Implementation depends on your Telegram bot setup
  logger.info('Sending opportunities to Telegram:', { chatId, count: opportunities.length });
}

async function storeOpportunities(userId: string, opportunities: ArbitrageOpportunity[]): Promise<void> {
  // Store in Redis or DynamoDB for quick access
  logger.info('Storing opportunities:', { userId, count: opportunities.length });
}

async function getStoredOpportunities(_userId: string): Promise<ArbitrageOpportunity[]> {
  // Retrieve from Redis or DynamoDB
  return [];
}

async function getMultiChainMarketData(): Promise<any[]> {
  // Simulate getting market data from multiple chains
  return [
    {
      exchange: 'Jupiter',
      chain: 'solana',
      token: 'SOL',
      price: 100.5,
      volume: 1000000,
      liquidity: 5000000,
    },
    {
      exchange: 'Uniswap',
      chain: 'ethereum',
      token: 'SOL',
      price: 101.2,
      volume: 800000,
      liquidity: 3000000,
    },
    {
      exchange: 'BaseSwap',
      chain: 'base',
      token: 'SOL',
      price: 99.8,
      volume: 500000,
      liquidity: 2000000,
    },
    {
      exchange: 'Camelot',
      chain: 'arbitrum',
      token: 'SOL',
      price: 100.9,
      volume: 600000,
      liquidity: 2500000,
    },
  ];
}

async function getFallbackOpportunities(): Promise<ArbitrageOpportunity[]> {
  // Fallback opportunities when AI fails
  return [
    {
      opportunityId: 'fallback-1',
      token: 'SOL',
      fromExchange: 'BaseSwap',
      toExchange: 'Uniswap',
      buyPrice: 99.8,
      sellPrice: 101.2,
      profitMargin: 0.014, // 1.4%
      volume: 1000,
      confidence: 0.75,
      estimatedGas: 25,
      expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
      chain: BlockchainNetwork.SOLANA,
    },
  ];
}

async function updateUserStats(userId: string, trade: Trade): Promise<void> {
  // Update user trading statistics
  const isWin = trade.status === 'completed';
  const profitLoss = isWin ? (trade.toAmount - trade.fromAmount - trade.fee) : -trade.fee;
  
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.USER_TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'ADD stats.totalTrades :one, stats.totalVolume :volume, stats.profitLoss :pnl SET stats.winRate = if_not_exists(stats.winRate, :zero) + :winIncrement',
      ExpressionAttributeValues: {
        ':one': 1,
        ':volume': trade.fromAmount,
        ':pnl': profitLoss,
        ':zero': 0,
        ':winIncrement': isWin ? 0.1 : -0.05, // Simplified win rate calculation
      },
    })
  );
}

async function updatePackStats(packId: string, trade: Trade): Promise<void> {
  // Update pack trading statistics
  const profitLoss = trade.status === 'completed' ? (trade.toAmount - trade.fromAmount - trade.fee) : -trade.fee;
  
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.PACK_TABLE_NAME,
      Key: { packId },
      UpdateExpression: 'ADD totalVolume :volume, score :score',
      ExpressionAttributeValues: {
        ':volume': trade.fromAmount,
        ':score': Math.max(0, profitLoss * 10), // Score based on profit
      },
    })
  );
}
