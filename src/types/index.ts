// Core types for Alpha Pack application

export interface User {
  userId: string;
  telegramId?: string;
  walletAddress: string;
  username: string;
  email?: string;
  packId?: string;
  role: UserRole;
  stats: UserStats;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface Pack {
  packId: string;
  name: string;
  description: string;
  leaderId: string;
  members: string[];
  maxMembers: number;
  status: PackStatus;
  score: number;
  totalVolume: number;
  winRate: number;
  socialScore: number;
  competitionHistory: string[];
  treasury: PackTreasury;
  strategy: PackStrategy;
  createdAt: string;
  updatedAt: string;
}

export interface Competition {
  competitionId: string;
  name: string;
  description: string;
  type: CompetitionType;
  status: CompetitionStatus;
  startTime: string;
  endTime: string;
  participants: string[];
  leaderboard: LeaderboardEntry[];
  prizes: Prize[];
  rules: CompetitionRules;
  metrics: CompetitionMetrics;
  createdAt: string;
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
  signature?: string;
  blockNumber?: number;
  timestamp: string;
  chain: BlockchainNetwork;
}

export interface ArbitrageOpportunity {
  opportunityId: string;
  fromExchange: string;
  toExchange: string;
  token: string;
  buyPrice: number;
  sellPrice: number;
  profitMargin: number;
  volume: number;
  confidence: number;
  estimatedGas: number;
  expiresAt: string;
  chain: BlockchainNetwork;
}

export interface SocialPost {
  postId: string;
  userId: string;
  packId?: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls: string[];
  engagement: SocialEngagement;
  sentiment: SentimentAnalysis;
  viralityScore: number;
  timestamp: string;
}

// Enums
export enum UserRole {
  MEMBER = 'member',
  PACK_LEADER = 'pack_leader',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum PackStatus {
  RECRUITING = 'recruiting',
  ACTIVE = 'active',
  COMPETING = 'competing',
  INACTIVE = 'inactive',
  DISBANDED = 'disbanded',
}

export enum CompetitionType {
  TRADING_VOLUME = 'trading_volume',
  PROFIT_PERCENTAGE = 'profit_percentage',
  ARBITRAGE_SUCCESS = 'arbitrage_success',
  SOCIAL_ENGAGEMENT = 'social_engagement',
  COMBINED_SCORE = 'combined_score',
}

export enum CompetitionStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TradeType {
  SPOT = 'spot',
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVISION = 'liquidity_provision',
  YIELD_FARMING = 'yield_farming',
}

export enum TradeStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum BlockchainNetwork {
  SOLANA = 'solana',
  ETHEREUM = 'ethereum',
  BASE = 'base',
  ARBITRUM = 'arbitrum',
}

export enum SocialPlatform {
  TWITTER = 'twitter',
  TIKTOK = 'tiktok',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
}

// Nested interfaces
export interface UserStats {
  totalTrades: number;
  totalVolume: number;
  winRate: number;
  profitLoss: number;
  socialScore: number;
  rank: number;
  achievements: string[];
}

export interface UserPreferences {
  riskTolerance: 'low' | 'medium' | 'high';
  tradingStyle: 'conservative' | 'moderate' | 'aggressive';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  tradingAlerts: boolean;
  packUpdates: boolean;
  competitionAlerts: boolean;
  socialMentions: boolean;
  priceAlerts: boolean;
}

export interface PrivacySettings {
  showStats: boolean;
  showTrades: boolean;
  allowPackInvites: boolean;
  publicProfile: boolean;
}

export interface PackTreasury {
  totalValue: number;
  tokens: TokenHolding[];
  allocations: AllocationStrategy[];
  performance: TreasuryPerformance;
}

export interface TokenHolding {
  token: string;
  amount: number;
  value: number;
  percentage: number;
  chain: BlockchainNetwork;
}

export interface AllocationStrategy {
  strategy: string;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
}

export interface TreasuryPerformance {
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PackStrategy {
  focus: 'arbitrage' | 'social' | 'balanced';
  riskLevel: 'low' | 'medium' | 'high';
  targetReturn: number;
  maxDrawdown: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface LeaderboardEntry {
  packId: string;
  packName: string;
  score: number;
  rank: number;
  change: number;
  members: number;
}

export interface Prize {
  rank: number;
  amount: number;
  token: string;
  description: string;
}

export interface CompetitionRules {
  minPackSize: number;
  maxPackSize: number;
  tradingPairs: string[];
  allowedChains: BlockchainNetwork[];
  scoringMethod: string;
}

export interface CompetitionMetrics {
  totalParticipants: number;
  totalVolume: number;
  averageScore: number;
  topScore: number;
  prizePool: number;
}

export interface SocialEngagement {
  likes: number;
  shares: number;
  comments: number;
  views: number;
  clickThroughRate: number;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  emotions: EmotionScores;
  keywords: string[];
}

export interface EmotionScores {
  joy: number;
  anger: number;
  fear: number;
  sadness: number;
  surprise: number;
  trust: number;
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ML/AI types
export interface MLPrediction {
  type: 'arbitrage' | 'sentiment' | 'price' | 'social';
  confidence: number;
  prediction: any;
  features: Record<string, number>;
  timestamp: string;
}

export interface BedrockRequest {
  modelType: string;
  prompt: string;
  fallbackEndpoint?: string;
  parameters?: Record<string, any>;
}

export interface BedrockResponse {
  source: 'bedrock' | 'sagemaker' | 'heuristic';
  result: any;
  confidence?: number;
  processingTime: number;
}

// Telegram types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
}

// Event types for EventBridge
export interface AlphaPackEvent {
  eventType: string;
  source: string;
  data: any;
  timestamp: string;
  userId?: string;
  packId?: string;
}

export interface TradeEvent extends AlphaPackEvent {
  eventType: 'trade_executed' | 'trade_failed' | 'arbitrage_opportunity';
  data: Trade | ArbitrageOpportunity;
}

export interface SocialEvent extends AlphaPackEvent {
  eventType: 'post_created' | 'engagement_update' | 'viral_content';
  data: SocialPost;
}

export interface PackEvent extends AlphaPackEvent {
  eventType: 'pack_created' | 'member_joined' | 'member_left' | 'pack_disbanded';
  data: Pack;
}

export interface CompetitionEvent extends AlphaPackEvent {
  eventType: 'competition_started' | 'competition_ended' | 'leaderboard_updated';
  data: Competition;
}
