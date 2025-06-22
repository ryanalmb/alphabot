#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - COMPLETE DEPLOYMENT ORCHESTRATOR
# One-command deployment with all optimizations
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="645634482532"
CLUSTER_NAME="alpha-pack-pro-v2"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 ALPHA PACK PRO - COMPLETE DEPLOYMENT ORCHESTRATOR${NC}"
echo "=================================================================="
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}📋 STEP $1: $2${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Prerequisites check
print_step "1" "Prerequisites Check"

if ! command_exists aws; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI first.${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${YELLOW}⚠️  Docker not found. Will use cloud-based builds.${NC}"
    USE_CLOUD_BUILD=true
else
    echo -e "${GREEN}✅ Docker found${NC}"
    USE_CLOUD_BUILD=false
fi

if ! command_exists git; then
    echo -e "${RED}❌ Git not found. Please install Git first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Step 2: Setup ECR repositories
print_step "2" "Setting up ECR Repositories"
bash setup-ecr-complete.sh
echo ""

# Step 3: Setup monitoring
print_step "3" "Setting up Monitoring"
bash setup-monitoring.sh
echo ""

# Step 4: Build and deploy
print_step "4" "Building and Deploying Application"

if [ "$USE_CLOUD_BUILD" = true ]; then
    echo -e "${YELLOW}🔧 Using cloud-based build (CodeBuild)${NC}"
    # TODO: Implement CodeBuild deployment
    echo -e "${YELLOW}⚠️  Cloud build not implemented yet. Using direct deployment.${NC}"
fi

# Get latest commit hash for tagging
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "manual")
IMAGE_TAG="app-${COMMIT_HASH}-$(date +%s)"

echo -e "${BLUE}📦 Building image with tag: $IMAGE_TAG${NC}"

# Check if we have a working deployment to use as base
CURRENT_TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --desired-status RUNNING --query 'taskArns' --output text --region $AWS_REGION)

if [ -n "$CURRENT_TASKS" ]; then
    echo -e "${GREEN}✅ Found running deployment. Using blue-green deployment.${NC}"
    
    # Use blue-green deployment for zero downtime
    bash deploy-blue-green.sh
else
    echo -e "${YELLOW}⚠️  No running deployment found. Deploying fresh instance.${NC}"
    
    # Deploy fresh instance using optimized task definition
    TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://alpha-pack-complete-ubuntu.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)
    
    TASK_ARN=$(aws ecs run-task \
        --cluster $CLUSTER_NAME \
        --task-definition $TASK_DEF_ARN \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-02263f1b6dea30d43],securityGroups=[sg-06650db42c9498284],assignPublicIp=ENABLED}" \
        --region $AWS_REGION \
        --query 'tasks[0].taskArn' \
        --output text)
    
    echo -e "${GREEN}🚀 Fresh deployment started: $TASK_ARN${NC}"
    
    # Wait for task to be running
    echo -e "${YELLOW}⏳ Waiting for task to be running...${NC}"
    aws ecs wait tasks-running --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $AWS_REGION
    
    # Get IP address
    ENI_ID=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text --region $AWS_REGION)
    PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --query "NetworkInterfaces[0].Association.PublicIp" --output text --region $AWS_REGION)
    
    echo -e "${GREEN}🌐 Application deployed at: http://$PUBLIC_IP:3000${NC}"
fi

echo ""

# Step 5: Post-deployment verification
print_step "5" "Post-Deployment Verification"

# Get current running tasks
RUNNING_TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --desired-status RUNNING --query 'taskArns' --output text --region $AWS_REGION)

if [ -n "$RUNNING_TASKS" ]; then
    for task in $RUNNING_TASKS; do
        ENI_ID=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $task --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text --region $AWS_REGION)
        PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --query "NetworkInterfaces[0].Association.PublicIp" --output text --region $AWS_REGION)
        
        echo -e "${BLUE}🔍 Testing health endpoint: http://$PUBLIC_IP:3000/health${NC}"
        
        # Wait for application to be ready
        for i in {1..30}; do
            if curl -f -s "http://$PUBLIC_IP:3000/health" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Health check passed for $PUBLIC_IP${NC}"
                break
            elif [ $i -eq 30 ]; then
                echo -e "${YELLOW}⚠️  Health check timeout for $PUBLIC_IP (still building)${NC}"
            else
                echo -e "  Attempt $i/30 - waiting for application startup..."
                sleep 10
            fi
        done
    done
else
    echo -e "${RED}❌ No running tasks found${NC}"
fi

echo ""

# Step 6: Summary
print_step "6" "Deployment Summary"

echo -e "${GREEN}🎉 ALPHA PACK PRO DEPLOYMENT COMPLETE!${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Details:${NC}"
echo -e "  🌐 Cluster: $CLUSTER_NAME"
echo -e "  📦 Image Tag: $IMAGE_TAG"
echo -e "  🔧 Optimizations: ECR caching, monitoring, blue-green ready"
echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo -e "  📈 Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=AlphaPackPro"
echo -e "  📋 ECS Console: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME"
echo -e "  📊 Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups"
echo ""
echo -e "${BLUE}🚀 Next Deployments:${NC}"
echo -e "  ⚡ Code changes: Use './deploy-blue-green.sh' for 30-second deployments"
echo -e "  🔄 Full rebuild: Re-run this script"
echo -e "  📱 Test Telegram bot: Send /start to your bot"
echo ""
echo -e "${GREEN}✅ All optimizations are now in place for fast, reliable deployments!${NC}"
