import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';
import * as config from 'aws-cdk-lib/aws-config';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface AlphaPackSecurityStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class AlphaPackSecurityStack extends cdk.Stack {
  public readonly applicationExecutionRole: iam.Role;
  public readonly mlExecutionRole: iam.Role;
  public readonly solanaExecutionRole: iam.Role;
  public readonly encryptionKey: kms.Key;
  public readonly webAcl: waf.CfnWebACL;

  constructor(scope: Construct, id: string, props: AlphaPackSecurityStackProps) {
    super(scope, id, props);

    // KMS key for encryption
    this.encryptionKey = new kms.Key(this, 'AlphaPackEncryptionKey', {
      description: 'Alpha Pack encryption key for sensitive data',
      enableKeyRotation: true,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            sid: 'Enable IAM User Permissions',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
        ],
      }),
    });

    // Secrets for various services
    const telegramBotSecret = new secretsmanager.Secret(this, 'TelegramBotSecret', {
      secretName: 'alphapack/telegram/bot-token',
      description: 'Telegram bot token for Alpha Pack',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'alphapack-bot' }),
        generateStringKey: 'token',
        excludeCharacters: '"@/\\',
      },
      encryptionKey: this.encryptionKey,
    });

    const solanaPrivateKeySecret = new secretsmanager.Secret(this, 'SolanaPrivateKeySecret', {
      secretName: 'alphapack/solana/private-key',
      description: 'Solana private key for Alpha Pack operations',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ network: 'mainnet-beta' }),
        generateStringKey: 'privateKey',
        excludeCharacters: '"@/\\',
      },
      encryptionKey: this.encryptionKey,
    });

    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: 'alphapack/auth/jwt-secret',
      description: 'JWT secret for Alpha Pack authentication',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ issuer: 'alphapack' }),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\',
        passwordLength: 64,
      },
      encryptionKey: this.encryptionKey,
    });

    const apiKeysSecret = new secretsmanager.Secret(this, 'APIKeysSecret', {
      secretName: 'alphapack/api/keys',
      description: 'External API keys for Alpha Pack integrations',
      secretObjectValue: {
        openai: cdk.SecretValue.unsafePlainText('placeholder-openai-key'),
        ethereum: cdk.SecretValue.unsafePlainText('placeholder-ethereum-key'),
        base: cdk.SecretValue.unsafePlainText('placeholder-base-key'),
        arbitrum: cdk.SecretValue.unsafePlainText('placeholder-arbitrum-key'),
      },
      encryptionKey: this.encryptionKey,
    });

    // IAM role for application services
    this.applicationExecutionRole = new iam.Role(this, 'ApplicationExecutionRole', {
      roleName: 'AlphaPackApplicationRole',
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        new iam.ServicePrincipal('apigateway.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'),
      ],
      inlinePolicies: {
        AlphaPackApplicationPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds:DescribeDBClusters',
                'rds:DescribeDBInstances',
                'rds-db:connect',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'elasticache:DescribeCacheClusters',
                'elasticache:DescribeReplicationGroups',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'es:ESHttpGet',
                'es:ESHttpPost',
                'es:ESHttpPut',
                'es:ESHttpDelete',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
              ],
              resources: [
                telegramBotSecret.secretArn,
                solanaPrivateKeySecret.secretArn,
                jwtSecret.secretArn,
                apiKeysSecret.secretArn,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'kms:Decrypt',
                'kms:DescribeKey',
              ],
              resources: [this.encryptionKey.keyArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
              ],
              resources: ['arn:aws:s3:::alphapack-*/*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sns:Publish',
                'sqs:SendMessage',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // IAM role for ML services
    this.mlExecutionRole = new iam.Role(this, 'MLExecutionRole', {
      roleName: 'AlphaPackMLRole',
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('sagemaker.amazonaws.com'),
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('bedrock.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('ComprehendFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRekognitionFullAccess'),
      ],
      inlinePolicies: {
        AlphaPackMLPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
              ],
              resources: ['arn:aws:s3:::alphapack-*', 'arn:aws:s3:::alphapack-*/*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // IAM role for Solana operations
    this.solanaExecutionRole = new iam.Role(this, 'SolanaExecutionRole', {
      roleName: 'AlphaPackSolanaRole',
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ec2.amazonaws.com'),
        new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        new iam.ServicePrincipal('lambda.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
      inlinePolicies: {
        AlphaPackSolanaPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
              ],
              resources: [solanaPrivateKeySecret.secretArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
              ],
              resources: ['arn:aws:s3:::alphapack-*/solana/*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // WAF Web ACL for DDoS protection
    this.webAcl = new waf.CfnWebACL(this, 'AlphaPackWebACL', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric',
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSetMetric',
          },
        },
        {
          name: 'RateLimitRule',
          priority: 3,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRuleMetric',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AlphaPackWebACL',
      },
    });

    // GuardDuty for threat detection
    new guardduty.CfnDetector(this, 'AlphaPackGuardDuty', {
      enable: true,
      findingPublishingFrequency: 'FIFTEEN_MINUTES',
      dataSources: {
        s3Logs: { enable: true },
        kubernetesAuditLogs: { enable: true },
        malwareProtection: { enable: true },
      },
    });

    // CloudTrail for audit logging
    const cloudTrailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `alphapack-cloudtrail-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'DeleteOldLogs',
        expiration: cdk.Duration.days(90),
      }],
    });

    new cloudtrail.Trail(this, 'AlphaPackCloudTrail', {
      bucket: cloudTrailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      encryptionKey: this.encryptionKey,
    });

    // Config for compliance monitoring
    new config.ConfigurationRecorder(this, 'AlphaPackConfigRecorder', {
      recordingGroup: {
        allSupported: true,
        includeGlobalResourceTypes: true,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApplicationRoleArn', {
      value: this.applicationExecutionRole.roleArn,
      description: 'Application execution role ARN',
    });

    new cdk.CfnOutput(this, 'MLRoleArn', {
      value: this.mlExecutionRole.roleArn,
      description: 'ML execution role ARN',
    });

    new cdk.CfnOutput(this, 'EncryptionKeyId', {
      value: this.encryptionKey.keyId,
      description: 'KMS encryption key ID',
    });

    new cdk.CfnOutput(this, 'WebACLArn', {
      value: this.webAcl.attrArn,
      description: 'WAF Web ACL ARN',
    });
  }
}
