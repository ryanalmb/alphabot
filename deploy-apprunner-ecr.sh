#!/bin/bash

# 🚀 Alpha Pack - AWS App Runner Deployment Script (ECR)
# Deploy using ECR container registry

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
ACCOUNT_ID="645634482532"
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/alpha-pack"

print_status "🚀 Starting Alpha Pack App Runner deployment with ECR..."

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

# Create ECR repository
print_status "Creating ECR repository..."
aws ecr create-repository \
    --repository-name alpha-pack \
    --region ${REGION} 2>/dev/null || print_warning "ECR repository may already exist"

# Login to ECR
print_status "Logging into ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO}

# Build Docker image
print_status "Building Docker image..."
docker build -t alpha-pack .

# Tag image for ECR
print_status "Tagging image for ECR..."
docker tag alpha-pack:latest ${ECR_REPO}:latest

# Push image to ECR
print_status "Pushing image to ECR..."
docker push ${ECR_REPO}:latest

# Create App Runner service with ECR
print_status "Creating App Runner service with ECR..."

cat > service-config-ecr.json << EOF
{
    "ServiceName": "${SERVICE_NAME}",
    "SourceConfiguration": {
        "ImageRepository": {
            "ImageIdentifier": "${ECR_REPO}:latest",
            "ImageConfiguration": {
                "Port": "3000",
                "RuntimeEnvironmentVariables": {
                    "NODE_ENV": "production",
                    "PORT": "3000",
                    "TELEGRAM_BOT_TOKEN": "7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M",
                    "JWT_SECRET": "y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW",
                    "ENCRYPTION_KEY": "rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"
                }
            },
            "ImageRepositoryType": "ECR"
        },
        "AutoDeploymentsEnabled": false
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
    --cli-input-json file://service-config-ecr.json \
    --region ${REGION} \
    --query 'Service.ServiceArn' \
    --output text)

if [ $? -eq 0 ]; then
    print_success "App Runner service created successfully!"
    print_status "Service ARN: ${SERVICE_ARN}"
    
    # Wait for service to be running
    print_status "Waiting for service to be running (this may take a few minutes)..."
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
rm -f service-config-ecr.json

print_success "🚀 Alpha Pack deployed successfully to AWS App Runner!"
echo ""
echo "📋 Next steps:"
echo "1. Test the API: curl https://${SERVICE_URL}/health"
echo "2. Test Telegram bot by sending /start"
echo "3. Monitor logs in AWS Console"
echo ""
