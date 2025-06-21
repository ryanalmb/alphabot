'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  UserGroupIcon,
  TrophyIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  FireIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useWallet } from '@solana/wallet-adapter-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TradingChart } from '@/components/dashboard/TradingChart';
import { PackOverview } from '@/components/dashboard/PackOverview';
import { RecentTrades } from '@/components/dashboard/RecentTrades';
import { ArbitrageOpportunities } from '@/components/dashboard/ArbitrageOpportunities';
import { SocialFeed } from '@/components/dashboard/SocialFeed';
import { Leaderboard } from '@/components/dashboard/Leaderboard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useUserData } from '@/hooks/useUserData';
import { usePackData } from '@/hooks/usePackData';
import { useMarketData } from '@/hooks/useMarketData';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | '90D'>('7D');
  
  // Custom hooks for data fetching
  const { data: userData, isLoading: userLoading } = useUserData(publicKey?.toString());
  const { data: packData, isLoading: packLoading } = usePackData(userData?.packId);
  const { data: marketData, isLoading: marketLoading } = useMarketData();

  if (!connected) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <SparklesIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Connect your Solana wallet to access your Alpha Pack dashboard</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {userData?.username || 'Alpha Trader'}! 👋
            </h1>
            <p className="text-gray-400 mt-1">
              {packData ? `Pack: ${packData.name}` : 'Ready to join a pack?'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex bg-dark-800/50 rounded-lg p-1">
              {(['1D', '7D', '30D', '90D'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    timeframe === period
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Portfolio Value"
            value={`$${userData?.stats.totalVolume?.toLocaleString() || '0'}`}
            change={userData?.stats.profitLoss || 0}
            changeType={userData?.stats.profitLoss >= 0 ? 'positive' : 'negative'}
            icon={CurrencyDollarIcon}
            loading={userLoading}
          />
          <StatsCard
            title="Win Rate"
            value={`${userData?.stats.winRate || 0}%`}
            change={5.2}
            changeType="positive"
            icon={TrophyIcon}
            loading={userLoading}
          />
          <StatsCard
            title="Social Score"
            value={userData?.stats.socialScore?.toLocaleString() || '0'}
            change={12.8}
            changeType="positive"
            icon={SparklesIcon}
            loading={userLoading}
          />
          <StatsCard
            title="Pack Rank"
            value={`#${userData?.stats.rank || 'N/A'}`}
            change={-2}
            changeType="negative"
            icon={UserGroupIcon}
            loading={userLoading}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trading Chart */}
            <motion.div variants={itemVariants}>
              <TradingChart timeframe={timeframe} />
            </motion.div>

            {/* Pack Overview */}
            {packData && (
              <motion.div variants={itemVariants}>
                <PackOverview pack={packData} />
              </motion.div>
            )}

            {/* Recent Trades */}
            <motion.div variants={itemVariants}>
              <RecentTrades userId={publicKey?.toString()} />
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <QuickActions />
            </motion.div>

            {/* Arbitrage Opportunities */}
            <motion.div variants={itemVariants}>
              <ArbitrageOpportunities />
            </motion.div>

            {/* Leaderboard */}
            <motion.div variants={itemVariants}>
              <Leaderboard type="packs" limit={5} />
            </motion.div>

            {/* Social Feed */}
            <motion.div variants={itemVariants}>
              <SocialFeed limit={3} />
            </motion.div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Overview */}
          <motion.div variants={itemVariants} className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Market Overview</h3>
              <GlobeAltIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {marketData?.topTokens?.slice(0, 5).map((token, index) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-xs font-bold">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${token.price.toFixed(4)}</div>
                    <div className={`text-sm flex items-center ${
                      token.change24h >= 0 ? 'text-success-400' : 'text-error-400'
                    }`}>
                      {token.change24h >= 0 ? (
                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(token.change24h).toFixed(2)}%
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-400">
                  <BoltIcon className="w-8 h-8 mx-auto mb-2" />
                  <p>Loading market data...</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={itemVariants} className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Recent Activity</h3>
              <FireIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {[
                {
                  type: 'trade',
                  message: 'Executed SOL → USDC arbitrage',
                  profit: '+$127.50',
                  time: '2 minutes ago',
                  icon: BoltIcon,
                },
                {
                  type: 'social',
                  message: 'Your post went viral! 🔥',
                  profit: '+50 Social Score',
                  time: '1 hour ago',
                  icon: SparklesIcon,
                },
                {
                  type: 'pack',
                  message: 'Pack moved up 3 ranks',
                  profit: 'Rank #12',
                  time: '3 hours ago',
                  icon: TrophyIcon,
                },
                {
                  type: 'trade',
                  message: 'Liquidity provision rewards',
                  profit: '+$45.20',
                  time: '6 hours ago',
                  icon: CurrencyDollarIcon,
                },
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-dark-700/30 rounded-lg">
                  <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                    <activity.icon className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{activity.message}</div>
                    <div className="text-xs text-gray-400">{activity.time}</div>
                  </div>
                  <div className="text-sm font-medium text-success-400">
                    {activity.profit}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
