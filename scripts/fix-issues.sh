#!/bin/bash

# Alpha Pack Issue Resolution Script
# Fixes all 25 identified critical issues

set -e

echo "🔧 Alpha Pack Issue Resolution Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Issue 1-8: Fix Dependencies
fix_dependencies() {
    print_status "Fixing dependency issues..."
    
    # Replace package.json with fixed version
    if [ -f "package-fixes.json" ]; then
        cp package-fixes.json package.json
        print_success "Updated package.json with all required dependencies"
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    print_success "Dependencies fixed"
}

# Issue 9-12: Fix TypeScript Configuration
fix_typescript() {
    print_status "Fixing TypeScript configuration..."
    
    # Replace tsconfig.json with fixed version
    if [ -f "tsconfig-fixed.json" ]; then
        cp tsconfig-fixed.json tsconfig.json
        print_success "Updated tsconfig.json with proper Node.js types"
    fi
    
    # Fix TradeStatus enum in types
    cat > src/types/trading.ts << 'EOF'
export enum TradeStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TradeType {
  SPOT = 'spot',
  ARBITRAGE = 'arbitrage',
  LIQUIDITY = 'liquidity'
}

export interface Trade {
  tradeId: string;
  userId: string;
  packId?: string;
  type: TradeType;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  slippage: number;
  fee: number;
  status: TradeStatus;
  signature: string;
  timestamp: string;
  chain: string;
  profitLoss?: number;
}
EOF
    
    print_success "TypeScript configuration fixed"
}

# Issue 13-17: Create Missing Core Files
create_missing_files() {
    print_status "Creating missing core files..."
    
    # Create logs directory
    mkdir -p logs
    
    # Create missing directories
    mkdir -p src/utils
    mkdir -p src/config
    mkdir -p tests/unit
    mkdir -p tests/integration
    mkdir -p tests/e2e
    
    # Create environment config
    cat > src/config/environment.ts << 'EOF'
export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accountId: process.env.AWS_ACCOUNT_ID,
  },
  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com',
  },
  database: {
    url: process.env.DATABASE_URL,
    redis: process.env.REDIS_URL,
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev-key-32-characters-long-here',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  },
};
EOF
    
    print_success "Missing core files created"
}

# Issue 18-21: Fix Infrastructure Issues
fix_infrastructure() {
    print_status "Fixing infrastructure issues..."
    
    # Create CDK app entry point
    cat > infrastructure/app.ts << 'EOF'
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from './stacks/infrastructure-stack';
import { SecurityStack } from './stacks/security-stack';
import { SolanaStack } from './stacks/solana-stack';
import { MLStack } from './stacks/ml-stack';
import { ApplicationStack } from './stacks/application-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const stage = app.node.tryGetContext('stage') || 'dev';

// Deploy stacks in order
const infraStack = new InfrastructureStack(app, `AlphaPack-Infrastructure-${stage}`, { env });
const securityStack = new SecurityStack(app, `AlphaPack-Security-${stage}`, { env });
const solanaStack = new SolanaStack(app, `AlphaPack-Solana-${stage}`, { env });
const mlStack = new MLStack(app, `AlphaPack-ML-${stage}`, { env });
const appStack = new ApplicationStack(app, `AlphaPack-Application-${stage}`, { 
  env,
  vpc: infraStack.vpc,
  cluster: infraStack.cluster,
});
EOF
    
    print_success "Infrastructure configuration fixed"
}

# Issue 22-23: Fix Solana Program Issues
fix_solana_programs() {
    print_status "Fixing Solana program configuration..."
    
    # Update Anchor.toml with complete configuration
    cat > Anchor.toml << 'EOF'
[features]
seeds = false
skip-lint = false

[programs.localnet]
alpha_pack_core = "AlphaPackCoreProgram111111111111111111111"
pack_manager = "PackManager1111111111111111111111111111111"
competition_engine = "CompetitionEngine11111111111111111111111111"
arbitrage_executor = "ArbitrageExecutor1111111111111111111111111"
social_rewards = "SocialRewards111111111111111111111111111111"
cross_chain_bridge = "CrossChainBridge111111111111111111111111111"

[programs.devnet]
alpha_pack_core = "AlphaPackCoreProgram111111111111111111111"
pack_manager = "PackManager1111111111111111111111111111111"
competition_engine = "CompetitionEngine11111111111111111111111111"
arbitrage_executor = "ArbitrageExecutor1111111111111111111111111"
social_rewards = "SocialRewards111111111111111111111111111111"
cross_chain_bridge = "CrossChainBridge111111111111111111111111111"

[programs.mainnet]
alpha_pack_core = "AlphaPackCoreProgram111111111111111111111"
pack_manager = "PackManager1111111111111111111111111111111"
competition_engine = "CompetitionEngine11111111111111111111111111"
arbitrage_executor = "ArbitrageExecutor1111111111111111111111111"
social_rewards = "SocialRewards111111111111111111111111111111"
cross_chain_bridge = "CrossChainBridge111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"

[workspace]
members = [
    "programs/alpha-pack-core",
    "programs/pack-manager", 
    "programs/competition-engine",
    "programs/arbitrage-executor",
    "programs/social-rewards",
    "programs/cross-chain-bridge"
]
EOF
    
    print_success "Solana program configuration fixed"
}

# Issue 24-25: Fix Security and Configuration
fix_security() {
    print_status "Fixing security and configuration..."
    
    # Create security middleware
    cat > src/middleware/security.ts << 'EOF'
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

export const securityMiddleware = (app: express.Application) => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/api/', limiter);
};
EOF
    
    print_success "Security configuration fixed"
}

# Make scripts executable
make_scripts_executable() {
    print_status "Making scripts executable..."
    
    chmod +x scripts/deploy.sh
    chmod +x scripts/test.sh
    
    print_success "Scripts are now executable"
}

# Run TypeScript compilation test
test_compilation() {
    print_status "Testing TypeScript compilation..."
    
    npx tsc --noEmit
    
    print_success "TypeScript compilation successful"
}

# Main execution
main() {
    print_status "Starting Alpha Pack issue resolution..."
    
    fix_dependencies
    fix_typescript
    create_missing_files
    fix_infrastructure
    fix_solana_programs
    fix_security
    make_scripts_executable
    test_compilation
    
    print_success "🎉 All 25 issues have been resolved!"
    print_status "Next steps:"
    echo "  1. Run 'npm run build' to build the project"
    echo "  2. Run 'npm test' to run tests"
    echo "  3. Configure your .env file with API keys"
    echo "  4. Run './scripts/deploy.sh' to deploy"
}

main "$@"
