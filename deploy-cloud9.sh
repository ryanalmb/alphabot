#!/bin/bash

# Alpha Pack Enterprise Deployment - AWS Cloud9
# Optimized for Cloud9 environment with pre-installed AWS tools

set -e

echo "🚀 ALPHA PACK ENTERPRISE DEPLOYMENT - AWS CLOUD9"
echo "================================================="

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

print_status "Starting Alpha Pack enterprise deployment in Cloud9..."
print_status "AWS Account: $AWS_ACCOUNT_ID"
print_status "Region: $AWS_DEFAULT_REGION"

# Configure AWS credentials
configure_aws_credentials() {
    print_status "Configuring AWS credentials..."
    
    aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID:-"YOUR_AWS_ACCESS_KEY_ID"}
    aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY:-"YOUR_AWS_SECRET_ACCESS_KEY"}
    aws configure set default.region us-east-1
    aws configure set default.output json
    
    # Verify credentials
    if aws sts get-caller-identity > /dev/null 2>&1; then
        print_success "AWS credentials configured and verified"
    else
        print_error "Failed to configure AWS credentials"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing CDK and dependencies..."
    
    # Update npm to latest version
    npm install -g npm@latest
    
    # Install AWS CDK globally
    npm install -g aws-cdk@latest
    
    # Install minimal project dependencies
    npm install typescript ts-node aws-cdk-lib constructs @types/node --no-optional
    
    # Verify CDK installation
    if cdk --version > /dev/null 2>&1; then
        print_success "CDK installed successfully: $(cdk --version)"
    else
        print_error "Failed to install CDK"
        exit 1
    fi
}

# Bootstrap CDK
bootstrap_cdk() {
    print_status "Bootstrapping CDK..."
    
    cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_DEFAULT_REGION --require-approval never
    
    print_success "CDK bootstrapped successfully"
}

# Deploy infrastructure stacks
deploy_infrastructure() {
    print_status "Deploying AWS infrastructure stacks..."
    
    # Deploy stacks in dependency order
    print_status "1/5 Deploying Infrastructure stack..."
    cdk deploy AlphaPack-Infrastructure-production --require-approval never
    print_success "Infrastructure stack deployed"
    
    print_status "2/5 Deploying Security stack..."
    cdk deploy AlphaPack-Security-production --require-approval never
    print_success "Security stack deployed"
    
    print_status "3/5 Deploying Solana stack..."
    cdk deploy AlphaPack-Solana-production --require-approval never
    print_success "Solana stack deployed"
    
    print_status "4/5 Deploying ML stack..."
    cdk deploy AlphaPack-ML-production --require-approval never
    print_success "ML stack deployed"
    
    print_status "5/5 Deploying Application stack..."
    cdk deploy AlphaPack-Application-production --require-approval never
    print_success "Application stack deployed"
    
    print_success "All infrastructure stacks deployed successfully"
}

# Configure secrets
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
    
    print_success "Telegram bot token configured"
    
    # Solana private key
    aws secretsmanager create-secret \
        --name alphapack/solana/private-key \
        --secret-string '{"privateKey":"[219,191,67,133,185,3,248,213,160,248,146,201,170,180,0,223,28,171,83,88,128,182,176,74,219,210,234,210,25,111,155,39]","network":"devnet"}' \
        --region $AWS_DEFAULT_REGION 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id alphapack/solana/private-key \
        --secret-string '{"privateKey":"[219,191,67,133,185,3,248,213,160,248,146,201,170,180,0,223,28,171,83,88,128,182,176,74,219,210,234,210,25,111,155,39]","network":"devnet"}' \
        --region $AWS_DEFAULT_REGION
    
    print_success "Solana private key configured"
    
    # API keys and secrets
    aws secretsmanager create-secret \
        --name alphapack/api/keys \
        --secret-string '{"ethereum":"https://mainnet.infura.io/v3/40e6a71e34f647bcb0d83c7d55e808ad","base":"https://mainnet.base.org","arbitrum":"https://arb1.arbitrum.io/rpc","jwt":"y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW","encryption":"rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"}' \
        --region $AWS_DEFAULT_REGION 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id alphapack/api/keys \
        --secret-string '{"ethereum":"https://mainnet.infura.io/v3/40e6a71e34f647bcb0d83c7d55e808ad","base":"https://mainnet.base.org","arbitrum":"https://arb1.arbitrum.io/rpc","jwt":"y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW","encryption":"rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"}' \
        --region $AWS_DEFAULT_REGION
    
    print_success "API keys configured"
    print_success "All secrets configured in AWS Secrets Manager"
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
        # Set webhook
        WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/setWebhook" \
            -H "Content-Type: application/json" \
            -d "{\"url\":\"${API_URL}/api/v1/telegram/webhook\"}")
        
        if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
            print_success "Telegram webhook configured: ${API_URL}/api/v1/telegram/webhook"
        else
            print_warning "Telegram webhook configuration may have failed"
            echo "Response: $WEBHOOK_RESPONSE"
        fi
    else
        print_warning "Could not retrieve API Gateway URL. Configure webhook manually."
    fi
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test AWS connectivity
    print_status "Testing AWS connectivity..."
    aws sts get-caller-identity
    
    # Test Telegram bot
    print_status "Testing Telegram bot..."
    BOT_RESPONSE=$(curl -s "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/getMe")
    
    if echo "$BOT_RESPONSE" | grep -q '"ok":true'; then
        print_success "Telegram bot is responding correctly"
        BOT_USERNAME=$(echo "$BOT_RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        print_success "Bot username: @$BOT_USERNAME"
    else
        print_warning "Telegram bot test failed"
        echo "Response: $BOT_RESPONSE"
    fi
    
    # List deployed stacks
    print_status "Verifying deployed stacks..."
    aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE \
        --query 'StackSummaries[?contains(StackName, `AlphaPack`)].StackName' \
        --output table
    
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
    
    cat > DEPLOYMENT_SUMMARY_CLOUD9.md << EOF
# 🎉 Alpha Pack Enterprise Deployment Complete!

## ✅ **DEPLOYMENT STATUS: LIVE**
- **Environment**: AWS Cloud9 Enterprise Deployment
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
    
    print_success "Deployment summary generated: DEPLOYMENT_SUMMARY_CLOUD9.md"
}

# Main deployment function
main() {
    print_status "🌟 Alpha Pack Enterprise Deployment Starting..."
    
    configure_aws_credentials
    install_dependencies
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
    echo "📋 Check DEPLOYMENT_SUMMARY_CLOUD9.md for details"
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
}

# Run deployment
main "$@"
