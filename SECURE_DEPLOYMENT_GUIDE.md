# 🔒 Alpha Pack Pro - Secure Deployment Guide

This guide shows you how to deploy Alpha Pack Pro safely without exposing your credentials in git history.

## 🛡️ **Security Approach**

Alpha Pack Pro uses multiple layers of security to protect your credentials:

1. **`.gitignore`** - Prevents credential files from being committed
2. **Environment Variables** - Credentials loaded from your environment
3. **Local Config Files** - JSON files that stay on your machine only
4. **AWS Secrets Manager** - Secure cloud storage for production secrets

## 🚀 **Quick Start - Secure Deployment**

### **Option 1: Using Local Config File (Recommended)**

1. **Copy the example config:**
   ```bash
   cp deploy-config.example.json deploy-config.json
   ```

2. **Edit `deploy-config.json` with your credentials:**
   ```json
   {
     "aws": {
       "accessKeyId": "AKIAXXXXXXXXXXXXXXXX",
       "secretAccessKey": "your-secret-key-here",
       "region": "us-east-1",
       "accountId": "123456789012"
     },
     "telegram": {
       "botToken": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
     },
     "solana": {
       "privateKey": "[1,2,3,4,5...]"
     }
   }
   ```

3. **Run secure deployment:**
   ```bash
   chmod +x deploy-secure.sh
   ./deploy-secure.sh
   ```

### **Option 2: Using Environment Variables**

1. **Set environment variables:**
   ```bash
   export AWS_ACCESS_KEY_ID="AKIAXXXXXXXXXXXXXXXX"
   export AWS_SECRET_ACCESS_KEY="your-secret-key-here"
   export AWS_DEFAULT_REGION="us-east-1"
   export AWS_ACCOUNT_ID="123456789012"
   export TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
   export SOLANA_PRIVATE_KEY="[1,2,3,4,5...]"
   ```

2. **Run secure deployment:**
   ```bash
   chmod +x deploy-secure.sh
   ./deploy-secure.sh
   ```

## 📋 **What You Need**

### **Required Credentials:**
- **AWS Access Key ID** - From AWS IAM console
- **AWS Secret Access Key** - From AWS IAM console  
- **AWS Account ID** - Your 12-digit AWS account number

### **Optional Credentials:**
- **Telegram Bot Token** - From @BotFather on Telegram
- **Solana Private Key** - Your Solana wallet private key
- **Infura Project ID** - For Ethereum RPC access
- **OpenAI API Key** - For enhanced AI features

## 🔧 **Getting Your Credentials**

### **AWS Credentials:**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user with programmatic access
3. Attach policies: `AdministratorAccess` (for deployment)
4. Save the Access Key ID and Secret Access Key

### **Telegram Bot Token:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Save the bot token (format: `1234567890:ABCdef...`)

### **Solana Private Key:**
1. Use Solana CLI: `solana-keygen new`
2. Or use Phantom wallet export feature
3. Format as array: `[1,2,3,4,5...]` or base64 string

## 🛡️ **Security Best Practices**

### **✅ DO:**
- Use the `deploy-config.json` file (it's gitignored)
- Set environment variables in your shell
- Use AWS Secrets Manager for production
- Rotate credentials regularly
- Use least-privilege IAM policies

### **❌ DON'T:**
- Commit credentials to git
- Share credential files
- Use root AWS credentials
- Hardcode secrets in source code
- Use production keys for testing

## 🔍 **File Security Status**

### **Safe Files (No Secrets):**
- ✅ All source code files
- ✅ Documentation files  
- ✅ Configuration templates (`.example` files)
- ✅ Deployment scripts (use variables only)

### **Protected Files (Gitignored):**
- 🔒 `deploy-config.json` - Your actual credentials
- 🔒 `.env.production` - Environment variables
- 🔒 `.aws/` - AWS CLI credentials
- 🔒 `*.key`, `*.pem` - Private keys

## 🚀 **Deployment Options**

### **1. Local Development:**
```bash
# Use development environment
cp deploy-config.example.json deploy-config.json
# Edit with dev credentials
./deploy-secure.sh
```

### **2. CI/CD Pipeline:**
```bash
# Use environment variables in CI
export AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }}
export AWS_SECRET_ACCESS_KEY=${{ secrets.AWS_SECRET_ACCESS_KEY }}
./deploy-secure.sh
```

### **3. Production Deployment:**
```bash
# Use production config file
cp deploy-config.example.json deploy-config.production.json
# Edit with production credentials
CONFIG_FILE=deploy-config.production.json ./deploy-secure.sh
```

## 🔧 **Troubleshooting**

### **"AWS credentials not found" Error:**
- Check your `deploy-config.json` file exists and has correct format
- Verify environment variables are set: `echo $AWS_ACCESS_KEY_ID`
- Test AWS CLI: `aws sts get-caller-identity`

### **"Telegram bot token invalid" Error:**
- Verify token format: `1234567890:ABCdef...`
- Test manually: `curl "https://api.telegram.org/botYOUR_TOKEN/getMe"`

### **"Permission denied" Error:**
- Make script executable: `chmod +x deploy-secure.sh`
- Check AWS IAM permissions
- Verify account ID is correct

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all credentials are correct
3. Test individual components (AWS CLI, Telegram API)
4. Check AWS CloudWatch logs for detailed errors

## 🎯 **Next Steps**

After successful deployment:
1. Test your Telegram bot
2. Monitor AWS CloudWatch logs
3. Set up domain name (optional)
4. Configure additional features
5. Scale as needed

**Your Alpha Pack Pro platform is now securely deployed! 🚀**
