#!/bin/bash

# Alpha Pack Deployment Script
# This script deploys the entire Alpha Pack infrastructure to AWS

set -e

echo "🚀 Starting Alpha Pack deployment..."

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    if ! command -v cdk &> /dev/null; then
        echo "❌ AWS CDK not found. Please install AWS CDK."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js."
        exit 1
    fi
    
    if ! command -v anchor &> /dev/null; then
        echo "❌ Anchor CLI not found. Please install Anchor CLI."
        exit 1
    fi
    
    echo "✅ All dependencies found"
}

# Set environment variables
setup_environment() {
    echo "🔧 Setting up environment..."
    
    # Load environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo "❌ .env file not found. Please create one from .env.example"
        exit 1
    fi
    
    # Validate required environment variables
    required_vars=("AWS_REGION" "AWS_ACCOUNT_ID" "NODE_ENV")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Required environment variable $var is not set"
            exit 1
        fi
    done
    
    echo "✅ Environment configured"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # Install Node.js dependencies
    npm install
    
    # Build TypeScript
    npm run build
    
    echo "✅ Dependencies installed"
}

# Deploy Solana programs
deploy_solana_programs() {
    echo "⚡ Deploying Solana programs..."
    
    # Build Solana programs
    anchor build
    
    # Deploy to devnet first for testing
    if [ "$NODE_ENV" = "development" ]; then
        echo "🧪 Deploying to Solana devnet..."
        anchor deploy --provider.cluster devnet
    else
        echo "🌐 Deploying to Solana mainnet..."
        anchor deploy --provider.cluster mainnet
    fi
    
    echo "✅ Solana programs deployed"
}

# Bootstrap CDK
bootstrap_cdk() {
    echo "🏗️ Bootstrapping CDK..."
    
    # Bootstrap CDK for the account/region
    cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
    
    echo "✅ CDK bootstrapped"
}

# Deploy AWS infrastructure
deploy_aws_infrastructure() {
    echo "☁️ Deploying AWS infrastructure..."
    
    # Deploy infrastructure stacks in order
    echo "📊 Deploying infrastructure stack..."
    cdk deploy AlphaPack-Infrastructure-$NODE_ENV --require-approval never
    
    echo "🔒 Deploying security stack..."
    cdk deploy AlphaPack-Security-$NODE_ENV --require-approval never
    
    echo "⚡ Deploying Solana stack..."
    cdk deploy AlphaPack-Solana-$NODE_ENV --require-approval never
    
    echo "🤖 Deploying ML stack..."
    cdk deploy AlphaPack-ML-$NODE_ENV --require-approval never
    
    echo "🚀 Deploying application stack..."
    cdk deploy AlphaPack-Application-$NODE_ENV --require-approval never
    
    echo "✅ AWS infrastructure deployed"
}

# Configure secrets
configure_secrets() {
    echo "🔐 Configuring secrets..."
    
    # Update Telegram bot token (placeholder - replace with actual token)
    if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
        aws secretsmanager update-secret \
            --secret-id alphapack/telegram/bot-token \
            --secret-string "{\"token\":\"$TELEGRAM_BOT_TOKEN\"}" \
            --region $AWS_REGION
    fi
    
    # Update Solana private key (placeholder - replace with actual key)
    if [ ! -z "$SOLANA_PRIVATE_KEY" ]; then
        aws secretsmanager update-secret \
            --secret-id alphapack/solana/private-key \
            --secret-string "{\"privateKey\":\"$SOLANA_PRIVATE_KEY\",\"network\":\"mainnet-beta\"}" \
            --region $AWS_REGION
    fi
    
    # Update API keys
    if [ ! -z "$OPENAI_API_KEY" ]; then
        aws secretsmanager update-secret \
            --secret-id alphapack/api/keys \
            --secret-string "{\"openai\":\"$OPENAI_API_KEY\",\"ethereum\":\"$ETHEREUM_RPC_URL\",\"base\":\"$BASE_RPC_URL\",\"arbitrum\":\"$ARBITRUM_RPC_URL\"}" \
            --region $AWS_REGION
    fi
    
    echo "✅ Secrets configured"
}

# Deploy ML models
deploy_ml_models() {
    echo "🧠 Deploying ML models..."
    
    # Create model artifacts bucket if it doesn't exist
    aws s3 mb s3://alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION --region $AWS_REGION || true
    
    # Upload placeholder model artifacts
    echo "📤 Uploading model artifacts..."
    
    # Create placeholder model files
    mkdir -p models/arbitrage models/social-intelligence models/general
    
    # Create simple model.tar.gz files (in production, these would be real trained models)
    echo "placeholder model" > models/arbitrage/model.pkl
    tar -czf models/arbitrage/model.tar.gz -C models/arbitrage model.pkl
    
    echo "placeholder model" > models/social-intelligence/model.pkl
    tar -czf models/social-intelligence/model.tar.gz -C models/social-intelligence model.pkl
    
    echo "placeholder model" > models/general/model.pkl
    tar -czf models/general/model.tar.gz -C models/general model.pkl
    
    # Upload to S3
    aws s3 cp models/arbitrage/model.tar.gz s3://alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION/models/arbitrage/model.tar.gz
    aws s3 cp models/social-intelligence/model.tar.gz s3://alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION/models/social-intelligence/model.tar.gz
    aws s3 cp models/general/model.tar.gz s3://alphapack-ml-models-$AWS_ACCOUNT_ID-$AWS_REGION/models/general/model.tar.gz
    
    # Clean up local files
    rm -rf models/
    
    echo "✅ ML models deployed"
}

# Set up monitoring
setup_monitoring() {
    echo "📊 Setting up monitoring..."
    
    # Create CloudWatch dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "AlphaPack-$NODE_ENV" \
        --dashboard-body file://monitoring/dashboard.json \
        --region $AWS_REGION || echo "⚠️ Dashboard creation failed (file may not exist)"
    
    echo "✅ Monitoring configured"
}

# Verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    # Check if API Gateway is accessible
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name AlphaPack-Application-$NODE_ENV \
        --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayURL`].OutputValue' \
        --output text \
        --region $AWS_REGION)
    
    if [ ! -z "$API_URL" ]; then
        echo "🌐 API Gateway URL: $API_URL"
        
        # Test API health
        if curl -f "$API_URL/api/v1/health" > /dev/null 2>&1; then
            echo "✅ API is responding"
        else
            echo "⚠️ API health check failed"
        fi
    else
        echo "⚠️ Could not retrieve API Gateway URL"
    fi
    
    # Check if Lambda functions are deployed
    echo "🔍 Checking Lambda functions..."
    aws lambda list-functions \
        --query 'Functions[?starts_with(FunctionName, `alphapack`)].FunctionName' \
        --output table \
        --region $AWS_REGION
    
    echo "✅ Deployment verification complete"
}

# Print deployment summary
print_summary() {
    echo ""
    echo "🎉 Alpha Pack deployment complete!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "====================="
    echo "Environment: $NODE_ENV"
    echo "AWS Region: $AWS_REGION"
    echo "AWS Account: $AWS_ACCOUNT_ID"
    echo ""
    
    # Get important outputs
    echo "🔗 Important URLs:"
    
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name AlphaPack-Application-$NODE_ENV \
        --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayURL`].OutputValue' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "Not available")
    echo "API Gateway: $API_URL"
    
    CDN_URL=$(aws cloudformation describe-stacks \
        --stack-name AlphaPack-Infrastructure-$NODE_ENV \
        --query 'Stacks[0].Outputs[?OutputKey==`CDNDomainName`].OutputValue' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "Not available")
    echo "CDN: https://$CDN_URL"
    
    echo ""
    echo "📱 Next Steps:"
    echo "1. Configure your Telegram bot webhook: $API_URL/api/v1/telegram/webhook"
    echo "2. Update your frontend to use the API Gateway URL"
    echo "3. Test the deployment with the provided test scripts"
    echo "4. Monitor the application using CloudWatch dashboards"
    echo ""
    echo "🔧 Useful Commands:"
    echo "- View logs: npm run logs"
    echo "- Run tests: npm test"
    echo "- Update deployment: npm run deploy"
    echo "- Destroy infrastructure: npm run destroy"
    echo ""
}

# Main deployment flow
main() {
    echo "🌟 Alpha Pack - Enterprise DeFi Social Trading Platform"
    echo "======================================================"
    echo ""
    
    check_dependencies
    setup_environment
    install_dependencies
    
    # Deploy in order
    bootstrap_cdk
    deploy_solana_programs
    deploy_aws_infrastructure
    configure_secrets
    deploy_ml_models
    setup_monitoring
    
    # Verify and summarize
    verify_deployment
    print_summary
    
    echo "🚀 Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "destroy")
        echo "🗑️ Destroying Alpha Pack infrastructure..."
        cdk destroy --all --force
        echo "✅ Infrastructure destroyed"
        ;;
    "update")
        echo "🔄 Updating Alpha Pack deployment..."
        install_dependencies
        deploy_aws_infrastructure
        echo "✅ Deployment updated"
        ;;
    "verify")
        setup_environment
        verify_deployment
        ;;
    *)
        echo "Usage: $0 [deploy|destroy|update|verify]"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  destroy - Destroy all infrastructure"
        echo "  update  - Update existing deployment"
        echo "  verify  - Verify deployment status"
        exit 1
        ;;
esac
