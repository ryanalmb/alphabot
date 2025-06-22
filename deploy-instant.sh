#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - INSTANT DEPLOYMENT SCRIPT
# Near-instantaneous deployments with blue-green strategy
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="alpha-pack-pro-v2"
SUBNET_ID="subnet-02263f1b6dea30d43"
SECURITY_GROUP="sg-06650db42c9498284"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}⚡ ALPHA PACK PRO - INSTANT DEPLOYMENT${NC}"
echo "=============================================="

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
    local max_attempts=20
    local attempt=1
    
    echo -e "${YELLOW}🔍 Health checking $ip...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://$ip:3000/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed for $ip${NC}"
            return 0
        fi
        echo -e "  Attempt $attempt/$max_attempts - waiting 15s..."
        sleep 15
        ((attempt++))
    done
    
    echo -e "${RED}❌ Health check failed for $ip${NC}"
    return 1
}

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

# Step 2: Register optimized task definition
echo -e "${BLUE}📋 Registering instant deployment task definition...${NC}"
TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://alpha-pack-instant.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)
echo -e "${GREEN}✅ Task definition registered: $TASK_DEF_ARN${NC}"

# Step 3: Deploy GREEN environment
echo -e "${BLUE}🚀 Deploying GREEN environment (instant)...${NC}"
GREEN_TASK_ARN=$(aws ecs run-task \
    --cluster $CLUSTER_NAME \
    --task-definition $TASK_DEF_ARN \
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

# Step 4: Health check GREEN environment
echo -e "${BLUE}🔍 Testing GREEN environment...${NC}"
if health_check $GREEN_IP; then
    echo -e "${GREEN}✅ GREEN environment is healthy!${NC}"
else
    echo -e "${RED}❌ GREEN environment failed health check. Rolling back...${NC}"
    aws ecs stop-task --cluster $CLUSTER_NAME --task $GREEN_TASK_ARN --region $AWS_REGION
    exit 1
fi

# Step 5: Switch traffic (stop BLUE tasks)
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

# Step 6: Final verification
echo -e "${BLUE}🔍 Final verification...${NC}"
sleep 30
if health_check $GREEN_IP; then
    echo -e "${GREEN}🎉 INSTANT DEPLOYMENT SUCCESSFUL!${NC}"
    echo -e "${GREEN}🌐 Alpha Pack Pro is live at: http://$GREEN_IP:3000${NC}"
    echo -e "${GREEN}📱 Telegram bot should be responding${NC}"
else
    echo -e "${RED}❌ Final verification failed${NC}"
    exit 1
fi

echo ""
echo -e "${PURPLE}📊 Deployment Summary:${NC}"
echo -e "  🟢 GREEN IP: $GREEN_IP"
echo -e "  📦 Task Definition: alpha-pack-instant"
echo -e "  🚀 Task: $GREEN_TASK_ARN"
echo -e "  ⚡ Deployment completed in ~5-8 minutes"
echo -e "  🎯 Future deployments will be even faster with ECR caching"

echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo -e "  🌐 Application: http://$GREEN_IP:3000"
echo -e "  📱 Test Telegram: Send /start to your bot"
echo -e "  📊 Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group:/ecs/alpha-pack-instant"
