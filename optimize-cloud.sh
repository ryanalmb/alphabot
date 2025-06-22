#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - CLOUD-BASED OPTIMIZATION
# Uses AWS CodeBuild to create optimized containers (no local Docker needed)
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="645634482532"
PROJECT_NAME="alpha-pack-pro-optimizer"
GITHUB_REPO="https://github.com/ryanalmb/alphabot.git"

echo "🚀 Setting up cloud-based Alpha Pack Pro optimization..."

# Create CodeBuild service role if it doesn't exist
echo "🔐 Setting up CodeBuild service role..."
ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/AlphaPackCodeBuildRole"

# Create CodeBuild project
echo "🏗️ Creating CodeBuild project for optimization..."
aws codebuild create-project \
    --name $PROJECT_NAME \
    --description "Alpha Pack Pro Container Optimization" \
    --source type=GITHUB,location=$GITHUB_REPO \
    --artifacts type=NO_ARTIFACTS \
    --environment type=LINUX_CONTAINER,image=aws/codebuild/amazonlinux2-x86_64-standard:3.0,computeType=BUILD_GENERAL1_LARGE,privilegedMode=true \
    --service-role $ROLE_ARN \
    --region $AWS_REGION \
    || echo "CodeBuild project already exists"

# Start the optimization build
echo "🚀 Starting optimization build..."
BUILD_ID=$(aws codebuild start-build \
    --project-name $PROJECT_NAME \
    --region $AWS_REGION \
    --query 'build.id' \
    --output text)

echo "✅ Optimization build started: $BUILD_ID"
echo ""
echo "🔄 Build process:"
echo "1. ⏳ Building optimized container (5-10 minutes)"
echo "2. 📤 Pushing to ECR"
echo "3. 🚀 Ready for fast deployment"
echo ""
echo "📊 Monitor build progress:"
echo "aws codebuild batch-get-builds --ids $BUILD_ID --region $AWS_REGION"
echo ""
echo "🎯 Once complete, deploy with:"
echo "./deploy-optimized.sh"
