#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - TRIGGER CLOUD BUILD
# Triggers CodeBuild to create optimized containers in the cloud
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
PROJECT_NAME="alpha-pack-builder"
BUILD_TYPE=${1:-"full"}  # full, base, or app

echo "🚀 Triggering Alpha Pack Pro Cloud Build..."
echo "📦 Build Type: $BUILD_TYPE"

# Set environment variables based on build type
case $BUILD_TYPE in
    "base")
        ENV_VARS='[{"name":"BUILD_TARGET","value":"base-dependencies"}]'
        echo "🏗️ Building base dependencies image only..."
        ;;
    "app")
        ENV_VARS='[{"name":"BUILD_TARGET","value":"application-builder"}]'
        echo "🚀 Building application image using cached base..."
        ;;
    "full")
        ENV_VARS='[{"name":"BUILD_TARGET","value":"production"}]'
        echo "🎯 Building complete production image..."
        ;;
    *)
        echo "❌ Invalid build type. Use: base, app, or full"
        exit 1
        ;;
esac

# Start the build
echo "▶️ Starting CodeBuild..."
BUILD_ID=$(aws codebuild start-build \
    --project-name $PROJECT_NAME \
    --environment-variables-override "$ENV_VARS" \
    --region $AWS_REGION \
    --query 'build.id' \
    --output text)

echo "✅ Build started!"
echo "🆔 Build ID: $BUILD_ID"
echo "🔗 Console: https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"

# Monitor build progress
echo "📊 Monitoring build progress..."
while true; do
    BUILD_STATUS=$(aws codebuild batch-get-builds \
        --ids $BUILD_ID \
        --region $AWS_REGION \
        --query 'builds[0].buildStatus' \
        --output text)
    
    case $BUILD_STATUS in
        "SUCCEEDED")
            echo "🎉 Build completed successfully!"
            
            # Get the built image URI
            LOGS=$(aws codebuild batch-get-builds \
                --ids $BUILD_ID \
                --region $AWS_REGION \
                --query 'builds[0].logs.cloudWatchLogs.groupName' \
                --output text)
            
            echo "📦 Container images built and pushed to ECR"
            echo "🎯 Ready for instant deployments!"
            break
            ;;
        "FAILED"|"FAULT"|"STOPPED"|"TIMED_OUT")
            echo "❌ Build failed with status: $BUILD_STATUS"
            echo "📋 Check logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/$LOGS"
            exit 1
            ;;
        "IN_PROGRESS")
            echo "⏳ Build in progress... (Status: $BUILD_STATUS)"
            sleep 30
            ;;
        *)
            echo "📊 Build status: $BUILD_STATUS"
            sleep 15
            ;;
    esac
done

echo ""
echo "🎯 Next Steps:"
echo "  🚀 Deploy with: bash deploy-blue-green.sh"
echo "  ⚡ Future updates: 30-second deployments with cached images"
