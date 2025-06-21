# 🚀 Alpha Pack Deployment Guide

This comprehensive guide covers deploying Alpha Pack to production environments with enterprise-grade security, monitoring, and scalability.

## 📋 Prerequisites

### Required Tools
- **AWS CLI** v2.0+ configured with appropriate permissions
- **Node.js** 18+ and npm 8+
- **Docker** 20.10+ and Docker Compose v2
- **Anchor CLI** 0.28+ for Solana programs
- **Terraform** 1.5+ (optional, for infrastructure as code)

### AWS Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "iam:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "s3:*",
        "cloudfront:*",
        "route53:*",
        "acm:*",
        "logs:*",
        "events:*",
        "sqs:*",
        "sns:*",
        "secretsmanager:*",
        "kms:*",
        "ec2:*",
        "ecs:*",
        "rds:*",
        "elasticache:*",
        "opensearch:*",
        "sagemaker:*",
        "bedrock:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🔧 Environment Setup

### 1. Clone and Configure
```bash
git clone <repository-url>
cd alpha-pack

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Required Environment Variables
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Environment
NODE_ENV=production
STAGE=prod

# Solana Configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=<your-solana-private-key>

# API Keys (stored in AWS Secrets Manager)
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
OPENAI_API_KEY=<your-openai-api-key>
ETHEREUM_RPC_URL=<your-ethereum-rpc-url>
BASE_RPC_URL=<your-base-rpc-url>
ARBITRUM_RPC_URL=<your-arbitrum-rpc-url>

# Security
JWT_SECRET=<generate-secure-random-string>
ENCRYPTION_KEY=<generate-32-character-key>

# Domain Configuration
DOMAIN_NAME=alphapack.io
API_DOMAIN=api.alphapack.io
CDN_DOMAIN=cdn.alphapack.io
```

## 🏗️ Infrastructure Deployment

### Option A: Automated Deployment (Recommended)
```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Full deployment
./scripts/deploy.sh

# Or step by step
./scripts/deploy.sh bootstrap    # Bootstrap CDK
./scripts/deploy.sh infrastructure  # Deploy infrastructure
./scripts/deploy.sh application     # Deploy application
```

### Option B: Manual Deployment

#### 1. Bootstrap AWS CDK
```bash
npm install -g aws-cdk
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

#### 2. Deploy Infrastructure Stacks
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Deploy infrastructure in order
cdk deploy AlphaPack-Infrastructure-$NODE_ENV --require-approval never
cdk deploy AlphaPack-Security-$NODE_ENV --require-approval never
cdk deploy AlphaPack-Solana-$NODE_ENV --require-approval never
cdk deploy AlphaPack-ML-$NODE_ENV --require-approval never
cdk deploy AlphaPack-Application-$NODE_ENV --require-approval never
```

#### 3. Deploy Solana Programs
```bash
# Build Solana programs
anchor build

# Deploy to mainnet (ensure you have sufficient SOL)
anchor deploy --provider.cluster mainnet
```

#### 4. Configure Secrets
```bash
# Telegram Bot Token
aws secretsmanager create-secret \
  --name alphapack/telegram/bot-token \
  --secret-string "{\"token\":\"$TELEGRAM_BOT_TOKEN\"}" \
  --region $AWS_REGION

# Solana Private Key
aws secretsmanager create-secret \
  --name alphapack/solana/private-key \
  --secret-string "{\"privateKey\":\"$SOLANA_PRIVATE_KEY\",\"network\":\"mainnet-beta\"}" \
  --region $AWS_REGION

# API Keys
aws secretsmanager create-secret \
  --name alphapack/api/keys \
  --secret-string "{\"openai\":\"$OPENAI_API_KEY\",\"ethereum\":\"$ETHEREUM_RPC_URL\",\"base\":\"$BASE_RPC_URL\",\"arbitrum\":\"$ARBITRUM_RPC_URL\"}" \
  --region $AWS_REGION
```

## 🔒 Security Configuration

### 1. SSL/TLS Certificates
```bash
# Request ACM certificate
aws acm request-certificate \
  --domain-name alphapack.io \
  --subject-alternative-names "*.alphapack.io" \
  --validation-method DNS \
  --region us-east-1
```

### 2. WAF Rules
```bash
# Deploy WAF rules
aws cloudformation deploy \
  --template-file infrastructure/security/waf.yml \
  --stack-name alphapack-waf-prod \
  --parameter-overrides Environment=prod
```

### 3. Security Groups
```bash
# Configure security groups for RDS, ElastiCache, etc.
aws cloudformation deploy \
  --template-file infrastructure/security/security-groups.yml \
  --stack-name alphapack-security-groups-prod
```

## 📊 Monitoring Setup

### 1. CloudWatch Dashboards
```bash
# Create monitoring dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "AlphaPack-Production" \
  --dashboard-body file://monitoring/dashboard.json
```

### 2. Alarms and Notifications
```bash
# Deploy monitoring stack
aws cloudformation deploy \
  --template-file infrastructure/monitoring/alarms.yml \
  --stack-name alphapack-monitoring-prod \
  --parameter-overrides \
    Environment=prod \
    NotificationEmail=alerts@alphapack.io
```

### 3. Log Aggregation
```bash
# Configure log groups and retention
aws logs create-log-group --log-group-name /alphapack/api/prod
aws logs put-retention-policy --log-group-name /alphapack/api/prod --retention-in-days 30
```

## 🤖 ML Model Deployment

### 1. Upload Model Artifacts
```bash
# Create S3 bucket for models
aws s3 mb s3://alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION

# Upload trained models
aws s3 cp models/arbitrage/model.tar.gz s3://alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION/models/arbitrage/
aws s3 cp models/social-intelligence/model.tar.gz s3://alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION/models/social-intelligence/
```

### 2. Deploy SageMaker Endpoints
```bash
# Deploy ML endpoints
aws cloudformation deploy \
  --template-file infrastructure/ml/sagemaker.yml \
  --stack-name alphapack-ml-prod \
  --parameter-overrides \
    Environment=prod \
    ModelBucket=alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION
```

### 3. Configure Bedrock Access
```bash
# Enable Bedrock models
aws bedrock put-model-invocation-logging-configuration \
  --logging-config cloudWatchConfig='{logGroupName="/alphapack/bedrock/prod",roleArn="arn:aws:iam::$AWS_ACCOUNT_ID:role/AlphaPackBedrockRole"}'
```

## 🌐 Domain and CDN Setup

### 1. Route 53 Configuration
```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name alphapack.io \
  --caller-reference $(date +%s)

# Update nameservers with your domain registrar
aws route53 get-hosted-zone --id <hosted-zone-id>
```

### 2. CloudFront Distribution
```bash
# Deploy CDN stack
aws cloudformation deploy \
  --template-file infrastructure/cdn/cloudfront.yml \
  --stack-name alphapack-cdn-prod \
  --parameter-overrides \
    DomainName=alphapack.io \
    CertificateArn=<acm-certificate-arn>
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Setup
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - run: ./scripts/deploy.sh
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### 2. Automated Testing
```bash
# Run full test suite before deployment
npm run test:all

# Run security scans
npm audit --audit-level moderate
```

## 📱 Frontend Deployment

### 1. Build and Deploy
```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Deploy to S3/CloudFront
aws s3 sync out/ s3://alphapack-frontend-$AWS_ACCOUNT_ID-$AWS_REGION/
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

### 2. Environment Configuration
```bash
# Set production environment variables
export NEXT_PUBLIC_API_URL=https://api.alphapack.io
export NEXT_PUBLIC_WS_URL=wss://api.alphapack.io
export NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
export NEXT_PUBLIC_PROGRAM_ID=<your-deployed-program-id>
```

## 🔍 Post-Deployment Verification

### 1. Health Checks
```bash
# API health check
curl https://api.alphapack.io/api/v1/health

# Frontend health check
curl https://alphapack.io/api/health

# WebSocket connection test
wscat -c wss://api.alphapack.io
```

### 2. Functional Testing
```bash
# Run smoke tests
npm run test:smoke

# Test critical user flows
npm run test:e2e:critical
```

### 3. Performance Validation
```bash
# Load testing
artillery run tests/performance/production-load-test.yml

# Monitor key metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=alphapack-api-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## 🚨 Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Errors
```bash
# If bootstrap fails, try with explicit trust policy
cdk bootstrap --trust-policy-file trust-policy.json
```

#### 2. Lambda Cold Starts
```bash
# Enable provisioned concurrency for critical functions
aws lambda put-provisioned-concurrency-config \
  --function-name alphapack-api-prod \
  --provisioned-concurrency-config ProvisionedConcurrencyConfig=10
```

#### 3. Database Connection Issues
```bash
# Check RDS security groups
aws ec2 describe-security-groups --group-ids <rds-security-group-id>

# Test database connectivity
aws rds describe-db-instances --db-instance-identifier alphapack-db-prod
```

#### 4. Solana Program Deployment
```bash
# If program deployment fails, check SOL balance
solana balance

# Increase compute budget if needed
solana program deploy --max-len 1000000 target/deploy/alpha_pack_core.so
```

### Monitoring and Alerts

#### 1. Set Up Alerts
```bash
# High error rate alert
aws cloudwatch put-metric-alarm \
  --alarm-name "AlphaPack-HighErrorRate" \
  --alarm-description "High error rate detected" \
  --metric-name ErrorRate \
  --namespace AlphaPack \
  --statistic Average \
  --period 300 \
  --threshold 5.0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

#### 2. Log Analysis
```bash
# Query CloudWatch Logs
aws logs filter-log-events \
  --log-group-name /alphapack/api/prod \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

## 🔄 Maintenance and Updates

### 1. Rolling Updates
```bash
# Update Lambda functions with zero downtime
aws lambda update-function-code \
  --function-name alphapack-api-prod \
  --s3-bucket alphapack-deployments-$AWS_ACCOUNT_ID \
  --s3-key api/latest.zip
```

### 2. Database Migrations
```bash
# Run database migrations
npm run db:migrate:prod

# Backup before major updates
aws rds create-db-snapshot \
  --db-instance-identifier alphapack-db-prod \
  --db-snapshot-identifier alphapack-db-backup-$(date +%Y%m%d)
```

### 3. Solana Program Updates
```bash
# Upgrade Solana programs
anchor upgrade target/deploy/alpha_pack_core.so --program-id <program-id>
```

## 📞 Support and Monitoring

### Production Monitoring URLs
- **Application**: https://alphapack.io
- **API Health**: https://api.alphapack.io/api/v1/health
- **Grafana Dashboard**: https://monitoring.alphapack.io
- **CloudWatch**: AWS Console → CloudWatch → Dashboards → AlphaPack-Production

### Emergency Contacts
- **DevOps Team**: devops@alphapack.io
- **Security Team**: security@alphapack.io
- **On-Call**: +1-XXX-XXX-XXXX

### Runbooks
- [Incident Response](docs/runbooks/incident-response.md)
- [Database Recovery](docs/runbooks/database-recovery.md)
- [Solana Program Recovery](docs/runbooks/solana-recovery.md)

---

**🎉 Congratulations! Alpha Pack is now deployed to production.**

For ongoing maintenance and updates, refer to the [Operations Guide](OPERATIONS.md).
