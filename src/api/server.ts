import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { User, Pack, Competition, Trade, APIResponse, PaginatedResponse } from '../types';
import { logger } from '../utils/logger';
import { validateUser, validatePack, validateTrade } from '../utils/validation';
import { corsHeaders, createResponse, parseJWT } from '../utils/api';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

// JWT verifier for Cognito
const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.USER_POOL_CLIENT_ID!,
});

// Main Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('API request:', { 
      path: event.path, 
      method: event.httpMethod,
      headers: event.headers 
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    // Route the request
    const result = await routeRequest(event);
    return result;

  } catch (error) {
    logger.error('API handler error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

// Request router
async function routeRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;
  const pathParts = path.split('/').filter(Boolean);

  // Remove 'api/v1' prefix
  const route = pathParts.slice(2).join('/');

  switch (httpMethod) {
    case 'GET':
      return handleGetRequest(route, event);
    case 'POST':
      return handlePostRequest(route, event);
    case 'PUT':
      return handlePutRequest(route, event);
    case 'DELETE':
      return handleDeleteRequest(route, event);
    default:
      return createResponse(405, { error: 'Method not allowed' });
  }
}

// GET request handlers
async function handleGetRequest(route: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const pathParts = route.split('/');
  
  switch (pathParts[0]) {
    case 'users':
      if (pathParts[1]) {
        return getUserById(pathParts[1], event);
      }
      return getUsers(event);
      
    case 'packs':
      if (pathParts[1]) {
        if (pathParts[2] === 'leaderboard') {
          return getPackLeaderboard(pathParts[1]);
        }
        return getPackById(pathParts[1]);
      }
      return getPacks(event);
      
    case 'competitions':
      if (pathParts[1]) {
        if (pathParts[2] === 'leaderboard') {
          return getCompetitionLeaderboard(pathParts[1]);
        }
        return getCompetitionById(pathParts[1]);
      }
      return getCompetitions(event);
      
    case 'trading':
      if (pathParts[1] === 'history') {
        return getTradingHistory(event);
      } else if (pathParts[1] === 'opportunities') {
        return getArbitrageOpportunities(event);
      }
      break;
      
    default:
      return createResponse(404, { error: 'Route not found' });
  }
  
  return createResponse(404, { error: 'Route not found' });
}

// POST request handlers
async function handlePostRequest(route: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const pathParts = route.split('/');
  
  switch (pathParts[0]) {
    case 'users':
      return createUser(event);
      
    case 'packs':
      if (pathParts[1] && pathParts[2] === 'join') {
        return joinPack(pathParts[1], event);
      } else if (pathParts[1] && pathParts[2] === 'leave') {
        return leavePack(pathParts[1], event);
      }
      return createPack(event);
      
    case 'competitions':
      return createCompetition(event);
      
    case 'trading':
      if (pathParts[1] === 'execute') {
        return executeTrade(event);
      }
      break;
      
    case 'telegram':
      if (pathParts[1] === 'webhook') {
        // This is handled by the Telegram bot function
        return createResponse(200, { message: 'Webhook received' });
      }
      break;
      
    default:
      return createResponse(404, { error: 'Route not found' });
  }
  
  return createResponse(404, { error: 'Route not found' });
}

// PUT request handlers
async function handlePutRequest(route: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const pathParts = route.split('/');
  
  switch (pathParts[0]) {
    case 'users':
      if (pathParts[1]) {
        return updateUser(pathParts[1], event);
      }
      break;
      
    case 'packs':
      if (pathParts[1]) {
        return updatePack(pathParts[1], event);
      }
      break;
      
    default:
      return createResponse(404, { error: 'Route not found' });
  }
  
  return createResponse(404, { error: 'Route not found' });
}

// DELETE request handlers
async function handleDeleteRequest(route: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return createResponse(405, { error: 'Delete operations not supported' });
}

// User operations
async function getUsers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { page = '1', limit = '20' } = event.queryStringParameters || {};
    
    const response = await docClient.send(
      new ScanCommand({
        TableName: process.env.USER_TABLE_NAME,
        Limit: parseInt(limit),
      })
    );

    const users = response.Items as User[];
    
    return createResponse(200, {
      items: users,
      total: response.Count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      hasNext: !!response.LastEvaluatedKey,
      hasPrev: parseInt(page) > 1,
    } as PaginatedResponse<User>);
  } catch (error) {
    logger.error('Get users error:', error);
    return createResponse(500, { error: 'Failed to fetch users' });
  }
}

async function getUserById(userId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Verify JWT token
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const response = await docClient.send(
      new GetCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId },
      })
    );

    if (!response.Item) {
      return createResponse(404, { error: 'User not found' });
    }

    return createResponse(200, response.Item as User);
  } catch (error) {
    logger.error('Get user error:', error);
    return createResponse(500, { error: 'Failed to fetch user' });
  }
}

async function createUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userData = JSON.parse(event.body || '{}');
    
    // Validate user data
    const validation = validateUser(userData);
    if (!validation.isValid) {
      return createResponse(400, { error: validation.errors.join(', ') });
    }

    const user: User = {
      ...userData,
      userId: userData.userId || `user_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.USER_TABLE_NAME,
        Item: user,
        ConditionExpression: 'attribute_not_exists(userId)',
      })
    );

    return createResponse(201, user);
  } catch (error) {
    logger.error('Create user error:', error);
    return createResponse(500, { error: 'Failed to create user' });
  }
}

async function updateUser(userId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const updateData = JSON.parse(event.body || '{}');
    
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId },
        UpdateExpression: 'SET #updatedAt = :updatedAt, #username = :username, #preferences = :preferences',
        ExpressionAttributeNames: {
          '#updatedAt': 'updatedAt',
          '#username': 'username',
          '#preferences': 'preferences',
        },
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
          ':username': updateData.username,
          ':preferences': updateData.preferences,
        },
      })
    );

    return createResponse(200, { message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user error:', error);
    return createResponse(500, { error: 'Failed to update user' });
  }
}

// Pack operations
async function getPacks(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { status, limit = '20' } = event.queryStringParameters || {};
    
    let command;
    if (status) {
      command = new QueryCommand({
        TableName: process.env.PACK_TABLE_NAME,
        IndexName: 'status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        Limit: parseInt(limit),
      });
    } else {
      command = new ScanCommand({
        TableName: process.env.PACK_TABLE_NAME,
        Limit: parseInt(limit),
      });
    }

    const response = await docClient.send(command);
    const packs = response.Items as Pack[];
    
    return createResponse(200, {
      items: packs,
      total: response.Count || 0,
    });
  } catch (error) {
    logger.error('Get packs error:', error);
    return createResponse(500, { error: 'Failed to fetch packs' });
  }
}

async function getPackById(packId: string): Promise<APIGatewayProxyResult> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: process.env.PACK_TABLE_NAME,
        Key: { packId },
      })
    );

    if (!response.Item) {
      return createResponse(404, { error: 'Pack not found' });
    }

    return createResponse(200, response.Item as Pack);
  } catch (error) {
    logger.error('Get pack error:', error);
    return createResponse(500, { error: 'Failed to fetch pack' });
  }
}

async function createPack(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const packData = JSON.parse(event.body || '{}');
    
    const validation = validatePack(packData);
    if (!validation.isValid) {
      return createResponse(400, { error: validation.errors.join(', ') });
    }

    const pack: Pack = {
      ...packData,
      packId: `pack_${Date.now()}`,
      members: [token.sub], // Creator is first member
      leaderId: token.sub,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.PACK_TABLE_NAME,
        Item: pack,
      })
    );

    return createResponse(201, pack);
  } catch (error) {
    logger.error('Create pack error:', error);
    return createResponse(500, { error: 'Failed to create pack' });
  }
}

async function joinPack(packId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // Add user to pack members
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.PACK_TABLE_NAME,
        Key: { packId },
        UpdateExpression: 'ADD members :userId SET #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: {
          ':userId': new Set([token.sub]),
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    // Update user's packId
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId: token.sub },
        UpdateExpression: 'SET packId = :packId, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: {
          ':packId': packId,
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    return createResponse(200, { message: 'Successfully joined pack' });
  } catch (error) {
    logger.error('Join pack error:', error);
    return createResponse(500, { error: 'Failed to join pack' });
  }
}

async function leavePack(packId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // Remove user from pack members
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.PACK_TABLE_NAME,
        Key: { packId },
        UpdateExpression: 'DELETE members :userId SET #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: {
          ':userId': new Set([token.sub]),
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    // Remove packId from user
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId: token.sub },
        UpdateExpression: 'REMOVE packId SET #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    return createResponse(200, { message: 'Successfully left pack' });
  } catch (error) {
    logger.error('Leave pack error:', error);
    return createResponse(500, { error: 'Failed to leave pack' });
  }
}

// Competition operations
async function getCompetitions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { status = 'active' } = event.queryStringParameters || {};
    
    const response = await docClient.send(
      new QueryCommand({
        TableName: process.env.COMPETITION_TABLE_NAME,
        IndexName: 'status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
      })
    );

    return createResponse(200, response.Items as Competition[]);
  } catch (error) {
    logger.error('Get competitions error:', error);
    return createResponse(500, { error: 'Failed to fetch competitions' });
  }
}

async function getCompetitionById(competitionId: string): Promise<APIGatewayProxyResult> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: process.env.COMPETITION_TABLE_NAME,
        Key: { competitionId },
      })
    );

    if (!response.Item) {
      return createResponse(404, { error: 'Competition not found' });
    }

    return createResponse(200, response.Item as Competition);
  } catch (error) {
    logger.error('Get competition error:', error);
    return createResponse(500, { error: 'Failed to fetch competition' });
  }
}

async function getCompetitionLeaderboard(competitionId: string): Promise<APIGatewayProxyResult> {
  try {
    const competition = await docClient.send(
      new GetCommand({
        TableName: process.env.COMPETITION_TABLE_NAME,
        Key: { competitionId },
      })
    );

    if (!competition.Item) {
      return createResponse(404, { error: 'Competition not found' });
    }

    const comp = competition.Item as Competition;
    return createResponse(200, comp.leaderboard);
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    return createResponse(500, { error: 'Failed to fetch leaderboard' });
  }
}

// Trading operations
async function executeTrade(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const tradeData = JSON.parse(event.body || '{}');
    
    const validation = validateTrade(tradeData);
    if (!validation.isValid) {
      return createResponse(400, { error: validation.errors.join(', ') });
    }

    // Send trade to processing queue
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.TRADING_QUEUE_URL,
        MessageBody: JSON.stringify({
          action: 'execute_trade',
          userId: token.sub,
          tradeData,
          timestamp: new Date().toISOString(),
        }),
      })
    );

    return createResponse(202, { 
      message: 'Trade submitted for execution',
      tradeId: `trade_${Date.now()}`,
    });
  } catch (error) {
    logger.error('Execute trade error:', error);
    return createResponse(500, { error: 'Failed to execute trade' });
  }
}

async function getTradingHistory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // This would query a trades table
    return createResponse(200, []);
  } catch (error) {
    logger.error('Get trading history error:', error);
    return createResponse(500, { error: 'Failed to fetch trading history' });
  }
}

async function getArbitrageOpportunities(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const token = await verifyToken(event);
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // Send request to ML service for opportunities
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.TRADING_QUEUE_URL,
        MessageBody: JSON.stringify({
          action: 'fetch_opportunities',
          userId: token.sub,
          timestamp: new Date().toISOString(),
        }),
      })
    );

    return createResponse(202, { message: 'Fetching opportunities...' });
  } catch (error) {
    logger.error('Get opportunities error:', error);
    return createResponse(500, { error: 'Failed to fetch opportunities' });
  }
}

// Helper functions
async function verifyToken(event: APIGatewayProxyEvent): Promise<any> {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    const payload = await jwtVerifier.verify(token);
    return payload;
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
}

async function getPackLeaderboard(packId: string): Promise<APIGatewayProxyResult> {
  // Implementation for pack-specific leaderboard
  return createResponse(200, []);
}

async function updatePack(packId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Implementation for updating pack
  return createResponse(200, { message: 'Pack updated' });
}

async function createCompetition(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Implementation for creating competition
  return createResponse(201, { message: 'Competition created' });
}
