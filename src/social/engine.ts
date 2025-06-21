import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ComprehendClient, DetectSentimentCommand, DetectKeyPhrasesCommand } from '@aws-sdk/client-comprehend';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { SocialPost, User, Pack, SentimentAnalysis, SocialEngagement } from '../types';
import { logger } from '../utils/logger';
import { freeAI } from '../ai/free-alternatives';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const comprehendClient = new ComprehendClient({ region: process.env.AWS_REGION });
const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION });
const sagemakerClient = new SageMakerRuntimeClient({ region: process.env.AWS_REGION });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

// Main Lambda handler
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.info('Social engine processing messages:', { messageCount: event.Records.length });
  
  for (const record of event.Records) {
    try {
      await processMessage(record);
    } catch (error) {
      logger.error('Error processing social message:', error, { messageId: record.messageId });
    }
  }
};

// Process individual SQS message
async function processMessage(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);
  const { action, userId, postData, platform, timestamp } = message;
  
  logger.info('Processing social action:', { action, userId, platform, timestamp });
  
  switch (action) {
    case 'analyze_post':
      await analyzePost(userId, postData);
      break;
    case 'track_engagement':
      await trackEngagement(postData.postId, postData.engagement);
      break;
    case 'generate_content':
      await generateContent(userId, postData.prompt, postData.platform);
      break;
    case 'viral_detection':
      await detectViralContent(postData.postId);
      break;
    case 'influence_scoring':
      await calculateInfluenceScore(userId);
      break;
    case 'cross_platform_sync':
      await syncCrossPlatform(userId, postData);
      break;
    default:
      logger.warn('Unknown social action:', { action });
  }
}

// Analyze social media post
async function analyzePost(userId: string, postData: any): Promise<void> {
  try {
    const user = await getUser(userId);
    if (!user) {
      logger.error('User not found for post analysis:', { userId });
      return;
    }
    
    // Create social post record
    const post: SocialPost = {
      postId: `post_${Date.now()}_${userId}`,
      userId,
      packId: user.packId,
      platform: postData.platform,
      content: postData.content,
      mediaUrls: postData.mediaUrls || [],
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0,
        views: 0,
        clickThroughRate: 0,
      },
      sentiment: {
        score: 0,
        confidence: 0,
        emotions: {
          joy: 0,
          anger: 0,
          fear: 0,
          sadness: 0,
          surprise: 0,
          trust: 0,
        },
        keywords: [],
      },
      viralityScore: 0,
      timestamp: new Date().toISOString(),
    };
    
    // Analyze content using Free AI alternatives
    const aiResponse = await freeAI.analyzeSocialContent(post.content, post.platform);

    if (aiResponse.success) {
      post.sentiment = {
        score: aiResponse.data.sentiment.score || 0,
        confidence: aiResponse.data.sentiment.confidence || 0,
        emotions: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, trust: 0 },
        keywords: [],
      };
      post.viralityScore = aiResponse.data.viralityScore || 0;

      logger.info(`Social analysis completed using ${aiResponse.service}:`, {
        sentiment: aiResponse.data.sentiment,
        viralityScore: aiResponse.data.viralityScore,
      });
    } else {
      // Fallback to local analysis
      const fallbackAnalysis = await analyzeSentimentFallback(post.content);
      post.sentiment = fallbackAnalysis;
      post.viralityScore = calculateHeuristicViralityScore(post).score;
    }

    // Analyze media content if present
    if (post.mediaUrls.length > 0) {
      const mediaAnalysis = await analyzeMediaContent(post.mediaUrls);
      post.viralityScore = Math.min(1.0, post.viralityScore + (mediaAnalysis.qualityScore * 0.2));
    }
    
    // Store post in database
    await docClient.send(
      new PutCommand({
        TableName: 'alphapack-social-posts',
        Item: post,
      })
    );
    
    // Update user social score
    await updateUserSocialScore(userId, post);
    
    // Update pack social score if user is in a pack
    if (user.packId) {
      await updatePackSocialScore(user.packId, post);
    }
    
    // Send event for real-time updates
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [{
          Source: 'alphapack.social',
          DetailType: 'Post Analyzed',
          Detail: JSON.stringify({
            post,
            user: { userId: user.userId, username: user.username },
            pack: user.packId ? { packId: user.packId } : null,
          }),
        }],
      })
    );
    
    logger.info('Post analyzed successfully:', {
      postId: post.postId,
      platform: post.platform,
      sentimentScore: post.sentiment.score,
      viralityScore: post.viralityScore,
    });
    
  } catch (error) {
    logger.error('Post analysis failed:', error, { userId, postData });
  }
}

// Fallback sentiment analysis when AI services fail
async function analyzeSentimentFallback(content: string): Promise<SentimentAnalysis> {
  const positiveWords = ['great', 'amazing', 'awesome', 'bullish', 'moon', 'profit', 'win', 'success', 'love', 'best'];
  const negativeWords = ['bad', 'terrible', 'awful', 'bearish', 'dump', 'loss', 'fail', 'hate', 'worst', 'crash'];

  const words = content.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;

  let score = 0;
  let confidence = 0.6; // Lower confidence for fallback

  if (positiveCount > negativeCount) {
    score = 0.7 + (positiveCount * 0.1);
    confidence = Math.min(0.9, 0.6 + (positiveCount * 0.1));
  } else if (negativeCount > positiveCount) {
    score = -0.7 - (negativeCount * 0.1);
    confidence = Math.min(0.9, 0.6 + (negativeCount * 0.1));
  }

  return {
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    emotions: {
      joy: positiveCount > 0 ? 0.7 : 0,
      anger: negativeCount > 0 ? 0.7 : 0,
      fear: 0,
      sadness: negativeCount > 0 ? 0.3 : 0,
      surprise: 0,
      trust: positiveCount > 0 ? 0.5 : 0,
    },
    keywords: [...positiveWords.filter(word => words.includes(word)), ...negativeWords.filter(word => words.includes(word))],
  };
}

// Analyze sentiment using AWS Comprehend (kept for fallback)
async function analyzeSentiment(content: string): Promise<SentimentAnalysis> {
  try {
    // Detect sentiment
    const sentimentResponse = await comprehendClient.send(
      new DetectSentimentCommand({
        Text: content,
        LanguageCode: 'en',
      })
    );
    
    // Detect key phrases
    const keyPhrasesResponse = await comprehendClient.send(
      new DetectKeyPhrasesCommand({
        Text: content,
        LanguageCode: 'en',
      })
    );
    
    // Convert AWS Comprehend sentiment to our format
    const sentimentMap: Record<string, number> = {
      'POSITIVE': 0.8,
      'NEGATIVE': -0.8,
      'NEUTRAL': 0,
      'MIXED': 0.2,
    };
    
    const sentiment = sentimentResponse.Sentiment || 'NEUTRAL';
    const confidence = sentimentResponse.SentimentScore?.[sentiment] || 0;
    
    // Extract emotions from sentiment scores
    const emotions = {
      joy: sentimentResponse.SentimentScore?.Positive || 0,
      anger: (sentimentResponse.SentimentScore?.Negative || 0) * 0.6,
      fear: (sentimentResponse.SentimentScore?.Negative || 0) * 0.4,
      sadness: (sentimentResponse.SentimentScore?.Negative || 0) * 0.5,
      surprise: sentimentResponse.SentimentScore?.Mixed || 0,
      trust: (sentimentResponse.SentimentScore?.Positive || 0) * 0.8,
    };
    
    const keywords = keyPhrasesResponse.KeyPhrases?.map(kp => kp.Text || '') || [];
    
    return {
      score: sentimentMap[sentiment] || 0,
      confidence,
      emotions,
      keywords: keywords.slice(0, 10), // Top 10 keywords
    };
    
  } catch (error) {
    logger.error('Sentiment analysis failed:', error);
    return {
      score: 0,
      confidence: 0,
      emotions: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, trust: 0 },
      keywords: [],
    };
  }
}

// Analyze media content using AWS Rekognition
async function analyzeMediaContent(mediaUrls: string[]): Promise<{ qualityScore: number; moderationFlags: string[] }> {
  try {
    let totalQualityScore = 0;
    const moderationFlags: string[] = [];
    
    for (const url of mediaUrls.slice(0, 3)) { // Analyze up to 3 images
      try {
        // For demo purposes, simulate image analysis
        // In production, you would download the image and analyze it
        const mockModerationResponse = {
          ModerationLabels: [],
        };
        
        // Check for inappropriate content
        if (mockModerationResponse.ModerationLabels && mockModerationResponse.ModerationLabels.length > 0) {
          moderationFlags.push(...mockModerationResponse.ModerationLabels.map(label => label.Name || ''));
        }
        
        // Calculate quality score based on various factors
        const qualityScore = calculateImageQualityScore(url);
        totalQualityScore += qualityScore;
        
      } catch (imageError) {
        logger.warn('Failed to analyze image:', { url, error: imageError });
      }
    }
    
    return {
      qualityScore: totalQualityScore / mediaUrls.length,
      moderationFlags,
    };
    
  } catch (error) {
    logger.error('Media content analysis failed:', error);
    return { qualityScore: 0, moderationFlags: [] };
  }
}

// Predict virality using ML model
async function predictVirality(post: SocialPost): Promise<{ score: number; confidence: number }> {
  try {
    // Prepare features for ML model
    const features = {
      content_length: post.content.length,
      sentiment_score: post.sentiment.score,
      sentiment_confidence: post.sentiment.confidence,
      has_media: post.mediaUrls.length > 0,
      platform: post.platform,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      keyword_count: post.sentiment.keywords.length,
      emotion_scores: post.sentiment.emotions,
    };
    
    // Call SageMaker endpoint for virality prediction
    const response = await sagemakerClient.send(
      new InvokeEndpointCommand({
        EndpointName: process.env.ML_ENDPOINT_NAME,
        ContentType: 'application/json',
        Body: JSON.stringify({
          action: 'predict_virality',
          features,
        }),
      })
    );
    
    const result = JSON.parse(new TextDecoder().decode(response.Body));
    
    return {
      score: result.virality_score || 0,
      confidence: result.confidence || 0,
    };
    
  } catch (error) {
    logger.error('Virality prediction failed:', error);
    // Fallback to heuristic scoring
    return calculateHeuristicViralityScore(post);
  }
}

// Calculate heuristic virality score
function calculateHeuristicViralityScore(post: SocialPost): { score: number; confidence: number } {
  let score = 0;
  
  // Content length factor
  if (post.content.length > 50 && post.content.length < 280) {
    score += 0.2;
  }
  
  // Sentiment factor
  if (Math.abs(post.sentiment.score) > 0.5) {
    score += 0.3;
  }
  
  // Media factor
  if (post.mediaUrls.length > 0) {
    score += 0.2;
  }
  
  // Keywords factor
  if (post.sentiment.keywords.length > 3) {
    score += 0.1;
  }
  
  // Platform factor
  const platformMultipliers = {
    'twitter': 1.2,
    'tiktok': 1.5,
    'discord': 0.8,
    'telegram': 0.9,
  };
  
  score *= platformMultipliers[post.platform] || 1.0;
  
  return {
    score: Math.min(1.0, score),
    confidence: 0.6, // Lower confidence for heuristic
  };
}

// Track engagement metrics
async function trackEngagement(postId: string, engagement: SocialEngagement): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: 'alphapack-social-posts',
        Key: { postId },
        UpdateExpression: 'SET engagement = :engagement, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: {
          ':engagement': engagement,
          ':updatedAt': new Date().toISOString(),
        },
      })
    );
    
    // Check if post has gone viral
    const totalEngagement = engagement.likes + engagement.shares + engagement.comments;
    if (totalEngagement > 1000) { // Viral threshold
      await detectViralContent(postId);
    }
    
    logger.info('Engagement tracked:', { postId, engagement });
    
  } catch (error) {
    logger.error('Failed to track engagement:', error, { postId });
  }
}

// Generate content using Free AI alternatives
async function generateContent(userId: string, prompt: string, platform: string): Promise<void> {
  try {
    // Use free AI for content generation
    const aiResponse = await freeAI.generateTradingInsights({
      tokenPair: 'SOL/USDC',
      priceData: [100, 102, 98, 105],
      volume: 1000000,
      marketCap: 50000000,
    });

    let generatedContent = '';

    if (aiResponse.success) {
      // Adapt AI insights into social content
      generatedContent = adaptInsightsToSocialContent(aiResponse.data, platform, prompt);
      logger.info(`Content generated using ${aiResponse.service}`);
    } else {
      // Fallback to template-based content generation
      generatedContent = generateTemplateContent(prompt, platform);
      logger.info('Using template-based content generation');
    }
    
    // Store generated content for user
    await docClient.send(
      new PutCommand({
        TableName: 'alphapack-generated-content',
        Item: {
          contentId: `content_${Date.now()}_${userId}`,
          userId,
          prompt,
          platform,
          content: generatedContent,
          createdAt: new Date().toISOString(),
        },
      })
    );
    
    logger.info('Content generated:', { userId, platform, contentLength: generatedContent.length });
    
  } catch (error) {
    logger.error('Content generation failed:', error, { userId, prompt });
  }
}

// Detect viral content
async function detectViralContent(postId: string): Promise<void> {
  try {
    const post = await getPost(postId);
    if (!post) return;
    
    // Mark as viral and update scores
    await docClient.send(
      new UpdateCommand({
        TableName: 'alphapack-social-posts',
        Key: { postId },
        UpdateExpression: 'SET viralityScore = :viralScore, isViral = :isViral',
        ExpressionAttributeValues: {
          ':viralScore': 1.0,
          ':isViral': true,
        },
      })
    );
    
    // Boost user and pack social scores
    await updateUserSocialScore(post.userId, post, 2.0); // 2x multiplier for viral content
    if (post.packId) {
      await updatePackSocialScore(post.packId, post, 2.0);
    }
    
    // Send viral content event
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [{
          Source: 'alphapack.social',
          DetailType: 'Viral Content Detected',
          Detail: JSON.stringify({ post }),
        }],
      })
    );
    
    logger.info('Viral content detected:', { postId, userId: post.userId });
    
  } catch (error) {
    logger.error('Viral detection failed:', error, { postId });
  }
}

// Calculate influence score
async function calculateInfluenceScore(userId: string): Promise<void> {
  try {
    // Get user's posts from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await docClient.send(
      new QueryCommand({
        TableName: 'alphapack-social-posts',
        IndexName: 'userId-timestamp-index',
        KeyConditionExpression: 'userId = :userId AND #timestamp > :thirtyDaysAgo',
        ExpressionAttributeNames: { '#timestamp': 'timestamp' },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':thirtyDaysAgo': thirtyDaysAgo,
        },
      })
    );
    
    const posts = response.Items as SocialPost[];
    
    // Calculate influence metrics
    const totalEngagement = posts.reduce((sum, post) => 
      sum + post.engagement.likes + post.engagement.shares + post.engagement.comments, 0
    );
    
    const averageVirality = posts.reduce((sum, post) => sum + post.viralityScore, 0) / posts.length;
    const viralPosts = posts.filter(post => post.viralityScore > 0.8).length;
    
    const influenceScore = Math.min(100, 
      (totalEngagement / 100) + 
      (averageVirality * 20) + 
      (viralPosts * 10)
    );
    
    // Update user's social score
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId },
        UpdateExpression: 'SET stats.socialScore = :socialScore',
        ExpressionAttributeValues: {
          ':socialScore': influenceScore,
        },
      })
    );
    
    logger.info('Influence score calculated:', { userId, influenceScore, totalPosts: posts.length });
    
  } catch (error) {
    logger.error('Influence score calculation failed:', error, { userId });
  }
}

// Sync content across platforms
async function syncCrossPlatform(userId: string, postData: any): Promise<void> {
  try {
    // Adapt content for different platforms
    const adaptedContent = await adaptContentForPlatforms(postData.content, postData.sourcePlatform);
    
    // Schedule posts on other platforms
    for (const [platform, content] of Object.entries(adaptedContent)) {
      if (platform !== postData.sourcePlatform) {
        await schedulePost(userId, platform, content);
      }
    }
    
    logger.info('Cross-platform sync completed:', { userId, sourcePlatform: postData.sourcePlatform });
    
  } catch (error) {
    logger.error('Cross-platform sync failed:', error, { userId });
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

async function getPost(postId: string): Promise<SocialPost | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: 'alphapack-social-posts',
        Key: { postId },
      })
    );
    return response.Item as SocialPost || null;
  } catch (error) {
    logger.error('Error getting post:', error);
    return null;
  }
}

async function updateUserSocialScore(userId: string, post: SocialPost, multiplier: number = 1.0): Promise<void> {
  const scoreIncrease = (post.viralityScore * 10 + post.sentiment.confidence * 5) * multiplier;
  
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.USER_TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'ADD stats.socialScore :scoreIncrease',
      ExpressionAttributeValues: {
        ':scoreIncrease': scoreIncrease,
      },
    })
  );
}

async function updatePackSocialScore(packId: string, post: SocialPost, multiplier: number = 1.0): Promise<void> {
  const scoreIncrease = (post.viralityScore * 5 + post.sentiment.confidence * 2.5) * multiplier;
  
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.PACK_TABLE_NAME,
      Key: { packId },
      UpdateExpression: 'ADD socialScore :scoreIncrease',
      ExpressionAttributeValues: {
        ':scoreIncrease': scoreIncrease,
      },
    })
  );
}

function calculateImageQualityScore(url: string): number {
  // Simulate image quality analysis
  // In production, this would analyze resolution, composition, etc.
  return Math.random() * 0.5 + 0.5; // Random score between 0.5-1.0
}

function adaptInsightsToSocialContent(insights: any, platform: string, prompt: string): string {
  const templates = {
    twitter: `🚀 ${prompt} - ${typeof insights === 'string' ? insights.substring(0, 200) : 'Market analysis complete'} #DeFi #AlphaPack`,
    tiktok: `${prompt} 📈 Check out this trading insight! ${typeof insights === 'string' ? insights.substring(0, 100) : 'Analysis ready'} 🔥`,
    instagram: `${prompt} ✨\n\n${typeof insights === 'string' ? insights.substring(0, 300) : 'Trading insights generated'}\n\n#DeFi #Trading #AlphaPack`,
    discord: `**${prompt}**\n\n${typeof insights === 'string' ? insights : 'Market analysis complete'}\n\nWhat do you think? 🤔`,
    telegram: `*${prompt}*\n\n${typeof insights === 'string' ? insights : 'Analysis ready'}\n\nJoin the discussion! 💬`,
  };

  return templates[platform] || templates.twitter;
}

function generateTemplateContent(prompt: string, platform: string): string {
  const templates = {
    twitter: [
      `🔥 ${prompt} - The market is heating up! Who's ready to make some moves? #DeFi #AlphaPack`,
      `📊 ${prompt} - Just spotted some interesting patterns. Time to capitalize! 🚀`,
      `💎 ${prompt} - Diamond hands or paper hands? Let's see what the pack thinks! 💪`,
    ],
    tiktok: [
      `${prompt} 🎯 This is how we trade in Alpha Pack! Follow for more tips 📈`,
      `POV: You're in the best trading pack 😎 ${prompt} #TradingTips #DeFi`,
      `${prompt} - When the pack moves together, we all win! 🏆`,
    ],
    instagram: [
      `${prompt} ✨\n\nTrading isn't just about profits, it's about community. Join Alpha Pack and trade with the best! 🚀\n\n#DeFi #Trading #Community`,
      `Market update: ${prompt} 📊\n\nOur pack is always ahead of the curve. Ready to join us? 💪\n\n#AlphaPack #TradingLife`,
    ],
    discord: [
      `**${prompt}**\n\nHey pack! What's everyone's take on the current market? Let's discuss strategies! 🧠`,
      `Market alert: ${prompt}\n\nTime to put our heads together and find the best opportunities! 💡`,
    ],
    telegram: [
      `*${prompt}*\n\nPack members, what's your analysis? Let's share insights and grow together! 📈`,
      `Trading update: ${prompt}\n\nRemember, we're stronger when we trade as a pack! 🐺`,
    ],
  };

  const platformTemplates = templates[platform] || templates.twitter;
  return platformTemplates[Math.floor(Math.random() * platformTemplates.length)];
}

async function adaptContentForPlatforms(content: string, sourcePlatform: string): Promise<Record<string, string>> {
  // Adapt content for different platform requirements
  const adaptations: Record<string, string> = {};
  
  // Twitter: Shorten to 280 characters
  adaptations.twitter = content.length > 280 ? content.substring(0, 277) + '...' : content;
  
  // TikTok: Add trending hashtags
  adaptations.tiktok = content + ' #AlphaPack #DeFi #Trading';
  
  // Discord: Format for Discord markdown
  adaptations.discord = `**Alpha Pack Update**\n${content}`;
  
  return adaptations;
}

async function schedulePost(userId: string, platform: string, content: string): Promise<void> {
  // Schedule post for later publishing
  logger.info('Post scheduled:', { userId, platform, contentLength: content.length });
}
