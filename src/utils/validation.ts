import Joi from 'joi';
import { User, Pack, Trade, Competition } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// User validation schema
const userSchema = Joi.object({
  userId: Joi.string().optional(),
  telegramId: Joi.string().optional(),
  walletAddress: Joi.string().required().pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  username: Joi.string().required().min(3).max(50),
  email: Joi.string().email().optional(),
  packId: Joi.string().optional(),
  role: Joi.string().valid('member', 'pack_leader', 'moderator', 'admin').required(),
  stats: Joi.object({
    totalTrades: Joi.number().min(0).required(),
    totalVolume: Joi.number().min(0).required(),
    winRate: Joi.number().min(0).max(1).required(),
    profitLoss: Joi.number().required(),
    socialScore: Joi.number().min(0).required(),
    rank: Joi.number().min(0).required(),
    achievements: Joi.array().items(Joi.string()).required(),
  }).required(),
  preferences: Joi.object({
    riskTolerance: Joi.string().valid('low', 'medium', 'high').required(),
    tradingStyle: Joi.string().valid('conservative', 'moderate', 'aggressive').required(),
    notifications: Joi.object({
      tradingAlerts: Joi.boolean().required(),
      packUpdates: Joi.boolean().required(),
      competitionAlerts: Joi.boolean().required(),
      socialMentions: Joi.boolean().required(),
      priceAlerts: Joi.boolean().required(),
    }).required(),
    privacy: Joi.object({
      showStats: Joi.boolean().required(),
      showTrades: Joi.boolean().required(),
      allowPackInvites: Joi.boolean().required(),
      publicProfile: Joi.boolean().required(),
    }).required(),
  }).required(),
});

// Pack validation schema
const packSchema = Joi.object({
  packId: Joi.string().optional(),
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10).max(500),
  leaderId: Joi.string().optional(),
  members: Joi.array().items(Joi.string()).optional(),
  maxMembers: Joi.number().min(2).max(20).required(),
  status: Joi.string().valid('recruiting', 'active', 'competing', 'inactive', 'disbanded').required(),
  score: Joi.number().min(0).optional(),
  totalVolume: Joi.number().min(0).optional(),
  winRate: Joi.number().min(0).max(1).optional(),
  socialScore: Joi.number().min(0).optional(),
  competitionHistory: Joi.array().items(Joi.string()).optional(),
  treasury: Joi.object({
    totalValue: Joi.number().min(0).required(),
    tokens: Joi.array().items(Joi.object({
      token: Joi.string().required(),
      amount: Joi.number().min(0).required(),
      value: Joi.number().min(0).required(),
      percentage: Joi.number().min(0).max(100).required(),
      chain: Joi.string().valid('solana', 'ethereum', 'base', 'arbitrum').required(),
    })).required(),
    allocations: Joi.array().items(Joi.object({
      strategy: Joi.string().required(),
      percentage: Joi.number().min(0).max(100).required(),
      riskLevel: Joi.string().valid('low', 'medium', 'high').required(),
      expectedReturn: Joi.number().required(),
    })).required(),
    performance: Joi.object({
      dailyReturn: Joi.number().required(),
      weeklyReturn: Joi.number().required(),
      monthlyReturn: Joi.number().required(),
      totalReturn: Joi.number().required(),
      sharpeRatio: Joi.number().required(),
      maxDrawdown: Joi.number().required(),
    }).required(),
  }).required(),
  strategy: Joi.object({
    focus: Joi.string().valid('arbitrage', 'social', 'balanced').required(),
    riskLevel: Joi.string().valid('low', 'medium', 'high').required(),
    targetReturn: Joi.number().min(0).required(),
    maxDrawdown: Joi.number().min(0).max(100).required(),
    rebalanceFrequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
  }).required(),
});

// Trade validation schema
const tradeSchema = Joi.object({
  tradeId: Joi.string().optional(),
  userId: Joi.string().required(),
  packId: Joi.string().optional(),
  type: Joi.string().valid('spot', 'arbitrage', 'liquidity_provision', 'yield_farming').required(),
  fromToken: Joi.string().required().min(2).max(10),
  toToken: Joi.string().required().min(2).max(10),
  fromAmount: Joi.number().min(0).required(),
  toAmount: Joi.number().min(0).optional(),
  price: Joi.number().min(0).optional(),
  slippage: Joi.number().min(0).max(100).required(),
  fee: Joi.number().min(0).optional(),
  status: Joi.string().valid('pending', 'executing', 'completed', 'failed', 'cancelled').optional(),
  signature: Joi.string().optional(),
  blockNumber: Joi.number().optional(),
  timestamp: Joi.string().isoDate().optional(),
  chain: Joi.string().valid('solana', 'ethereum', 'base', 'arbitrum').required(),
});

// Competition validation schema
const competitionSchema = Joi.object({
  competitionId: Joi.string().optional(),
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10).max(1000),
  type: Joi.string().valid('trading_volume', 'profit_percentage', 'arbitrage_success', 'social_engagement', 'combined_score').required(),
  status: Joi.string().valid('upcoming', 'active', 'completed', 'cancelled').required(),
  startTime: Joi.string().isoDate().required(),
  endTime: Joi.string().isoDate().required(),
  participants: Joi.array().items(Joi.string()).optional(),
  leaderboard: Joi.array().items(Joi.object({
    packId: Joi.string().required(),
    packName: Joi.string().required(),
    score: Joi.number().min(0).required(),
    rank: Joi.number().min(1).required(),
    change: Joi.number().required(),
    members: Joi.number().min(1).required(),
  })).optional(),
  prizes: Joi.array().items(Joi.object({
    rank: Joi.number().min(1).required(),
    amount: Joi.number().min(0).required(),
    token: Joi.string().required(),
    description: Joi.string().required(),
  })).required(),
  rules: Joi.object({
    minPackSize: Joi.number().min(1).required(),
    maxPackSize: Joi.number().min(1).required(),
    tradingPairs: Joi.array().items(Joi.string()).required(),
    allowedChains: Joi.array().items(Joi.string().valid('solana', 'ethereum', 'base', 'arbitrum')).required(),
    scoringMethod: Joi.string().required(),
  }).required(),
  metrics: Joi.object({
    totalParticipants: Joi.number().min(0).required(),
    totalVolume: Joi.number().min(0).required(),
    averageScore: Joi.number().min(0).required(),
    topScore: Joi.number().min(0).required(),
    prizePool: Joi.number().min(0).required(),
  }).optional(),
});

// Validation functions
export function validateUser(user: Partial<User>): ValidationResult {
  const { error } = userSchema.validate(user, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message),
    };
  }
  
  return { isValid: true, errors: [] };
}

export function validatePack(pack: Partial<Pack>): ValidationResult {
  const { error } = packSchema.validate(pack, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message),
    };
  }
  
  return { isValid: true, errors: [] };
}

export function validateTrade(trade: Partial<Trade>): ValidationResult {
  const { error } = tradeSchema.validate(trade, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message),
    };
  }
  
  // Additional business logic validation
  const errors: string[] = [];
  
  if (trade.fromToken === trade.toToken) {
    errors.push('From token and to token cannot be the same');
  }
  
  if (trade.slippage && trade.slippage > 50) {
    errors.push('Slippage cannot exceed 50%');
  }
  
  if (trade.fromAmount && trade.fromAmount <= 0) {
    errors.push('From amount must be greater than 0');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateCompetition(competition: Partial<Competition>): ValidationResult {
  const { error } = competitionSchema.validate(competition, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message),
    };
  }
  
  // Additional validation
  const errors: string[] = [];
  
  if (competition.startTime && competition.endTime) {
    const start = new Date(competition.startTime);
    const end = new Date(competition.endTime);
    
    if (start >= end) {
      errors.push('End time must be after start time');
    }
    
    if (start <= new Date()) {
      errors.push('Start time must be in the future');
    }
  }
  
  if (competition.rules?.minPackSize && competition.rules?.maxPackSize) {
    if (competition.rules.minPackSize > competition.rules.maxPackSize) {
      errors.push('Minimum pack size cannot be greater than maximum pack size');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Wallet address validation
export function validateSolanaAddress(address: string): boolean {
  // Basic Solana address validation (base58, 32-44 characters)
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaAddressRegex.test(address);
}

export function validateEthereumAddress(address: string): boolean {
  // Basic Ethereum address validation (0x + 40 hex characters)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

// Token validation
export function validateTokenSymbol(symbol: string): boolean {
  // Token symbols should be 2-10 characters, alphanumeric
  const tokenRegex = /^[A-Z0-9]{2,10}$/;
  return tokenRegex.test(symbol.toUpperCase());
}

// Amount validation
export function validateAmount(amount: number, decimals: number = 18): ValidationResult {
  const errors: string[] = [];
  
  if (amount <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  if (amount > Number.MAX_SAFE_INTEGER) {
    errors.push('Amount is too large');
  }
  
  // Check decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > decimals) {
    errors.push(`Amount cannot have more than ${decimals} decimal places`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Risk validation
export function validateRiskParameters(
  riskLevel: 'low' | 'medium' | 'high',
  amount: number,
  maxDrawdown: number
): ValidationResult {
  const errors: string[] = [];
  
  // Risk level specific validations
  switch (riskLevel) {
    case 'low':
      if (maxDrawdown > 10) {
        errors.push('Low risk strategies cannot have max drawdown > 10%');
      }
      break;
    case 'medium':
      if (maxDrawdown > 25) {
        errors.push('Medium risk strategies cannot have max drawdown > 25%');
      }
      break;
    case 'high':
      if (maxDrawdown > 50) {
        errors.push('High risk strategies cannot have max drawdown > 50%');
      }
      break;
  }
  
  if (maxDrawdown < 0 || maxDrawdown > 100) {
    errors.push('Max drawdown must be between 0% and 100%');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Generic validation helper
export const validateRequest = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return { isValid: false, errors };
  }

  return { isValid: true, value };
};

// Trade execution schema
export const tradeExecuteSchema = Joi.object({
  type: Joi.string().valid('spot', 'arbitrage', 'liquidity_provision', 'yield_farming').required(),
  fromToken: Joi.string().required(),
  toToken: Joi.string().required(),
  fromAmount: Joi.number().positive().required(),
  slippage: Joi.number().min(0).max(50).required(),
  chain: Joi.string().valid('solana', 'ethereum', 'base', 'arbitrum').required(),
});

export default {
  validateUser,
  validatePack,
  validateTrade,
  validateCompetition,
  validateSolanaAddress,
  validateEthereumAddress,
  validateTokenSymbol,
  validateAmount,
  validateRiskParameters,
  validateRequest,
  tradeExecuteSchema,
};
