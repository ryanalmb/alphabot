# 🚀 Alpha Pack WSL Deployment - Step by Step

Since you have WSL set up, let's deploy Alpha Pack manually with these commands:

## 📋 **STEP 1: VERIFY WSL ENVIRONMENT**

Run these commands in your WSL terminal:

```bash
# Check if you're in WSL
cat /proc/version

# Check Node.js and npm
node --version
npm --version

# If Node.js is missing, install it:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 📋 **STEP 2: INSTALL DEPENDENCIES**

```bash
# Navigate to Alpha Pack directory
cd "/mnt/c/Users/user/Documents/augment-projects/alpha pack"

# Install dependencies
npm install --legacy-peer-deps

# Install AWS CDK globally
sudo npm install -g aws-cdk@latest

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

## 📋 **STEP 3: CONFIGURE AWS CREDENTIALS**

```bash
# Create AWS credentials
mkdir -p ~/.aws

cat > ~/.aws/credentials << 'EOF'
[default]
aws_access_key_id = AKIAZMUWQMFSP2UO5GF4
aws_secret_access_key = 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
region = us-east-1
EOF

cat > ~/.aws/config << 'EOF'
[default]
region = us-east-1
output = json
EOF

# Test AWS connection
aws sts get-caller-identity
```

## 📋 **STEP 4: DEPLOY INFRASTRUCTURE**

```bash
# Set environment variables
export AWS_ACCOUNT_ID=645634482532
export AWS_REGION=us-east-1

# Bootstrap CDK
npx cdk bootstrap aws://645634482532/us-east-1

# Deploy infrastructure (this will take 10-15 minutes)
npx cdk deploy --all --require-approval never
```

## 📋 **STEP 5: CONFIGURE SECRETS**

```bash
# Store Telegram bot token
aws secretsmanager create-secret \
  --name alphapack/telegram/bot-token \
  --secret-string '{"token":"7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M"}' \
  --region us-east-1

# Store Solana private key
aws secretsmanager create-secret \
  --name alphapack/solana/private-key \
  --secret-string '{"privateKey":"[219,191,67,133,185,3,248,213,160,248,146,201,170,180,0,223,28,171,83,88,128,182,176,74,219,210,234,210,25,111,155,39]","network":"devnet"}' \
  --region us-east-1

# Store API keys
aws secretsmanager create-secret \
  --name alphapack/api/keys \
  --secret-string '{"ethereum":"https://mainnet.infura.io/v3/40e6a71e34f647bcb0d83c7d55e808ad","base":"https://mainnet.base.org","arbitrum":"https://arb1.arbitrum.io/rpc","jwt":"y63RO6mBKLJtBG0b9D8dmAdy8QgaMJsW","encryption":"rmkhfTLaCAWjfCog67q9uHhPMaCuWzfO"}' \
  --region us-east-1
```

## 📋 **STEP 6: GET API GATEWAY URL**

```bash
# Get the API Gateway URL from CloudFormation
API_URL=$(aws cloudformation describe-stacks \
  --stack-name AlphaPack-Application-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text \
  --region us-east-1)

echo "API Gateway URL: $API_URL"
```

## 📋 **STEP 7: CONFIGURE TELEGRAM WEBHOOK**

```bash
# Set Telegram webhook (replace $API_URL with actual URL from step 6)
curl -X POST "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$API_URL/api/v1/telegram/webhook\"}"

# Verify webhook
curl "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/getWebhookInfo"
```

## 📋 **STEP 8: TEST DEPLOYMENT**

```bash
# Test API health
curl "$API_URL/api/v1/health"

# Test Telegram bot
curl "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/getMe"
```

## 📋 **STEP 9: TEST TELEGRAM BOT**

1. Open Telegram
2. Search for your bot: `@YourBotName` (or use the token to find it)
3. Send `/start` command
4. You should get a response!

---

## 🚨 **TROUBLESHOOTING**

### **If CDK deployment fails:**
```bash
# Check CDK version
npx cdk --version

# Try deploying one stack at a time
npx cdk deploy AlphaPack-Infrastructure-prod
npx cdk deploy AlphaPack-Security-prod
npx cdk deploy AlphaPack-Application-prod
```

### **If Telegram webhook fails:**
```bash
# Check if API Gateway is deployed
aws apigateway get-rest-apis --region us-east-1

# Manually set webhook with correct URL
curl -X POST "https://api.telegram.org/bot7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M/setWebhook" \
  -d "url=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/v1/telegram/webhook"
```

### **If bot doesn't respond:**
```bash
# Check CloudWatch logs
aws logs describe-log-groups --region us-east-1 | grep alphapack

# Check Lambda functions
aws lambda list-functions --region us-east-1 | grep alphapack
```

---

## 🎯 **EXPECTED RESULTS**

After successful deployment:

1. ✅ **AWS Infrastructure** - All services running
2. ✅ **API Gateway** - REST endpoints active
3. ✅ **Lambda Functions** - Processing requests
4. ✅ **DynamoDB** - Database tables created
5. ✅ **Secrets Manager** - All keys stored
6. ✅ **Telegram Bot** - Responding to messages

---

## 🚀 **READY TO GO!**

Once these steps complete successfully, your Alpha Pack platform will be fully operational with:

- **Pack vs Pack Competition** system
- **AI-powered arbitrage detection** 
- **Cross-chain trading** support
- **Telegram bot interface**
- **Social rewards** system
- **Enterprise AWS infrastructure**

**Run these commands in your WSL terminal and let me know if you encounter any issues!** 🚀
