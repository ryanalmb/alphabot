#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AlphaPackInfrastructureStack } from './stacks/infrastructure-stack';
import { AlphaPackApplicationStack } from './stacks/application-stack';
import { AlphaPackMLStack } from './stacks/ml-stack';
import { AlphaPackSolanaStack } from './stacks/solana-stack';
import { AlphaPackSecurityStack } from './stacks/security-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Stack naming convention
const stackPrefix = 'AlphaPack';
const environment = process.env.NODE_ENV || 'dev';

// Core infrastructure stack (VPC, networking, databases)
const infrastructureStack = new AlphaPackInfrastructureStack(app, `${stackPrefix}-Infrastructure-${environment}`, {
  env,
  description: 'Alpha Pack core infrastructure including VPC, databases, and networking',
  tags: {
    Project: 'AlphaPack',
    Environment: environment,
    Stack: 'Infrastructure',
  },
});

// Security stack (IAM, secrets, encryption)
const securityStack = new AlphaPackSecurityStack(app, `${stackPrefix}-Security-${environment}`, {
  env,
  description: 'Alpha Pack security infrastructure including IAM roles, secrets, and encryption',
  vpc: infrastructureStack.vpc,
  tags: {
    Project: 'AlphaPack',
    Environment: environment,
    Stack: 'Security',
  },
});

// Solana-specific infrastructure
const solanaStack = new AlphaPackSolanaStack(app, `${stackPrefix}-Solana-${environment}`, {
  env,
  description: 'Alpha Pack Solana infrastructure including RPC nodes and program deployment',
  vpc: infrastructureStack.vpc,
  securityGroup: infrastructureStack.solanaSecurityGroup,
  tags: {
    Project: 'AlphaPack',
    Environment: environment,
    Stack: 'Solana',
  },
});

// ML/AI stack (SageMaker, Bedrock, custom models)
const mlStack = new AlphaPackMLStack(app, `${stackPrefix}-ML-${environment}`, {
  env,
  description: 'Alpha Pack ML/AI infrastructure including SageMaker and Bedrock integration',
  vpc: infrastructureStack.vpc,
  securityGroup: infrastructureStack.mlSecurityGroup,
  executionRole: securityStack.mlExecutionRole,
  tags: {
    Project: 'AlphaPack',
    Environment: environment,
    Stack: 'ML',
  },
});

// Application stack (API, Lambda, Telegram bot)
const applicationStack = new AlphaPackApplicationStack(app, `${stackPrefix}-Application-${environment}`, {
  env,
  description: 'Alpha Pack application layer including API, Lambda functions, and Telegram integration',
  vpc: infrastructureStack.vpc,
  database: infrastructureStack.database,
  cache: infrastructureStack.cache,
  documentDb: infrastructureStack.documentDb,
  searchDomain: infrastructureStack.searchDomain,
  mlEndpoint: mlStack.inferenceEndpoint,
  securityGroup: infrastructureStack.applicationSecurityGroup,
  executionRole: securityStack.applicationExecutionRole,
  tags: {
    Project: 'AlphaPack',
    Environment: environment,
    Stack: 'Application',
  },
});

// Add dependencies
securityStack.addDependency(infrastructureStack);
solanaStack.addDependency(infrastructureStack);
mlStack.addDependency(infrastructureStack);
mlStack.addDependency(securityStack);
applicationStack.addDependency(infrastructureStack);
applicationStack.addDependency(securityStack);
applicationStack.addDependency(mlStack);

// Output important values
new cdk.CfnOutput(app, 'VpcId', {
  value: infrastructureStack.vpc.vpcId,
  description: 'VPC ID for Alpha Pack infrastructure',
});

new cdk.CfnOutput(app, 'DatabaseEndpoint', {
  value: infrastructureStack.database.clusterEndpoint.hostname,
  description: 'RDS Aurora cluster endpoint',
});

new cdk.CfnOutput(app, 'ApiGatewayUrl', {
  value: applicationStack.apiGateway.url,
  description: 'API Gateway URL for Alpha Pack API',
});

new cdk.CfnOutput(app, 'MLEndpoint', {
  value: mlStack.inferenceEndpoint.endpointName,
  description: 'SageMaker inference endpoint name',
});

// Multi-region setup for enterprise deployment
if (environment === 'prod') {
  // EU region deployment
  const euEnv = { ...env, region: 'eu-west-1' };
  new AlphaPackInfrastructureStack(app, `${stackPrefix}-Infrastructure-eu-${environment}`, {
    env: euEnv,
    description: 'Alpha Pack EU infrastructure',
    tags: { ...infrastructureStack.tags, Region: 'EU' },
  });

  // APAC region deployment
  const apacEnv = { ...env, region: 'ap-southeast-1' };
  new AlphaPackInfrastructureStack(app, `${stackPrefix}-Infrastructure-apac-${environment}`, {
    env: apacEnv,
    description: 'Alpha Pack APAC infrastructure',
    tags: { ...infrastructureStack.tags, Region: 'APAC' },
  });
}
