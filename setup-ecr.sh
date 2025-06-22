#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - ECR SETUP SCRIPT
# Sets up Elastic Container Registry for optimized deployments
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="645634482532"
REPOSITORY_NAME="alpha-pack-pro"
IMAGE_TAG="latest"

echo "🚀 Setting up Alpha Pack Pro ECR Repository..."

# Create ECR repository if it doesn't exist
echo "📦 Creating ECR repository..."
aws ecr create-repository \
    --repository-name $REPOSITORY_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    || echo "Repository already exists"

# Get ECR login token
echo "🔐 Getting ECR login token..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build optimized Docker image
echo "🏗️ Building optimized Alpha Pack Pro image..."
docker build -f Dockerfile.optimized -t $REPOSITORY_NAME:$IMAGE_TAG .

# Tag image for ECR
echo "🏷️ Tagging image for ECR..."
docker tag $REPOSITORY_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:$IMAGE_TAG

# Push image to ECR
echo "📤 Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:$IMAGE_TAG

# Get image URI
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:$IMAGE_TAG"

echo "✅ ECR setup complete!"
echo "📍 Image URI: $IMAGE_URI"
echo ""
echo "🎯 Next steps:"
echo "1. Update ECS task definition to use: $IMAGE_URI"
echo "2. Deploy optimized container (2-5 minute deployment)"
echo "3. Future deployments will be lightning fast!"
