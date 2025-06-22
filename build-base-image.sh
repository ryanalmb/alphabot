#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - BUILD BASE IMAGE WITH CACHED DEPENDENCIES
# Creates a base image with all dependencies pre-installed for instant builds
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="645634482532"
BASE_REPOSITORY="alpha-pack-base"
PACKAGE_HASH=$(sha256sum package*.json | sha256sum | cut -d' ' -f1 | cut -c1-12)
BASE_TAG="base-${PACKAGE_HASH}"
BASE_IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$BASE_REPOSITORY:$BASE_TAG"

echo "🏗️ Building Alpha Pack Base Image with Cached Dependencies..."
echo "📦 Base Image URI: $BASE_IMAGE_URI"
echo "🔑 Package Hash: $PACKAGE_HASH"

# Check if base image already exists
echo "🔍 Checking if base image already exists..."
if aws ecr describe-images --repository-name $BASE_REPOSITORY --image-ids imageTag=$BASE_TAG --region $AWS_REGION >/dev/null 2>&1; then
    echo "✅ Base image already exists: $BASE_IMAGE_URI"
    echo "🚀 Skipping build - using cached base image"
    exit 0
fi

echo "🏗️ Base image not found - building new base image..."

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build base image using multi-stage Dockerfile
echo "🔨 Building base dependencies image..."
docker build --target base-dependencies -f Dockerfile.production -t $BASE_IMAGE_URI .

# Push base image to ECR
echo "📤 Pushing base image to ECR..."
docker push $BASE_IMAGE_URI

# Tag as latest base
echo "🏷️ Tagging as latest base..."
docker tag $BASE_IMAGE_URI $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$BASE_REPOSITORY:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$BASE_REPOSITORY:latest

echo "✅ Base image build complete!"
echo "📍 Base Image: $BASE_IMAGE_URI"
echo "🎯 This image contains all dependencies and will be reused for fast builds"
