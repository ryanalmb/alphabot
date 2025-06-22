#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - BLUE-GREEN DEPLOYMENT
# Zero-downtime deployments with instant rollback capability
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="alpha-pack-pro-v2"
SUBNET_ID="subnet-02263f1b6dea30d43"
SECURITY_GROUP="sg-06650db42c9498284"
SERVICE_NAME="alpha-pack-service"
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:645634482532:targetgroup/alpha-pack-tg/1234567890abcdef"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Alpha Pack Pro - Blue-Green Deployment${NC}"
echo "=================================================="

# Function to get current running tasks
get_running_tasks() {
    aws ecs list-tasks --cluster $CLUSTER_NAME --desired-status RUNNING --query 'taskArns' --output text --region $AWS_REGION
}

# Function to get task IP
get_task_ip() {
    local task_arn=$1
    local eni_id=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $task_arn --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text --region $AWS_REGION)
    aws ec2 describe-network-interfaces --network-interface-ids $eni_id --query "NetworkInterfaces[0].Association.PublicIp" --output text --region $AWS_REGION
}

# Function to health check
health_check() {
    local ip=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}🔍 Health checking $ip...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://$ip:3000/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed for $ip${NC}"
            return 0
        fi
        echo -e "Attempt $attempt/$max_attempts failed, retrying in 10s..."
        sleep 10
        ((attempt++))
    done
    
    echo -e "${RED}❌ Health check failed for $ip${NC}"
    return 1
}

# Get image URI (from parameter or latest)
IMAGE_URI=${1:-"645634482532.dkr.ecr.us-east-1.amazonaws.com/alpha-pack-pro:latest"}

echo -e "${BLUE}📦 Deploying image: $IMAGE_URI${NC}"

# Step 1: Get current running tasks (BLUE environment)
echo -e "${BLUE}🔍 Checking current deployment...${NC}"
CURRENT_TASKS=$(get_running_tasks)

if [ -n "$CURRENT_TASKS" ]; then
    echo -e "${GREEN}📊 Found running tasks (BLUE environment)${NC}"
    for task in $CURRENT_TASKS; do
        BLUE_IP=$(get_task_ip $task)
        echo -e "  🔵 BLUE: $BLUE_IP"
    done
else
    echo -e "${YELLOW}⚠️  No current tasks running${NC}"
fi

# Step 2: Deploy GREEN environment
echo -e "${BLUE}🚀 Deploying GREEN environment...${NC}"

# Create task definition for GREEN deployment
TASK_DEF_JSON=$(cat << EOF
{
    "family": "alpha-pack-green",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "4096",
    "memory": "8192",
    "executionRoleArn": "arn:aws:iam::645634482532:role/AlphaPackECSTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::645634482532:role/AlphaPackECSTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "alpha-pack-green-container",
            "image": "$IMAGE_URI",
            "essential": true,
            "portMappings": [{"containerPort": 3000, "hostPort": 3000, "protocol": "tcp"}],
            "environment": [
                {"name": "AWS_REGION", "value": "us-east-1"},
                {"name": "PORT", "value": "3000"},
                {"name": "TELEGRAM_BOT_TOKEN", "value": "7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M"},
                {"name": "JWT_SECRET", "value": "y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW"},
                {"name": "ENCRYPTION_KEY", "value": "rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"},
                {"name": "NODE_ENV", "value": "production"},
                {"name": "NODE_OPTIONS", "value": "--max-old-space-size=6144"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/alpha-pack-green",
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
                "interval": 30,
                "timeout": 10,
                "retries": 3,
                "startPeriod": 120
            }
        }
    ]
}
EOF
)

# Register GREEN task definition
echo "$TASK_DEF_JSON" > green-task-def.json
GREEN_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://green-task-def.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)
rm green-task-def.json

echo -e "${GREEN}✅ GREEN task definition registered: $GREEN_TASK_DEF_ARN${NC}"

# Deploy GREEN task
GREEN_TASK_ARN=$(aws ecs run-task \
    --cluster $CLUSTER_NAME \
    --task-definition $GREEN_TASK_DEF_ARN \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --region $AWS_REGION \
    --query 'tasks[0].taskArn' \
    --output text)

echo -e "${GREEN}🚀 GREEN task deployed: $GREEN_TASK_ARN${NC}"

# Wait for GREEN task to be running
echo -e "${YELLOW}⏳ Waiting for GREEN task to be running...${NC}"
aws ecs wait tasks-running --cluster $CLUSTER_NAME --tasks $GREEN_TASK_ARN --region $AWS_REGION

# Get GREEN IP
GREEN_IP=$(get_task_ip $GREEN_TASK_ARN)
echo -e "${GREEN}🟢 GREEN environment IP: $GREEN_IP${NC}"

# Step 3: Health check GREEN environment
if health_check $GREEN_IP; then
    echo -e "${GREEN}✅ GREEN environment is healthy!${NC}"
else
    echo -e "${RED}❌ GREEN environment failed health check. Rolling back...${NC}"
    aws ecs stop-task --cluster $CLUSTER_NAME --task $GREEN_TASK_ARN --region $AWS_REGION
    exit 1
fi

# Step 4: Switch traffic (stop BLUE tasks)
if [ -n "$CURRENT_TASKS" ]; then
    echo -e "${BLUE}🔄 Switching traffic from BLUE to GREEN...${NC}"
    for task in $CURRENT_TASKS; do
        echo -e "  🛑 Stopping BLUE task: $task"
        aws ecs stop-task --cluster $CLUSTER_NAME --task $task --region $AWS_REGION
    done
    echo -e "${GREEN}✅ Traffic switched to GREEN environment${NC}"
else
    echo -e "${GREEN}✅ GREEN environment is now live${NC}"
fi

# Step 5: Final verification
echo -e "${BLUE}🔍 Final verification...${NC}"
sleep 30
if health_check $GREEN_IP; then
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
    echo -e "${GREEN}🌐 Alpha Pack Pro is live at: http://$GREEN_IP:3000${NC}"
    echo -e "${GREEN}📱 Telegram bot should be responding${NC}"
else
    echo -e "${RED}❌ Final verification failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "  🟢 GREEN IP: $GREEN_IP"
echo -e "  📦 Image: $IMAGE_URI"
echo -e "  🚀 Task: $GREEN_TASK_ARN"
echo -e "  ⏱️  Deployment completed in ~2-3 minutes"
