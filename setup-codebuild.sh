#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - AWS CODEBUILD SETUP FOR CLOUD BUILDS
# Sets up CodeBuild for building containers in the cloud without local Docker
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="645634482532"
PROJECT_NAME="alpha-pack-builder"
SERVICE_ROLE_NAME="AlphaPackCodeBuildRole"

echo "🏗️ Setting up AWS CodeBuild for Alpha Pack Pro..."

# Create CodeBuild service role
echo "🔐 Creating CodeBuild service role..."
TRUST_POLICY=$(cat << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

# Create the role
aws iam create-role \
    --role-name $SERVICE_ROLE_NAME \
    --assume-role-policy-document "$TRUST_POLICY" \
    --region $AWS_REGION || echo "Role already exists"

# Attach necessary policies
aws iam attach-role-policy \
    --role-name $SERVICE_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess \
    --region $AWS_REGION

aws iam attach-role-policy \
    --role-name $SERVICE_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser \
    --region $AWS_REGION

# Create custom policy for ECS and ECR
CUSTOM_POLICY=$(cat << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:GetAuthorizationToken",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecs:RegisterTaskDefinition",
                "ecs:RunTask",
                "ecs:DescribeTasks",
                "ecs:StopTask",
                "ecs:UpdateService",
                "ecs:DescribeServices",
                "iam:PassRole"
            ],
            "Resource": "*"
        }
    ]
}
EOF
)

aws iam put-role-policy \
    --role-name $SERVICE_ROLE_NAME \
    --policy-name AlphaPackCodeBuildPolicy \
    --policy-document "$CUSTOM_POLICY" \
    --region $AWS_REGION

# Create CodeBuild project
echo "🏗️ Creating CodeBuild project..."
PROJECT_CONFIG=$(cat << EOF
{
    "name": "$PROJECT_NAME",
    "description": "Alpha Pack Pro container builder",
    "source": {
        "type": "GITHUB",
        "location": "https://github.com/ryanalmb/alphabot.git",
        "buildspec": "buildspec.yml"
    },
    "artifacts": {
        "type": "NO_ARTIFACTS"
    },
    "environment": {
        "type": "LINUX_CONTAINER",
        "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
        "computeType": "BUILD_GENERAL1_LARGE",
        "privilegedMode": true,
        "environmentVariables": [
            {
                "name": "AWS_DEFAULT_REGION",
                "value": "$AWS_REGION"
            },
            {
                "name": "AWS_ACCOUNT_ID",
                "value": "$AWS_ACCOUNT_ID"
            },
            {
                "name": "IMAGE_REPO_NAME",
                "value": "alpha-pack-pro"
            },
            {
                "name": "BASE_REPO_NAME",
                "value": "alpha-pack-base"
            }
        ]
    },
    "serviceRole": "arn:aws:iam::$AWS_ACCOUNT_ID:role/$SERVICE_ROLE_NAME"
}
EOF
)

aws codebuild create-project \
    --cli-input-json "$PROJECT_CONFIG" \
    --region $AWS_REGION || echo "Project already exists"

echo "✅ CodeBuild setup complete!"
echo "📍 Project: $PROJECT_NAME"
echo "🔗 Console: https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME"
echo ""
echo "🎯 Next: Run 'bash trigger-build.sh' to build containers in the cloud"
