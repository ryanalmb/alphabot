#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - COMPLETE ECR OPTIMIZATION SETUP
# Eliminates rebuild time by pre-building containers in ECR
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="645634482532"
REPOSITORY_NAME="alpha-pack-pro"
BASE_REPOSITORY_NAME="alpha-pack-base"

echo "🚀 Setting up Complete Alpha Pack ECR Optimization..."

# Create base dependencies repository
echo "📦 Creating base dependencies ECR repository..."
aws ecr create-repository \
    --repository-name $BASE_REPOSITORY_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    || echo "Base repository already exists"

# Create main application repository
echo "📦 Creating main application ECR repository..."
aws ecr create-repository \
    --repository-name $REPOSITORY_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    || echo "Main repository already exists"

# Set lifecycle policies to manage storage costs
echo "🔄 Setting up lifecycle policies..."
cat > base-lifecycle-policy.json << 'EOF'
{
    "rules": [
        {
            "rulePriority": 1,
            "description": "Keep last 5 base images",
            "selection": {
                "tagStatus": "tagged",
                "tagPrefixList": ["base"],
                "countType": "imageCountMoreThan",
                "countNumber": 5
            },
            "action": {
                "type": "expire"
            }
        }
    ]
}
EOF

cat > main-lifecycle-policy.json << 'EOF'
{
    "rules": [
        {
            "rulePriority": 1,
            "description": "Keep last 10 application images",
            "selection": {
                "tagStatus": "tagged",
                "countType": "imageCountMoreThan",
                "countNumber": 10
            },
            "action": {
                "type": "expire"
            }
        },
        {
            "rulePriority": 2,
            "description": "Delete untagged images after 1 day",
            "selection": {
                "tagStatus": "untagged",
                "countType": "sinceImagePushed",
                "countUnit": "days",
                "countNumber": 1
            },
            "action": {
                "type": "expire"
            }
        }
    ]
}
EOF

aws ecr put-lifecycle-policy \
    --repository-name $BASE_REPOSITORY_NAME \
    --lifecycle-policy-text file://base-lifecycle-policy.json \
    --region $AWS_REGION

aws ecr put-lifecycle-policy \
    --repository-name $REPOSITORY_NAME \
    --lifecycle-policy-text file://main-lifecycle-policy.json \
    --region $AWS_REGION

echo "✅ ECR repositories and lifecycle policies configured!"
echo ""
echo "📍 Base Repository: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$BASE_REPOSITORY_NAME"
echo "📍 Main Repository: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME"
echo ""
echo "🎯 Next: Run build-base-image.sh to create cached base image"
