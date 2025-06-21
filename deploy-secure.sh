#!/bin/bash

# 🚀 Alpha Pack Pro - Secure Deployment Script
# This script uses environment variables or a local config file for credentials

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to load configuration
load_config() {
    print_status "Loading deployment configuration..."
    
    # Check if local config file exists (not tracked by git)
    if [ -f "deploy-config.json" ]; then
        print_status "Using local deploy-config.json file"
        export AWS_ACCESS_KEY_ID=$(cat deploy-config.json | jq -r '.aws.accessKeyId')
        export AWS_SECRET_ACCESS_KEY=$(cat deploy-config.json | jq -r '.aws.secretAccessKey')
        export AWS_DEFAULT_REGION=$(cat deploy-config.json | jq -r '.aws.region')
        export AWS_ACCOUNT_ID=$(cat deploy-config.json | jq -r '.aws.accountId')
        export TELEGRAM_BOT_TOKEN=$(cat deploy-config.json | jq -r '.telegram.botToken')
        export SOLANA_PRIVATE_KEY=$(cat deploy-config.json | jq -r '.solana.privateKey')
    else
        print_status "Using environment variables"
        # Check if required environment variables are set
        if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
            print_error "AWS credentials not found!"
            print_error "Either:"
            print_error "1. Copy deploy-config.example.json to deploy-config.json and fill in your credentials"
            print_error "2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc."
            exit 1
        fi
    fi
    
    # Set defaults if not provided
    export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-"us-east-1"}
    export SOLANA_NETWORK=${SOLANA_NETWORK:-"devnet"}
    
    print_success "Configuration loaded successfully"
}

# Function to validate configuration
validate_config() {
    print_status "Validating configuration..."
    
    # Test AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        print_error "AWS credentials are invalid or AWS CLI is not configured"
        exit 1
    fi
    
    # Test Telegram bot token if provided
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        if ! curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe" | grep -q '"ok":true'; then
            print_warning "Telegram bot token may be invalid"
        else
            print_success "Telegram bot token validated"
        fi
    fi
    
    print_success "Configuration validation completed"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying AWS infrastructure..."
    
    # Bootstrap CDK if needed
    print_status "Bootstrapping CDK..."
    npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_DEFAULT_REGION --require-approval never
    
    # Deploy all stacks
    print_status "Deploying CDK stacks..."
    npx cdk deploy --all --require-approval never
    
    print_success "Infrastructure deployment completed"
}

# Function to configure secrets securely
configure_secrets() {
    print_status "Configuring AWS Secrets Manager..."
    
    # Only store secrets if tokens are provided
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        aws secretsmanager create-secret \
            --name alphapack/telegram/bot-token \
            --secret-string "{\"token\":\"$TELEGRAM_BOT_TOKEN\"}" \
            --region $AWS_DEFAULT_REGION 2>/dev/null || \
        aws secretsmanager update-secret \
            --secret-id alphapack/telegram/bot-token \
            --secret-string "{\"token\":\"$TELEGRAM_BOT_TOKEN\"}" \
            --region $AWS_DEFAULT_REGION
        print_success "Telegram bot token stored in Secrets Manager"
    fi
    
    if [ -n "$SOLANA_PRIVATE_KEY" ]; then
        aws secretsmanager create-secret \
            --name alphapack/solana/private-key \
            --secret-string "{\"privateKey\":\"$SOLANA_PRIVATE_KEY\",\"network\":\"$SOLANA_NETWORK\"}" \
            --region $AWS_DEFAULT_REGION 2>/dev/null || \
        aws secretsmanager update-secret \
            --secret-id alphapack/solana/private-key \
            --secret-string "{\"privateKey\":\"$SOLANA_PRIVATE_KEY\",\"network\":\"$SOLANA_NETWORK\"}" \
            --region $AWS_DEFAULT_REGION
        print_success "Solana private key stored in Secrets Manager"
    fi
    
    print_success "Secrets configuration completed"
}

# Function to setup Telegram webhook
setup_telegram_webhook() {
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        print_status "Setting up Telegram webhook..."
        
        # Get API Gateway URL
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name AlphaPack-Application-production \
            --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
            --output text \
            --region $AWS_DEFAULT_REGION 2>/dev/null || echo "")
        
        if [ -n "$API_URL" ]; then
            curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
                -H "Content-Type: application/json" \
                -d "{\"url\":\"${API_URL}/api/v1/telegram/webhook\"}"
            print_success "Telegram webhook configured: ${API_URL}/api/v1/telegram/webhook"
        else
            print_warning "Could not retrieve API Gateway URL for webhook setup"
        fi
    else
        print_warning "Telegram bot token not provided, skipping webhook setup"
    fi
}

# Main deployment function
main() {
    echo ""
    echo "🚀 Alpha Pack Pro - Secure Deployment"
    echo "======================================"
    echo ""
    
    load_config
    validate_config
    deploy_infrastructure
    configure_secrets
    setup_telegram_webhook
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "✅ AWS Infrastructure: Deployed"
    echo "✅ Secrets: Configured"
    echo "✅ Telegram Bot: Ready"
    echo ""
    echo "🔗 Check AWS Console for deployed resources"
    echo "🤖 Test your Telegram bot if configured"
    echo ""
}

# Check if jq is installed (needed for JSON parsing)
if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed. Install it for JSON config file support:"
    print_warning "Ubuntu/Debian: sudo apt-get install jq"
    print_warning "macOS: brew install jq"
    print_warning "Windows: Download from https://stedolan.github.io/jq/"
fi

# Run main function
main "$@"
