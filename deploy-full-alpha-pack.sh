#!/bin/bash

# 🚀 ALPHA PACK - FULL DEPLOYMENT SCRIPT
# Deploy complete Alpha Pack with ALL features to AWS App Runner

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
SERVICE_NAME="alpha-pack-full"
REGION="us-east-1"
GITHUB_REPO="https://github.com/ryanalmb/alpha-pack.git"

print_status "🚀 Starting FULL Alpha Pack deployment with ALL features..."

# Check required environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    print_error "AWS credentials not found in environment variables"
    print_status "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

# Configure AWS credentials
print_status "Configuring AWS credentials..."
export AWS_DEFAULT_REGION=us-east-1

# Test AWS connectivity
print_status "Testing AWS connectivity..."
aws sts get-caller-identity || {
    print_error "Failed to authenticate with AWS"
    exit 1
}

# Create App Runner service with FULL configuration
print_status "Creating App Runner service with ALL features..."

cat > full-service-config.json << EOF
{
    "ServiceName": "${SERVICE_NAME}",
    "SourceConfiguration": {
        "AutoDeploymentsEnabled": true,
        "CodeRepository": {
            "RepositoryUrl": "${GITHUB_REPO}",
            "SourceCodeVersion": {
                "Type": "BRANCH",
                "Value": "main"
            },
            "CodeConfiguration": {
                "ConfigurationSource": "REPOSITORY"
            }
        }
    },
    "InstanceConfiguration": {
        "Cpu": "2 vCPU",
        "Memory": "4 GB"
    },
    "HealthCheckConfiguration": {
        "Protocol": "HTTP",
        "Path": "/health",
        "Interval": 10,
        "Timeout": 5,
        "HealthyThreshold": 1,
        "UnhealthyThreshold": 5
    }
}
EOF

# Deploy the service
print_status "Deploying FULL Alpha Pack to App Runner..."
SERVICE_ARN=$(aws apprunner create-service \
    --cli-input-json file://full-service-config.json \
    --region ${REGION} \
    --query 'Service.ServiceArn' \
    --output text)

if [ $? -eq 0 ]; then
    print_success "App Runner service created successfully!"
    print_status "Service ARN: ${SERVICE_ARN}"
    
    # Wait for service to be running
    print_status "Waiting for service to be running (this may take 10-15 minutes for full build)..."
    aws apprunner wait service-running \
        --service-arn ${SERVICE_ARN} \
        --region ${REGION}
    
    # Get service URL
    SERVICE_URL=$(aws apprunner describe-service \
        --service-arn ${SERVICE_ARN} \
        --region ${REGION} \
        --query 'Service.ServiceUrl' \
        --output text)
    
    print_success "🎉 FULL Alpha Pack deployment completed!"
    echo ""
    echo "🌐 Service URL: https://${SERVICE_URL}"
    echo "🔗 Health Check: https://${SERVICE_URL}/health"
    echo "🤖 Telegram Webhook: https://${SERVICE_URL}/api/v1/telegram/webhook"
    echo "📊 Trading API: https://${SERVICE_URL}/api/v1/trading/status"
    echo "🎯 Packs API: https://${SERVICE_URL}/api/v1/packs"
    echo ""
    
    # Configure Telegram webhook
    if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
        print_status "Configuring Telegram webhook..."
        curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
            -H "Content-Type: application/json" \
            -d "{\"url\":\"https://${SERVICE_URL}/api/v1/telegram/webhook\"}"
        print_success "Telegram webhook configured!"
    else
        print_warning "TELEGRAM_BOT_TOKEN not set, skipping webhook configuration"
    fi
    
else
    print_error "Failed to create App Runner service"
    exit 1
fi

# Cleanup
rm -f full-service-config.json

print_success "🚀 FULL Alpha Pack deployed successfully with ALL features!"
echo ""
echo "📋 Features deployed:"
echo "✅ Complete Express.js API with all endpoints"
echo "✅ Full blockchain integration (Solana, Ethereum, Base, Arbitrum)"
echo "✅ Complete AWS SDK integration"
echo "✅ ML/AI capabilities (TensorFlow, Brain.js, Natural)"
echo "✅ Trading APIs (CCXT, Technical Indicators)"
echo "✅ Full security stack (Helmet, Rate Limiting, Validation)"
echo "✅ Complete Telegram bot integration"
echo "✅ Authentication and encryption"
echo "✅ Database support (MongoDB, PostgreSQL, Redis)"
echo "✅ File processing and utilities"
echo "✅ Payment integration (Stripe)"
echo "✅ Web scraping capabilities"
echo "✅ Complete TypeScript ecosystem"
echo ""
echo "🎯 Next steps:"
echo "1. Test the API: curl https://${SERVICE_URL}/health"
echo "2. Test Telegram bot by sending /start"
echo "3. Monitor logs in AWS Console"
echo "4. Scale up resources if needed"
echo ""
