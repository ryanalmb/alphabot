import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as opensearch from 'aws-cdk-lib/aws-opensearch';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AlphaPackApplicationStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseCluster;
  cache: elasticache.CfnCacheCluster;
  documentDb: docdb.DatabaseCluster;
  searchDomain: opensearch.Domain;
  mlEndpoint: sagemaker.CfnEndpoint;
  securityGroup: ec2.SecurityGroup;
  executionRole: iam.Role;
}

export class AlphaPackApplicationStack extends cdk.Stack {
  public readonly apiGateway: apigateway.RestApi;
  public readonly telegramBotFunction: lambda.Function;
  public readonly userTable: dynamodb.Table;
  public readonly packTable: dynamodb.Table;
  public readonly competitionTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: AlphaPackApplicationStackProps) {
    super(scope, id, props);

    // DynamoDB tables for application data
    this.userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: 'alphapack-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      globalSecondaryIndexes: [{
        indexName: 'telegram-id-index',
        partitionKey: { name: 'telegramId', type: dynamodb.AttributeType.STRING },
      }, {
        indexName: 'wallet-address-index',
        partitionKey: { name: 'walletAddress', type: dynamodb.AttributeType.STRING },
      }],
    });

    this.packTable = new dynamodb.Table(this, 'PackTable', {
      tableName: 'alphapack-packs',
      partitionKey: { name: 'packId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      globalSecondaryIndexes: [{
        indexName: 'leader-id-index',
        partitionKey: { name: 'leaderId', type: dynamodb.AttributeType.STRING },
      }, {
        indexName: 'status-index',
        partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'score', type: dynamodb.AttributeType.NUMBER },
      }],
    });

    this.competitionTable = new dynamodb.Table(this, 'CompetitionTable', {
      tableName: 'alphapack-competitions',
      partitionKey: { name: 'competitionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startTime', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      globalSecondaryIndexes: [{
        indexName: 'status-index',
        partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'startTime', type: dynamodb.AttributeType.STRING },
      }],
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'AlphaPackUserPool', {
      userPoolName: 'alphapack-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'AlphaPackUserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });

    // SQS queues for async processing
    const tradingQueue = new sqs.Queue(this, 'TradingQueue', {
      queueName: 'alphapack-trading-queue',
      visibilityTimeout: cdk.Duration.minutes(5),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'TradingDLQ', {
          queueName: 'alphapack-trading-dlq',
        }),
        maxReceiveCount: 3,
      },
    });

    const socialQueue = new sqs.Queue(this, 'SocialQueue', {
      queueName: 'alphapack-social-queue',
      visibilityTimeout: cdk.Duration.minutes(3),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'SocialDLQ', {
          queueName: 'alphapack-social-dlq',
        }),
        maxReceiveCount: 3,
      },
    });

    // SNS topics for notifications
    const notificationsTopic = new sns.Topic(this, 'NotificationsTopic', {
      topicName: 'alphapack-notifications',
      displayName: 'Alpha Pack Notifications',
    });

    // Lambda function for Telegram bot
    this.telegramBotFunction = new lambda_nodejs.NodejsFunction(this, 'TelegramBotFunction', {
      functionName: 'alphapack-telegram-bot',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/telegram/bot.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PACK_TABLE_NAME: this.packTable.tableName,
        COMPETITION_TABLE_NAME: this.competitionTable.tableName,
        TRADING_QUEUE_URL: tradingQueue.queueUrl,
        SOCIAL_QUEUE_URL: socialQueue.queueUrl,
        ML_ENDPOINT_NAME: props.mlEndpoint.endpointName!,
        DATABASE_ENDPOINT: props.database.clusterEndpoint.hostname,
        CACHE_ENDPOINT: props.cache.attrRedisEndpointAddress,
        SEARCH_ENDPOINT: props.searchDomain.domainEndpoint,
      },
      role: props.executionRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
    });

    // Lambda function for API handlers
    const apiFunction = new lambda_nodejs.NodejsFunction(this, 'APIFunction', {
      functionName: 'alphapack-api',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/api/server.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PACK_TABLE_NAME: this.packTable.tableName,
        COMPETITION_TABLE_NAME: this.competitionTable.tableName,
        TRADING_QUEUE_URL: tradingQueue.queueUrl,
        SOCIAL_QUEUE_URL: socialQueue.queueUrl,
        ML_ENDPOINT_NAME: props.mlEndpoint.endpointName!,
        DATABASE_ENDPOINT: props.database.clusterEndpoint.hostname,
        CACHE_ENDPOINT: props.cache.attrRedisEndpointAddress,
        SEARCH_ENDPOINT: props.searchDomain.domainEndpoint,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      role: props.executionRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
    });

    // Lambda function for trading engine
    const tradingEngineFunction = new lambda_nodejs.NodejsFunction(this, 'TradingEngineFunction', {
      functionName: 'alphapack-trading-engine',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/trading/engine.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048,
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PACK_TABLE_NAME: this.packTable.tableName,
        COMPETITION_TABLE_NAME: this.competitionTable.tableName,
        ML_ENDPOINT_NAME: props.mlEndpoint.endpointName!,
        DATABASE_ENDPOINT: props.database.clusterEndpoint.hostname,
        CACHE_ENDPOINT: props.cache.attrRedisEndpointAddress,
      },
      role: props.executionRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
    });

    // Lambda function for social intelligence
    const socialEngineFunction = new lambda_nodejs.NodejsFunction(this, 'SocialEngineFunction', {
      functionName: 'alphapack-social-engine',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/social/engine.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PACK_TABLE_NAME: this.packTable.tableName,
        SOCIAL_QUEUE_URL: socialQueue.queueUrl,
        ML_ENDPOINT_NAME: props.mlEndpoint.endpointName!,
        SEARCH_ENDPOINT: props.searchDomain.domainEndpoint,
      },
      role: props.executionRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
    });

    // Grant permissions to Lambda functions
    this.userTable.grantReadWriteData(this.telegramBotFunction);
    this.packTable.grantReadWriteData(this.telegramBotFunction);
    this.competitionTable.grantReadWriteData(this.telegramBotFunction);

    this.userTable.grantReadWriteData(apiFunction);
    this.packTable.grantReadWriteData(apiFunction);
    this.competitionTable.grantReadWriteData(apiFunction);

    this.userTable.grantReadWriteData(tradingEngineFunction);
    this.packTable.grantReadWriteData(tradingEngineFunction);
    this.competitionTable.grantReadWriteData(tradingEngineFunction);

    this.userTable.grantReadWriteData(socialEngineFunction);
    this.packTable.grantReadWriteData(socialEngineFunction);

    tradingQueue.grantSendMessages(this.telegramBotFunction);
    tradingQueue.grantSendMessages(apiFunction);
    tradingQueue.grantConsumeMessages(tradingEngineFunction);

    socialQueue.grantSendMessages(this.telegramBotFunction);
    socialQueue.grantSendMessages(apiFunction);
    socialQueue.grantConsumeMessages(socialEngineFunction);

    // API Gateway
    this.apiGateway = new apigateway.RestApi(this, 'AlphaPackAPI', {
      restApiName: 'alphapack-api',
      description: 'Alpha Pack social trading API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
      deployOptions: {
        stageName: 'v1',
        throttle: {
          rateLimit: 1000,
          burstLimit: 2000,
        },
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // API Gateway authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'APIAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'alphapack-authorizer',
    });

    // API Gateway integration
    const apiIntegration = new apigateway.LambdaIntegration(apiFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API routes
    const api = this.apiGateway.root.addResource('api');
    const v1 = api.addResource('v1');

    // User routes
    const users = v1.addResource('users');
    users.addMethod('GET', apiIntegration, { authorizer });
    users.addMethod('POST', apiIntegration);
    users.addResource('{userId}').addMethod('GET', apiIntegration, { authorizer });

    // Pack routes
    const packs = v1.addResource('packs');
    packs.addMethod('GET', apiIntegration);
    packs.addMethod('POST', apiIntegration, { authorizer });
    const packResource = packs.addResource('{packId}');
    packResource.addMethod('GET', apiIntegration);
    packResource.addMethod('PUT', apiIntegration, { authorizer });
    packResource.addResource('join').addMethod('POST', apiIntegration, { authorizer });
    packResource.addResource('leave').addMethod('POST', apiIntegration, { authorizer });

    // Competition routes
    const competitions = v1.addResource('competitions');
    competitions.addMethod('GET', apiIntegration);
    competitions.addMethod('POST', apiIntegration, { authorizer });
    const competitionResource = competitions.addResource('{competitionId}');
    competitionResource.addMethod('GET', apiIntegration);
    competitionResource.addResource('leaderboard').addMethod('GET', apiIntegration);

    // Trading routes
    const trading = v1.addResource('trading');
    trading.addResource('execute').addMethod('POST', apiIntegration, { authorizer });
    trading.addResource('history').addMethod('GET', apiIntegration, { authorizer });
    trading.addResource('opportunities').addMethod('GET', apiIntegration, { authorizer });

    // Telegram webhook
    const telegram = v1.addResource('telegram');
    telegram.addResource('webhook').addMethod('POST', new apigateway.LambdaIntegration(this.telegramBotFunction));

    // EventBridge rules for processing
    const tradingRule = new events.Rule(this, 'TradingProcessingRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description: 'Process trading queue messages',
    });

    const socialRule = new events.Rule(this, 'SocialProcessingRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      description: 'Process social intelligence tasks',
    });

    tradingRule.addTarget(new targets.LambdaFunction(tradingEngineFunction));
    socialRule.addTarget(new targets.LambdaFunction(socialEngineFunction));

    // Outputs
    new cdk.CfnOutput(this, 'APIGatewayURL', {
      value: this.apiGateway.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'TelegramBotFunctionName', {
      value: this.telegramBotFunction.functionName,
      description: 'Telegram bot Lambda function name',
    });

    new cdk.CfnOutput(this, 'TradingQueueURL', {
      value: tradingQueue.queueUrl,
      description: 'Trading queue URL',
    });

    new cdk.CfnOutput(this, 'SocialQueueURL', {
      value: socialQueue.queueUrl,
      description: 'Social queue URL',
    });
  }
}
