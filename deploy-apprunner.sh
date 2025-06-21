#!/bin/bash

# 🚀 Alpha Pack - AWS App Runner Deployment Script
# Simple, fast deployment using AWS App Runner

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
SERVICE_NAME="alpha-pack-api"
REGION="us-east-1"
GITHUB_REPO="https://github.com/ryanalmb/alpha-pack.git"

print_status "🚀 Starting Alpha Pack App Runner deployment..."

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

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

# Create App Runner service
print_status "Creating App Runner service..."

# Create service configuration
cat > service-config.json << EOF
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
                "ConfigurationSource": "REPOSITORY",
                "CodeConfigurationValues": {
                    "Runtime": "NODEJS_18",
                    "BuildCommand": "npm ci --only=production",
                    "StartCommand": "npm start",
                    "RuntimeEnvironmentVariables": {
                        "NODE_ENV": "production",
                        "PORT": "3000",
                        "TELEGRAM_BOT_TOKEN": "7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M",
                        "JWT_SECRET": "y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW",
                        "ENCRYPTION_KEY": "rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"
                    }
                }
            }
        }
    },
    "InstanceConfiguration": {
        "Cpu": "0.25 vCPU",
        "Memory": "0.5 GB"
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
print_status "Deploying to App Runner..."
SERVICE_ARN=$(aws apprunner create-service \
    --cli-input-json file://service-config.json \
    --region ${REGION} \
    --query 'Service.ServiceArn' \
    --output text)

if [ $? -eq 0 ]; then
    print_success "App Runner service created successfully!"
    print_status "Service ARN: ${SERVICE_ARN}"
    
    # Wait for service to be running
    print_status "Waiting for service to be running..."
    aws apprunner wait service-running \
        --service-arn ${SERVICE_ARN} \
        --region ${REGION}
    
    # Get service URL
    SERVICE_URL=$(aws apprunner describe-service \
        --service-arn ${SERVICE_ARN} \
        --region ${REGION} \
        --query 'Service.ServiceUrl' \
        --output text)
    
    print_success "🎉 Deployment completed!"
    echo ""
    echo "🌐 Service URL: https://${SERVICE_URL}"
    echo "🔗 Health Check: https://${SERVICE_URL}/health"
    echo "🤖 Telegram Webhook: https://${SERVICE_URL}/api/v1/telegram/webhook"
    echo ""
    
    # Configure Telegram webhook
    print_status "Configuring Telegram webhook..."
    curl -X POST "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"https://${SERVICE_URL}/api/v1/telegram/webhook\"}"
    
    print_success "Telegram webhook configured!"
    
else
    print_error "Failed to create App Runner service"
    exit 1
fi

# Cleanup
rm -f service-config.json

print_success "🚀 Alpha Pack deployed successfully to AWS App Runner!"
echo ""
echo "📋 Next steps:"
echo "1. Test the API: curl https://${SERVICE_URL}/health"
echo "2. Test Telegram bot by sending /start"
echo "3. Monitor logs in AWS Console"
echo ""
