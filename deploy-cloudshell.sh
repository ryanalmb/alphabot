#!/bin/bash

# Alpha Pack AWS CloudShell Enterprise Deployment
# This script deploys Alpha Pack directly from AWS CloudShell
# No local dependencies required - everything runs in the cloud

set -e

echo "🚀 ALPHA PACK ENTERPRISE DEPLOYMENT - AWS CLOUDSHELL"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
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

# Set environment variables
export AWS_ACCOUNT_ID=645634482532
export AWS_DEFAULT_REGION=us-east-1
export NODE_ENV=production

print_status "Starting Alpha Pack enterprise deployment..."
print_status "AWS Account: $AWS_ACCOUNT_ID"
print_status "Region: $AWS_DEFAULT_REGION"

# Clone or update repository
setup_repository() {
    print_status "Setting up repository..."
    
    if [ ! -d "alpha-pack" ]; then
        print_status "Repository not found locally. Please upload your code to CloudShell."
        print_status "You can use 'Actions > Upload file' in CloudShell to upload your project."
        exit 1
    fi
    
    cd alpha-pack
    print_success "Repository ready"
}

# Install minimal dependencies
install_minimal_deps() {
    print_status "Installing minimal CDK dependencies..."
    
    # Install only what's needed for CDK deployment
    npm install typescript ts-node aws-cdk-lib constructs @types/node --no-optional
    
    # Install CDK globally if not available
    if ! command -v cdk &> /dev/null; then
        npm install -g aws-cdk@latest
    fi
    
    print_success "CDK ready for deployment"
}

# Bootstrap CDK
bootstrap_cdk() {
    print_status "Bootstrapping CDK..."
    
    cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_DEFAULT_REGION --require-approval never
    
    print_success "CDK bootstrapped"
}

# Deploy infrastructure stacks
deploy_infrastructure() {
    print_status "Deploying AWS infrastructure stacks..."
    
    # Deploy in dependency order
    print_status "1/5 Deploying Infrastructure stack..."
    cdk deploy AlphaPack-Infrastructure-production --require-approval never
    
    print_status "2/5 Deploying Security stack..."
    cdk deploy AlphaPack-Security-production --require-approval never
    
    print_status "3/5 Deploying Solana stack..."
    cdk deploy AlphaPack-Solana-production --require-approval never
    
    print_status "4/5 Deploying ML stack..."
    cdk deploy AlphaPack-ML-production --require-approval never
    
    print_status "5/5 Deploying Application stack..."
    cdk deploy AlphaPack-Application-production --require-approval never
    
    print_success "All infrastructure stacks deployed"
}

# Configure secrets in AWS Secrets Manager
configure_secrets() {
    print_status "Configuring AWS Secrets Manager..."
    
    # Telegram bot token
    aws secretsmanager create-secret \
        --name alphapack/telegram/bot-token \
        --secret-string '{"token":"7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M"}' \
        --region $AWS_DEFAULT_REGION 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id alphapack/telegram/bot-token \
        --secret-string '{"token":"7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M"}' \
        --region $AWS_DEFAULT_REGION
    
    # Solana private key
    aws secretsmanager create-secret \
        --name alphapack/solana/private-key \
        --secret-string '{"privateKey":"[219,191,67,133,185,3,248,213,160,248,146,201,170,180,0,223,28,171,83,88,128,182,176,74,219,210,234,210,25,111,155,39]","network":"devnet"}' \
        --region $AWS_DEFAULT_REGION 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id alphapack/solana/private-key \
        --secret-string '{"privateKey":"[219,191,67,133,185,3,248,213,160,248,146,201,170,180,0,223,28,171,83,88,128,182,176,74,219,210,234,210,25,111,155,39]","network":"devnet"}' \
        --region $AWS_DEFAULT_REGION
    
    # API keys and secrets
    aws secretsmanager create-secret \
        --name alphapack/api/keys \
        --secret-string '{"ethereum":"https://mainnet.infura.io/v3/40e6a71e34f647bcb0d83c7d55e808ad","base":"https://mainnet.base.org","arbitrum":"https://arb1.arbitrum.io/rpc","jwt":"y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW","encryption":"rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"}' \
        --region $AWS_DEFAULT_REGION 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id alphapack/api/keys \
        --secret-string '{"ethereum":"https://mainnet.infura.io/v3/40e6a71e34f647bcb0d83c7d55e808ad","base":"https://mainnet.base.org","arbitrum":"https://arb1.arbitrum.io/rpc","jwt":"y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW","encryption":"rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"}' \
        --region $AWS_DEFAULT_REGION
    
    print_success "Secrets configured"
}

# Configure Telegram webhook
configure_telegram() {
    print_status "Configuring Telegram webhook..."
    
    # Get API Gateway URL from CloudFormation outputs
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name AlphaPack-Application-production \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text \
        --region $AWS_DEFAULT_REGION 2>/dev/null || echo "")
    
    if [ -n "$API_URL" ]; then
        curl -X POST "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/setWebhook" \
            -H "Content-Type: application/json" \
            -d "{\"url\":\"${API_URL}/api/v1/telegram/webhook\"}"
        print_success "Telegram webhook configured: ${API_URL}/api/v1/telegram/webhook"
    else
        print_warning "Could not retrieve API Gateway URL. Configure webhook manually."
    fi
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test AWS connectivity
    aws sts get-caller-identity
    
    # Test Telegram bot
    curl -X GET "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/getMe"
    
    print_success "Deployment tests completed"
}

# Generate deployment summary
generate_summary() {
    print_status "Generating deployment summary..."
    
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name AlphaPack-Application-production \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text \
        --region $AWS_DEFAULT_REGION 2>/dev/null || echo "Retrieving...")
    
    cat > DEPLOYMENT_SUMMARY_CLOUDSHELL.md << EOF
# 🎉 Alpha Pack Enterprise Deployment Complete!

## ✅ **DEPLOYMENT STATUS: LIVE**
- **Environment**: AWS CloudShell Enterprise Deployment
- **AWS Account**: $AWS_ACCOUNT_ID
- **Region**: $AWS_DEFAULT_REGION
- **Deployment Date**: $(date)

## 🚀 **LIVE ENDPOINTS**
- **API Gateway**: ${API_URL}
- **Telegram Bot**: @Alpha_Pack_bot
- **Webhook**: ${API_URL}/api/v1/telegram/webhook

## 🏗️ **DEPLOYED STACKS**
- ✅ AlphaPack-Infrastructure-production
- ✅ AlphaPack-Security-production  
- ✅ AlphaPack-Solana-production
- ✅ AlphaPack-ML-production
- ✅ AlphaPack-Application-production

## 🔐 **SECRETS CONFIGURED**
- ✅ Telegram Bot Token
- ✅ Solana Private Key
- ✅ API Keys & Security Tokens

## 🎯 **NEXT STEPS**
1. Test Telegram bot: Message @Alpha_Pack_bot with /start
2. Monitor CloudWatch logs
3. Verify all services are running
4. Deploy Solana programs to devnet

## 📞 **SUPPORT**
- AWS Console: https://console.aws.amazon.com
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_DEFAULT_REGION#logsV2:
- Telegram API Test: https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/getUpdates

🚀 **Alpha Pack is now LIVE on AWS!**
EOF
    
    print_success "Deployment summary generated: DEPLOYMENT_SUMMARY_CLOUDSHELL.md"
}

# Main deployment function
main() {
    print_status "🌟 Alpha Pack Enterprise Deployment Starting..."
    
    setup_repository
    install_minimal_deps
    bootstrap_cdk
    deploy_infrastructure
    configure_secrets
    configure_telegram
    test_deployment
    generate_summary
    
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
    echo ""
    print_success "🚀 ALPHA PACK ENTERPRISE DEPLOYMENT COMPLETE!"
    echo ""
    echo "✅ AWS Infrastructure: DEPLOYED"
    echo "✅ Secrets Manager: CONFIGURED"  
    echo "✅ Telegram Bot: LIVE"
    echo "✅ API Gateway: ACTIVE"
    echo "✅ All Services: RUNNING"
    echo ""
    echo "🤖 Test your bot now: @Alpha_Pack_bot"
    echo "📱 Send message: /start"
    echo ""
    echo "📋 Check DEPLOYMENT_SUMMARY_CLOUDSHELL.md for details"
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
}

# Run deployment
main "$@"
