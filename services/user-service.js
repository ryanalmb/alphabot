const AWS = require('aws-sdk');

class UserService {
  constructor() {
    // Configure DynamoDB
    this.dynamodb = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.usersTable = 'alpha-pack-users';
    this.packsTable = 'alpha-pack-packs';
    this.tradesTable = 'alpha-pack-trades';
    
    // In-memory cache for development (replace with Redis in production)
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  async createUser(telegramId, userData = {}) {
    const user = {
      telegramId: telegramId.toString(),
      username: userData.username || 'anonymous',
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      joinedAt: new Date().toISOString(),
      balance: 10000, // Starting balance in USD
      totalTrades: 0,
      winningTrades: 0,
      totalPnL: 0,
      socialScore: 100,
      packId: null,
      settings: {
        riskTolerance: 'medium',
        notifications: true,
        strategy: 'balanced'
      },
      portfolio: {
        cash: 10000,
        positions: []
      }
    };

    try {
      // Try to create DynamoDB table if it doesn't exist
      await this.ensureTablesExist();
      
      await this.dynamodb.put({
        TableName: this.usersTable,
        Item: user,
        ConditionExpression: 'attribute_not_exists(telegramId)'
      }).promise();
      
      console.log(`Created new user: ${telegramId}`);
      return user;
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        // User already exists, return existing user
        return await this.getUser(telegramId);
      }
      
      console.error('Error creating user:', error);
      // Fallback to in-memory storage
      this.cache.set(`user_${telegramId}`, user);
      return user;
    }
  }

  async getUser(telegramId) {
    try {
      const result = await this.dynamodb.get({
        TableName: this.usersTable,
        Key: { telegramId: telegramId.toString() }
      }).promise();
      
      if (result.Item) {
        return result.Item;
      }
    } catch (error) {
      console.error('Error getting user from DynamoDB:', error);
    }
    
    // Fallback to cache
    const cached = this.cache.get(`user_${telegramId}`);
    if (cached) {
      return cached;
    }
    
    // Create new user if not found
    return await this.createUser(telegramId);
  }

  async updateUser(telegramId, updates) {
    try {
      const updateExpression = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};
      
      for (const [key, value] of Object.entries(updates)) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
        expressionAttributeNames[`#${key}`] = key;
      }
      
      await this.dynamodb.update({
        TableName: this.usersTable,
        Key: { telegramId: telegramId.toString() },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames
      }).promise();
      
      return await this.getUser(telegramId);
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Fallback to cache update
      const user = this.cache.get(`user_${telegramId}`);
      if (user) {
        Object.assign(user, updates);
        this.cache.set(`user_${telegramId}`, user);
        return user;
      }
      
      throw error;
    }
  }

  async recordTrade(telegramId, tradeData) {
    const trade = {
      id: `${telegramId}_${Date.now()}`,
      telegramId: telegramId.toString(),
      timestamp: new Date().toISOString(),
      ...tradeData
    };

    try {
      await this.dynamodb.put({
        TableName: this.tradesTable,
        Item: trade
      }).promise();
      
      // Update user stats
      const user = await this.getUser(telegramId);
      const isWinning = tradeData.pnl > 0;
      
      await this.updateUser(telegramId, {
        totalTrades: user.totalTrades + 1,
        winningTrades: user.winningTrades + (isWinning ? 1 : 0),
        totalPnL: user.totalPnL + tradeData.pnl,
        balance: user.balance + tradeData.pnl
      });
      
      return trade;
    } catch (error) {
      console.error('Error recording trade:', error);
      return trade;
    }
  }

  async getUserTrades(telegramId, limit = 10) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tradesTable,
        KeyConditionExpression: 'telegramId = :telegramId',
        ExpressionAttributeValues: {
          ':telegramId': telegramId.toString()
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit
      }).promise();
      
      return result.Items || [];
    } catch (error) {
      console.error('Error getting user trades:', error);
      return [];
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const result = await this.dynamodb.scan({
        TableName: this.usersTable,
        ProjectionExpression: 'telegramId, username, totalPnL, totalTrades, winningTrades, socialScore',
        Limit: limit
      }).promise();
      
      const users = result.Items || [];
      return users
        .sort((a, b) => b.totalPnL - a.totalPnL)
        .slice(0, limit)
        .map((user, index) => ({
          rank: index + 1,
          ...user,
          winRate: user.totalTrades > 0 ? (user.winningTrades / user.totalTrades * 100).toFixed(1) : '0.0'
        }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return this.getMockLeaderboard();
    }
  }

  getMockLeaderboard() {
    return [
      { rank: 1, username: 'CryptoKing', totalPnL: 15420.50, winRate: '78.5' },
      { rank: 2, username: 'DeFiMaster', totalPnL: 12350.25, winRate: '72.1' },
      { rank: 3, username: 'ArbitrageBot', totalPnL: 9875.75, winRate: '85.2' }
    ];
  }

  async ensureTablesExist() {
    // This would create DynamoDB tables if they don't exist
    // For now, we'll use in-memory fallback
    console.log('Using in-memory storage as DynamoDB fallback');
  }

  formatUserStats(user) {
    const winRate = user.totalTrades > 0 ? (user.winningTrades / user.totalTrades * 100).toFixed(1) : '0.0';
    return {
      ...user,
      balanceFormatted: `$${user.balance.toLocaleString()}`,
      totalPnLFormatted: `${user.totalPnL >= 0 ? '+' : ''}$${user.totalPnL.toLocaleString()}`,
      winRateFormatted: `${winRate}%`
    };
  }
}

module.exports = new UserService();
