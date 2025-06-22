#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - INSTANT ROLLBACK SYSTEM
# Instantly rollback to previous working version
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="alpha-pack-pro-v2"
SUBNET_ID="subnet-02263f1b6dea30d43"
SECURITY_GROUP="sg-06650db42c9498284"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🔄 ALPHA PACK PRO - INSTANT ROLLBACK${NC}"
echo "======================================="

# Function to get task IP
get_task_ip() {
    local task_arn=$1
    local eni_id=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $task_arn --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text --region $AWS_REGION)
    aws ec2 describe-network-interfaces --network-interface-ids $eni_id --query "NetworkInterfaces[0].Association.PublicIp" --output text --region $AWS_REGION
}

# Function to health check
health_check() {
    local ip=$1
    local max_attempts=10
    local attempt=1
    
    echo -e "${YELLOW}🔍 Health checking $ip...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://$ip:3000/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed for $ip${NC}"
            return 0
        fi
        echo -e "  Attempt $attempt/$max_attempts - waiting 10s..."
        sleep 10
        ((attempt++))
    done
    
    echo -e "${RED}❌ Health check failed for $ip${NC}"
    return 1
}

# Step 1: Get current running tasks
echo -e "${BLUE}🔍 Checking current deployment...${NC}"
CURRENT_TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --desired-status RUNNING --query 'taskArns' --output text --region $AWS_REGION)

if [ -z "$CURRENT_TASKS" ]; then
    echo -e "${RED}❌ No running tasks found to rollback from${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  Current running tasks found - preparing rollback...${NC}"

# Step 2: Get previous task definition
echo -e "${BLUE}📋 Finding previous task definition...${NC}"

# Get the current task definition family and revision
CURRENT_TASK_DEF=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $CURRENT_TASKS --query 'tasks[0].taskDefinitionArn' --output text --region $AWS_REGION)
FAMILY=$(echo $CURRENT_TASK_DEF | cut -d'/' -f2 | cut -d':' -f1)
CURRENT_REVISION=$(echo $CURRENT_TASK_DEF | cut -d':' -f2)

echo -e "${BLUE}📦 Current: $FAMILY:$CURRENT_REVISION${NC}"

# Calculate previous revision
PREVIOUS_REVISION=$((CURRENT_REVISION - 1))

if [ $PREVIOUS_REVISION -lt 1 ]; then
    echo -e "${RED}❌ No previous revision available for rollback${NC}"
    echo -e "${YELLOW}💡 Deploying known working version instead...${NC}"
    ROLLBACK_TASK_DEF="alpha-pack-complete-ubuntu:17"
else
    ROLLBACK_TASK_DEF="$FAMILY:$PREVIOUS_REVISION"
fi

echo -e "${GREEN}🔄 Rolling back to: $ROLLBACK_TASK_DEF${NC}"

# Step 3: Deploy rollback version
echo -e "${BLUE}🚀 Deploying rollback version...${NC}"
ROLLBACK_TASK_ARN=$(aws ecs run-task \
    --cluster $CLUSTER_NAME \
    --task-definition $ROLLBACK_TASK_DEF \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --region $AWS_REGION \
    --query 'tasks[0].taskArn' \
    --output text)

echo -e "${GREEN}🚀 Rollback task deployed: $ROLLBACK_TASK_ARN${NC}"

# Wait for rollback task to be running
echo -e "${YELLOW}⏳ Waiting for rollback task to be running...${NC}"
aws ecs wait tasks-running --cluster $CLUSTER_NAME --tasks $ROLLBACK_TASK_ARN --region $AWS_REGION

# Get rollback IP
ROLLBACK_IP=$(get_task_ip $ROLLBACK_TASK_ARN)
echo -e "${GREEN}🔄 Rollback environment IP: $ROLLBACK_IP${NC}"

# Step 4: Health check rollback environment
echo -e "${BLUE}🔍 Testing rollback environment...${NC}"
if health_check $ROLLBACK_IP; then
    echo -e "${GREEN}✅ Rollback environment is healthy!${NC}"
else
    echo -e "${RED}❌ Rollback environment failed health check. Keeping current version...${NC}"
    aws ecs stop-task --cluster $CLUSTER_NAME --task $ROLLBACK_TASK_ARN --region $AWS_REGION
    exit 1
fi

# Step 5: Switch traffic (stop current tasks)
echo -e "${BLUE}🔄 Switching traffic to rollback version...${NC}"
for task in $CURRENT_TASKS; do
    echo -e "  🛑 Stopping current task: $task"
    aws ecs stop-task --cluster $CLUSTER_NAME --task $task --region $AWS_REGION
done

echo -e "${GREEN}✅ Traffic switched to rollback version${NC}"

# Step 6: Final verification
echo -e "${BLUE}🔍 Final verification...${NC}"
sleep 30
if health_check $ROLLBACK_IP; then
    echo -e "${GREEN}🎉 ROLLBACK SUCCESSFUL!${NC}"
    echo -e "${GREEN}🌐 Alpha Pack Pro rolled back to: http://$ROLLBACK_IP:3000${NC}"
    echo -e "${GREEN}📱 Telegram bot should be responding${NC}"
    
    # Send notification
    aws sns publish \
        --topic-arn "arn:aws:sns:us-east-1:645634482532:alpha-pack-alerts" \
        --message "Alpha Pack Pro successfully rolled back to $ROLLBACK_TASK_DEF" \
        --subject "Alpha Pack Pro - Rollback Successful" \
        --region $AWS_REGION 2>/dev/null || echo "SNS notification failed"
        
else
    echo -e "${RED}❌ Final verification failed${NC}"
    exit 1
fi

echo ""
echo -e "${PURPLE}📊 Rollback Summary:${NC}"
echo -e "  🔄 Rollback IP: $ROLLBACK_IP"
echo -e "  📦 Task Definition: $ROLLBACK_TASK_DEF"
echo -e "  🚀 Task: $ROLLBACK_TASK_ARN"
echo -e "  ⚡ Rollback completed in ~3-5 minutes"

echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo -e "  🌐 Application: http://$ROLLBACK_IP:3000"
echo -e "  📱 Test Telegram: Send /start to your bot"
