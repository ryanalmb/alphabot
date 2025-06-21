import request from 'supertest';
import { app } from '../../src/api/server';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

// Mock AWS SDK
const dynamoMock = mockClient(DynamoDBDocumentClient);

describe('Alpha Pack API Integration Tests', () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String),
          version: expect.any(String),
          uptime: expect.any(Number),
        },
      });
    });
  });

  describe('User Management', () => {
    const mockUser = {
      userId: 'test-user-123',
      username: 'testuser',
      walletAddress: '11111111111111111111111111111112',
      packId: null,
      role: 'member',
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
          showTrades: true,
          allowPackInvites: true,
          publicProfile: true,
        },
      },
    };

    it('should create a new user', async () => {
      dynamoMock.on('PutCommand').resolves({});

      const response = await request(app)
        .post('/api/v1/users')
        .send({
          username: 'testuser',
          walletAddress: '11111111111111111111111111111112',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('testuser');
    });

    it('should get user by ID', async () => {
      dynamoMock.on('GetCommand').resolves({
        Item: mockUser,
      });

      const response = await request(app)
        .get('/api/v1/users/test-user-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('test-user-123');
    });

    it('should return 404 for non-existent user', async () => {
      dynamoMock.on('GetCommand').resolves({});

      await request(app)
        .get('/api/v1/users/non-existent')
        .expect(404);
    });

    it('should update user profile', async () => {
      dynamoMock.on('GetCommand').resolves({ Item: mockUser });
      dynamoMock.on('UpdateCommand').resolves({});

      const response = await request(app)
        .put('/api/v1/users/test-user-123')
        .send({
          preferences: {
            riskTolerance: 'high',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Pack Management', () => {
    const mockPack = {
      packId: 'test-pack-123',
      name: 'Test Pack',
      description: 'A test pack for integration testing',
      leaderId: 'test-user-123',
      members: ['test-user-123'],
      maxMembers: 5,
      status: 'recruiting',
      score: 0,
      totalVolume: 0,
      winRate: 0,
      socialScore: 0,
      treasury: {
        totalValue: 0,
        tokens: [],
        allocations: [],
        performance: {
          dailyReturn: 0,
          weeklyReturn: 0,
          monthlyReturn: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
        },
      },
      strategy: {
        focus: 'balanced',
        riskLevel: 'medium',
        targetReturn: 15,
        maxDrawdown: 20,
        rebalanceFrequency: 'weekly',
      },
    };

    it('should create a new pack', async () => {
      dynamoMock.on('PutCommand').resolves({});
      dynamoMock.on('UpdateCommand').resolves({});

      const response = await request(app)
        .post('/api/v1/packs')
        .send({
          name: 'Test Pack',
          description: 'A test pack for integration testing',
          maxMembers: 5,
          strategy: {
            focus: 'balanced',
            riskLevel: 'medium',
            targetReturn: 15,
            maxDrawdown: 20,
            rebalanceFrequency: 'weekly',
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Pack');
    });

    it('should get pack by ID', async () => {
      dynamoMock.on('GetCommand').resolves({
        Item: mockPack,
      });

      const response = await request(app)
        .get('/api/v1/packs/test-pack-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packId).toBe('test-pack-123');
    });

    it('should list packs with pagination', async () => {
      dynamoMock.on('ScanCommand').resolves({
        Items: [mockPack],
        Count: 1,
        ScannedCount: 1,
      });

      const response = await request(app)
        .get('/api/v1/packs?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packs).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should join a pack', async () => {
      dynamoMock.on('GetCommand').resolves({ Item: mockPack });
      dynamoMock.on('UpdateCommand').resolves({});

      const response = await request(app)
        .post('/api/v1/packs/test-pack-123/join')
        .send({ userId: 'test-user-456' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should leave a pack', async () => {
      const packWithMultipleMembers = {
        ...mockPack,
        members: ['test-user-123', 'test-user-456'],
      };

      dynamoMock.on('GetCommand').resolves({ Item: packWithMultipleMembers });
      dynamoMock.on('UpdateCommand').resolves({});

      const response = await request(app)
        .post('/api/v1/packs/test-pack-123/leave')
        .send({ userId: 'test-user-456' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Trading Operations', () => {
    const mockTrade = {
      tradeId: 'test-trade-123',
      userId: 'test-user-123',
      packId: 'test-pack-123',
      type: 'spot',
      fromToken: 'SOL',
      toToken: 'USDC',
      fromAmount: 1000000000, // 1 SOL in lamports
      toAmount: 100000000, // 100 USDC
      price: 100,
      slippage: 1,
      fee: 2500000, // 0.0025 SOL
      status: 'completed',
      signature: 'test-signature-123',
      timestamp: new Date().toISOString(),
      chain: 'solana',
    };

    it('should execute a trade', async () => {
      dynamoMock.on('PutCommand').resolves({});
      dynamoMock.on('UpdateCommand').resolves({});

      const response = await request(app)
        .post('/api/v1/trading/execute')
        .send({
          type: 'spot',
          fromToken: 'SOL',
          toToken: 'USDC',
          fromAmount: 1000000000,
          slippage: 1,
          chain: 'solana',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
    });

    it('should get trading history', async () => {
      dynamoMock.on('QueryCommand').resolves({
        Items: [mockTrade],
        Count: 1,
      });

      const response = await request(app)
        .get('/api/v1/trading/history?userId=test-user-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(1);
    });

    it('should get arbitrage opportunities', async () => {
      const response = await request(app)
        .get('/api/v1/trading/opportunities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.opportunities).toBeDefined();
    });
  });

  describe('Competition System', () => {
    const mockCompetition = {
      competitionId: 'test-competition-123',
      name: 'Test Competition',
      description: 'A test competition',
      type: 'trading_volume',
      status: 'upcoming',
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      participants: [],
      leaderboard: [],
      prizes: [
        {
          rank: 1,
          amount: 1000,
          token: 'USDC',
          description: 'First place prize',
        },
      ],
      rules: {
        minPackSize: 2,
        maxPackSize: 10,
        tradingPairs: ['SOL/USDC', 'ETH/USDC'],
        allowedChains: ['solana'],
        scoringMethod: 'total_volume',
      },
    };

    it('should create a competition', async () => {
      dynamoMock.on('PutCommand').resolves({});

      const response = await request(app)
        .post('/api/v1/competitions')
        .send({
          name: 'Test Competition',
          description: 'A test competition',
          type: 'trading_volume',
          startTime: new Date(Date.now() + 3600000).toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString(),
          prizes: [
            {
              rank: 1,
              amount: 1000,
              token: 'USDC',
              description: 'First place prize',
            },
          ],
          rules: {
            minPackSize: 2,
            maxPackSize: 10,
            tradingPairs: ['SOL/USDC', 'ETH/USDC'],
            allowedChains: ['solana'],
            scoringMethod: 'total_volume',
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Competition');
    });

    it('should get competition leaderboard', async () => {
      dynamoMock.on('GetCommand').resolves({
        Item: {
          ...mockCompetition,
          leaderboard: [
            {
              packId: 'test-pack-123',
              packName: 'Test Pack',
              score: 1000,
              rank: 1,
              change: 0,
              members: 3,
            },
          ],
        },
      });

      const response = await request(app)
        .get('/api/v1/competitions/test-competition-123/leaderboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leaderboard).toHaveLength(1);
    });
  });

  describe('Social Features', () => {
    it('should create a social post', async () => {
      dynamoMock.on('PutCommand').resolves({});

      const response = await request(app)
        .post('/api/v1/social/posts')
        .send({
          platform: 'twitter',
          content: 'Just made a great arbitrage trade! 🚀 #AlphaPack #DeFi',
          contentType: 'text',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBe('twitter');
    });

    it('should get social feed', async () => {
      dynamoMock.on('ScanCommand').resolves({
        Items: [
          {
            postId: 'test-post-123',
            userId: 'test-user-123',
            platform: 'twitter',
            content: 'Test post content',
            engagement: {
              likes: 10,
              shares: 5,
              comments: 2,
              views: 100,
              clickThroughRate: 0.05,
            },
            viralityScore: 75,
            timestamp: new Date().toISOString(),
          },
        ],
        Count: 1,
      });

      const response = await request(app)
        .get('/api/v1/social/feed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({
          username: '', // Invalid empty username
          walletAddress: 'invalid-address',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle internal server errors', async () => {
      dynamoMock.on('GetCommand').rejects(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/users/test-user-123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(11).fill(null).map(() =>
        request(app).get('/api/v1/health')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(res => res.status === 429);

      expect(rateLimitedResponse).toBeDefined();
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/packs')
        .send({
          name: 'Test Pack',
          description: 'Test description',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should validate JWT tokens', async () => {
      const response = await request(app)
        .post('/api/v1/packs')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Test Pack',
          description: 'Test description',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
