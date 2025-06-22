#!/bin/bash

# Create CodeBuild project for Alpha Pack cached builds

echo "Creating CodeBuild project for Alpha Pack..."

# Create the CodeBuild project
aws codebuild create-project \
  --name "alpha-pack-cached-build" \
  --description "Alpha Pack cached Docker build with ECR" \
  --source '{
    "type": "GITHUB",
    "location": "https://github.com/ryanalmb/alphabot.git",
    "buildspec": "buildspec-cached.yml"
  }' \
  --artifacts '{
    "type": "NO_ARTIFACTS"
  }' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "AWS_DEFAULT_REGION",
        "value": "us-east-1"
      },
      {
        "name": "AWS_ACCOUNT_ID",
        "value": "645634482532"
      },
      {
        "name": "IMAGE_REPO_NAME",
        "value": "alpha-pack-pro"
      }
    ]
  }' \
  --service-role "arn:aws:iam::645634482532:role/codebuild-service-role" \
  --region us-east-1

echo "CodeBuild project created successfully!"
