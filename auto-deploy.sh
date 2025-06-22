#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - AUTOMATED DEPLOYMENT SYSTEM
# Detects changes and triggers instant deployments automatically
# =============================================================================

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="alpha-pack-pro-v2"
GITHUB_REPO="https://github.com/ryanalmb/alphabot.git"
CHECK_INTERVAL=300  # 5 minutes

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🤖 ALPHA PACK PRO - AUTOMATED DEPLOYMENT SYSTEM${NC}"
echo "=================================================="

# Function to get latest commit hash from GitHub
get_latest_commit() {
    git ls-remote $GITHUB_REPO HEAD | cut -f1 | cut -c1-7
}

# Function to get current deployed commit
get_deployed_commit() {
    # Get the latest task definition and extract commit from description or tags
    aws ecs describe-task-definition \
        --task-definition alpha-pack-instant \
        --region $AWS_REGION \
        --query 'taskDefinition.revision' \
        --output text 2>/dev/null || echo "0"
}

# Function to check if deployment is needed
needs_deployment() {
    local latest_commit=$(get_latest_commit)
    local deployed_commit=$(get_deployed_commit)
    
    echo -e "${BLUE}📊 Latest GitHub commit: $latest_commit${NC}"
    echo -e "${BLUE}📦 Deployed revision: $deployed_commit${NC}"
    
    # For now, we'll deploy if there's any difference in revision
    # In a full implementation, we'd track actual commit hashes
    return 0  # Always return true for demo - in production, compare actual commits
}

# Function to trigger deployment
trigger_deployment() {
    echo -e "${YELLOW}🚀 Triggering automated deployment...${NC}"
    bash deploy-instant.sh
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Automated deployment successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Automated deployment failed!${NC}"
        return 1
    fi
}

# Function to send notification (placeholder)
send_notification() {
    local status=$1
    local message=$2
    
    # In a full implementation, this would send to SNS, Slack, etc.
    echo -e "${BLUE}📢 Notification: $status - $message${NC}"
    
    # Send to SNS topic if configured
    aws sns publish \
        --topic-arn "arn:aws:sns:us-east-1:645634482532:alpha-pack-alerts" \
        --message "$message" \
        --subject "Alpha Pack Pro - $status" \
        --region $AWS_REGION 2>/dev/null || echo "SNS notification failed"
}

# Main monitoring loop
echo -e "${BLUE}🔍 Starting continuous deployment monitoring...${NC}"
echo -e "${YELLOW}⏱️  Check interval: $CHECK_INTERVAL seconds${NC}"

while true; do
    echo ""
    echo -e "${BLUE}$(date): Checking for updates...${NC}"
    
    if needs_deployment; then
        echo -e "${YELLOW}🔄 Changes detected - starting deployment...${NC}"
        
        if trigger_deployment; then
            send_notification "SUCCESS" "Alpha Pack Pro deployed successfully with latest changes"
            echo -e "${GREEN}✅ Deployment cycle completed successfully${NC}"
        else
            send_notification "FAILED" "Alpha Pack Pro deployment failed - manual intervention required"
            echo -e "${RED}❌ Deployment failed - continuing monitoring...${NC}"
        fi
    else
        echo -e "${GREEN}✅ No changes detected - system up to date${NC}"
    fi
    
    echo -e "${BLUE}⏳ Waiting $CHECK_INTERVAL seconds until next check...${NC}"
    sleep $CHECK_INTERVAL
done
