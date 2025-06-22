#!/bin/bash

# Create ECS task definition with HTTPS support
echo "🔧 Creating HTTPS-enabled ECS task definition..."

# Create task definition JSON
cat > alpha-pack-https-task.json << 'EOF'
{
  "family": "alpha-pack-https",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::645634482532:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "alpha-pack-https-container",
      "image": "ubuntu:22.04",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        },
        {
          "containerPort": 443,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DUCKDNS_TOKEN",
          "value": "REPLACE_WITH_YOUR_TOKEN"
        }
      ],
      "command": [
        "/bin/bash",
        "-c",
        "apt-get update && apt-get install -y curl git nginx nodejs npm && curl https://get.acme.sh | sh && git clone https://github.com/ryanalmb/alphabot.git /app && cd /app && npm install && npm run build && cp nginx.conf /etc/nginx/sites-available/default && cp start-https.sh /start.sh && chmod +x /start.sh && /start.sh"
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alpha-pack-https",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Create log group
aws logs create-log-group --log-group-name /ecs/alpha-pack-https --region us-east-1

# Register task definition
aws ecs register-task-definition --cli-input-json file://alpha-pack-https-task.json --region us-east-1

echo "✅ HTTPS task definition created!"
echo "📝 Next: Update the DUCKDNS_TOKEN in the task definition and deploy"
