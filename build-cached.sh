#!/bin/bash

# Alpha Pack Cached Build Script
# Uses ECR for Docker layer caching to dramatically reduce build times

set -e

echo "🚀 Starting Alpha Pack cached build..."

# Configuration
ECR_REGISTRY="645634482532.dkr.ecr.us-east-1.amazonaws.com"
REPOSITORY_NAME="alpha-pack-pro"
IMAGE_TAG="latest"
CACHE_TAG="cache"
REGION="us-east-1"

# Full image names
IMAGE_URI="${ECR_REGISTRY}/${REPOSITORY_NAME}:${IMAGE_TAG}"
CACHE_URI="${ECR_REGISTRY}/${REPOSITORY_NAME}:${CACHE_TAG}"

echo "📦 Image URI: ${IMAGE_URI}"
echo "🗄️ Cache URI: ${CACHE_URI}"

# Authenticate Docker to ECR
echo "🔐 Authenticating to ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Pull existing cache if available
echo "⬇️ Pulling existing cache..."
docker pull ${CACHE_URI} || echo "No cache found, will build from scratch"
docker pull ${IMAGE_URI} || echo "No previous image found"

# Build with cache
echo "🔨 Building with cache..."
docker build \
  --file Dockerfile.cached \
  --cache-from ${CACHE_URI} \
  --cache-from ${IMAGE_URI} \
  --tag ${IMAGE_URI} \
  --tag ${CACHE_URI} \
  .

# Push both image and cache
echo "⬆️ Pushing image and cache..."
docker push ${IMAGE_URI}
docker push ${CACHE_URI}

echo "✅ Cached build complete!"
echo "📊 Image: ${IMAGE_URI}"
echo "🗄️ Cache: ${CACHE_URI}"

# Clean up local images to save space
echo "🧹 Cleaning up local images..."
docker rmi ${IMAGE_URI} ${CACHE_URI} || true

echo "🎉 Alpha Pack cached build finished successfully!"
