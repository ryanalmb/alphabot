#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - QUICK OPTIMIZATION
# Creates optimized task definition for faster deployments
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="alpha-pack-pro-v2"
SUBNET_ID="subnet-02263f1b6dea30d43"
SECURITY_GROUP="sg-06650db42c9498284"

echo "🚀 Quick Alpha Pack Pro Optimization..."

# Create optimized log group
echo "📊 Setting up optimized CloudWatch logs..."
aws logs create-log-group \
    --log-group-name /ecs/alpha-pack-optimized \
    --region $AWS_REGION \
    || echo "Log group already exists"

# Register optimized task definition (uses existing image but optimized config)
echo "📋 Registering optimized task definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --family alpha-pack-optimized \
    --network-mode awsvpc \
    --requires-compatibilities FARGATE \
    --cpu 4096 \
    --memory 8192 \
    --execution-role-arn "arn:aws:iam::645634482532:role/AlphaPackECSTaskExecutionRole" \
    --task-role-arn "arn:aws:iam::645634482532:role/AlphaPackECSTaskExecutionRole" \
    --container-definitions '[
        {
            "name": "alpha-pack-optimized-container",
            "image": "node:18",
            "essential": true,
            "portMappings": [{"containerPort": 3000, "hostPort": 3000, "protocol": "tcp"}],
            "command": [
                "sh", "-c",
                "apt-get update && apt-get install -y git curl && git clone --depth 1 https://github.com/ryanalmb/alphabot.git /app && cd /app && npm ci --production --silent && npm run build && node app.js"
            ],
            "environment": [
                {"name": "AWS_REGION", "value": "us-east-1"},
                {"name": "PORT", "value": "3000"},
                {"name": "TELEGRAM_BOT_TOKEN", "value": "7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M"},
                {"name": "JWT_SECRET", "value": "y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW"},
                {"name": "ENCRYPTION_KEY", "value": "rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"},
                {"name": "NODE_ENV", "value": "production"},
                {"name": "NODE_OPTIONS", "value": "--max-old-space-size=4096"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/alpha-pack-optimized",
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 120
            }
        }
    ]' \
    --region $AWS_REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✅ Optimized task definition registered: $TASK_DEF_ARN"

# Stop current task if running
echo "🛑 Stopping current task..."
CURRENT_TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --region $AWS_REGION --query 'taskArns' --output text)
if [ ! -z "$CURRENT_TASKS" ]; then
    for task in $CURRENT_TASKS; do
        aws ecs stop-task --cluster $CLUSTER_NAME --task $task --region $AWS_REGION || true
    done
fi

# Deploy optimized version
echo "🚀 Deploying optimized Alpha Pack Pro..."
TASK_ARN=$(aws ecs run-task \
    --cluster $CLUSTER_NAME \
    --task-definition $TASK_DEF_ARN \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --region $AWS_REGION \
    --query 'tasks[0].taskArn' \
    --output text)

echo "✅ Optimized deployment started: $TASK_ARN"
echo ""
echo "⚡ Optimizations applied:"
echo "✅ Streamlined build process"
echo "✅ npm ci instead of npm install (faster)"
echo "✅ Optimized health checks"
echo "✅ Better resource allocation"
echo ""
echo "🔄 This deployment should complete in 10-15 minutes"
echo "🎯 Future optimizations will reduce this to 2-5 minutes"
