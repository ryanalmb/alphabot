#!/bin/bash

# 🚀 Alpha Pack - AWS Lambda Deployment Script
# Simple serverless deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
FUNCTION_NAME="alpha-pack-api"
REGION="us-east-1"

print_status "🚀 Starting Alpha Pack Lambda deployment..."

# Configure AWS credentials
print_status "Configuring AWS credentials..."
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-AKIAZMUWQMFSP2UO5GF4}
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-"YOUR_SECRET_KEY_HERE"}
export AWS_DEFAULT_REGION=us-east-1

# Test AWS connectivity
print_status "Testing AWS connectivity..."
aws sts get-caller-identity || {
    print_error "Failed to authenticate with AWS"
    exit 1
}

# Create Lambda function code
print_status "Creating Lambda function..."

cat > lambda-function.js << 'EOF'
const express = require('express');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Alpha Pack API'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Alpha Pack API',
    version: '1.0.0',
    status: 'running',
    deployment: 'AWS Lambda'
  });
});

// Telegram webhook
app.post('/api/v1/telegram/webhook', (req, res) => {
  console.log('Telegram webhook:', req.body);
  
  const { message } = req.body;
  if (message && message.text) {
    const chatId = message.chat.id;
    const text = message.text;
    
    res.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `🚀 Alpha Pack received: ${text}\n\n🎯 Welcome to DeFi social trading!`
    });
  } else {
    res.json({ ok: true });
  }
});

// Trading endpoints
app.get('/api/v1/trading/status', (req, res) => {
  res.json({
    status: 'active',
    markets: ['SOL/USDC', 'ETH/USDC'],
    performance: '+15.7%'
  });
});

module.exports.handler = serverless(app);
EOF

# Create package.json for Lambda
cat > lambda-package.json << 'EOF'
{
  "name": "alpha-pack-lambda",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "serverless-http": "^3.2.0"
  }
}
EOF

# Install dependencies
print_status "Installing dependencies..."
cp lambda-package.json package.json
npm install --production

# Create deployment package
print_status "Creating deployment package..."
zip -r alpha-pack-lambda.zip . -x "*.git*" "*.sh" "deploy-*" "aws/*" "awscliv2.zip" "node_modules/.cache/*"

# Create IAM role for Lambda
print_status "Creating IAM role..."
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name alpha-pack-lambda-role \
  --assume-role-policy-document file://trust-policy.json 2>/dev/null || print_warning "Role may already exist"

aws iam attach-role-policy \
  --role-name alpha-pack-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Wait for role to be ready
sleep 10

# Create Lambda function
print_status "Creating Lambda function..."
aws lambda create-function \
  --function-name ${FUNCTION_NAME} \
  --runtime nodejs18.x \
  --role arn:aws:iam::645634482532:role/alpha-pack-lambda-role \
  --handler lambda-function.handler \
  --zip-file fileb://alpha-pack-lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables='{
    "NODE_ENV":"production",
    "TELEGRAM_BOT_TOKEN":"7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M",
    "JWT_SECRET":"y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW",
    "ENCRYPTION_KEY":"rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"
  }' 2>/dev/null || {
    print_warning "Function may already exist, updating..."
    aws lambda update-function-code \
      --function-name ${FUNCTION_NAME} \
      --zip-file fileb://alpha-pack-lambda.zip
  }

# Create API Gateway
print_status "Creating API Gateway..."
API_ID=$(aws apigatewayv2 create-api \
  --name alpha-pack-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:${REGION}:645634482532:function:${FUNCTION_NAME} \
  --query 'ApiId' \
  --output text 2>/dev/null || echo "existing")

if [ "$API_ID" != "existing" ]; then
  # Add Lambda permission for API Gateway
  aws lambda add-permission \
    --function-name ${FUNCTION_NAME} \
    --statement-id api-gateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:645634482532:${API_ID}/*/*" 2>/dev/null || true
  
  API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com"
  
  print_success "🎉 Deployment completed!"
  echo ""
  echo "🌐 API URL: ${API_URL}"
  echo "🔗 Health Check: ${API_URL}/health"
  echo "🤖 Telegram Webhook: ${API_URL}/api/v1/telegram/webhook"
  echo ""
  
  # Configure Telegram webhook
  print_status "Configuring Telegram webhook..."
  curl -X POST "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${API_URL}/api/v1/telegram/webhook\"}"
  
  print_success "Telegram webhook configured!"
else
  print_warning "API Gateway may already exist"
fi

# Cleanup
rm -f lambda-function.js lambda-package.json trust-policy.json alpha-pack-lambda.zip

print_success "🚀 Alpha Pack deployed successfully to AWS Lambda!"
echo ""
echo "📋 Test your deployment:"
echo "1. curl ${API_URL}/health"
echo "2. Send /start to your Telegram bot"
echo ""
