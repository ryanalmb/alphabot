#!/bin/bash

# =============================================================================
# ALPHA PACK PRO - MONITORING AND ALERTING SETUP
# Comprehensive monitoring with CloudWatch dashboards and alerts
# =============================================================================

set -e

AWS_REGION="us-east-1"
CLUSTER_NAME="alpha-pack-pro-v2"
SNS_TOPIC_NAME="alpha-pack-alerts"

echo "📊 Setting up Alpha Pack Pro Monitoring..."

# Create SNS topic for alerts
echo "📢 Creating SNS topic for alerts..."
SNS_TOPIC_ARN=$(aws sns create-topic --name $SNS_TOPIC_NAME --region $AWS_REGION --query 'TopicArn' --output text)
echo "✅ SNS Topic created: $SNS_TOPIC_ARN"

# Create CloudWatch dashboard
echo "📈 Creating CloudWatch dashboard..."
DASHBOARD_BODY=$(cat << 'EOF'
{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "CPUUtilization", "ServiceName", "alpha-pack-service", "ClusterName", "alpha-pack-pro-v2" ],
                    [ ".", "MemoryUtilization", ".", ".", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "us-east-1",
                "title": "ECS Resource Utilization",
                "period": 300
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", "alpha-pack-alb" ],
                    [ ".", "TargetResponseTime", ".", "." ],
                    [ ".", "HTTPCode_Target_2XX_Count", ".", "." ],
                    [ ".", "HTTPCode_Target_4XX_Count", ".", "." ],
                    [ ".", "HTTPCode_Target_5XX_Count", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "us-east-1",
                "title": "Application Load Balancer Metrics",
                "period": 300
            }
        },
        {
            "type": "log",
            "x": 0,
            "y": 6,
            "width": 24,
            "height": 6,
            "properties": {
                "query": "SOURCE '/ecs/alpha-pack-complete-ubuntu' | fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100",
                "region": "us-east-1",
                "title": "Recent Errors",
                "view": "table"
            }
        }
    ]
}
EOF
)

aws cloudwatch put-dashboard \
    --dashboard-name "AlphaPackPro" \
    --dashboard-body "$DASHBOARD_BODY" \
    --region $AWS_REGION

echo "✅ CloudWatch dashboard created"

# Create CloudWatch alarms
echo "🚨 Creating CloudWatch alarms..."

# High CPU alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "AlphaPackPro-HighCPU" \
    --alarm-description "Alpha Pack Pro high CPU utilization" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN \
    --dimensions Name=ServiceName,Value=alpha-pack-service Name=ClusterName,Value=$CLUSTER_NAME \
    --region $AWS_REGION

# High Memory alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "AlphaPackPro-HighMemory" \
    --alarm-description "Alpha Pack Pro high memory utilization" \
    --metric-name MemoryUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 85 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN \
    --dimensions Name=ServiceName,Value=alpha-pack-service Name=ClusterName,Value=$CLUSTER_NAME \
    --region $AWS_REGION

# Task stopped alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "AlphaPackPro-TaskStopped" \
    --alarm-description "Alpha Pack Pro task stopped unexpectedly" \
    --metric-name RunningTaskCount \
    --namespace AWS/ECS \
    --statistic Average \
    --period 60 \
    --threshold 1 \
    --comparison-operator LessThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions $SNS_TOPIC_ARN \
    --dimensions Name=ServiceName,Value=alpha-pack-service Name=ClusterName,Value=$CLUSTER_NAME \
    --region $AWS_REGION

echo "✅ CloudWatch alarms created"

# Create log insights queries
echo "🔍 Setting up Log Insights queries..."

# Create custom log group for optimized logs
aws logs create-log-group --log-group-name /ecs/alpha-pack-optimized --region $AWS_REGION || echo "Log group already exists"
aws logs create-log-group --log-group-name /ecs/alpha-pack-green --region $AWS_REGION || echo "Log group already exists"

echo "✅ Monitoring setup complete!"
echo ""
echo "📊 Monitoring Resources Created:"
echo "  📈 Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=AlphaPackPro"
echo "  🚨 SNS Topic: $SNS_TOPIC_ARN"
echo "  📋 Log Groups: /ecs/alpha-pack-complete-ubuntu, /ecs/alpha-pack-optimized, /ecs/alpha-pack-green"
echo ""
echo "🎯 Next Steps:"
echo "  1. Subscribe to SNS topic for email/SMS alerts"
echo "  2. Set up custom metrics for Telegram bot activity"
echo "  3. Configure log retention policies"
