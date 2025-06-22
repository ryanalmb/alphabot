'use client';

import React, { useState, useEffect } from 'react';
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
  CurrencyDollarIcon,
  EyeIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface MiniAppDashboardProps {
  user: any;
  webApp: any;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export function MiniAppDashboard({ user, webApp }: MiniAppDashboardProps) {
  const [stats, setStats] = useState({
    portfolioValue: 12847.50,
    dailyPnL: 347.20,
    winRate: 73.5,
    packRank: 8,
    socialScore: 2456,
    totalTrades: 127,
  });

  const [recentTrades] = useState([
    {
      id: 1,
      pair: 'SOL/USDC',
      type: 'BUY',
      amount: 15.5,
      price: 98.42,
      pnl: 127.50,
      time: '2m ago',
    },
    {
      id: 2,
      pair: 'ETH/USDC',
      type: 'SELL',
      amount: 0.8,
      price: 2341.20,
      pnl: -45.30,
      time: '15m ago',
    },
    {
      id: 3,
      pair: 'BTC/USDC',
      type: 'BUY',
      amount: 0.02,
      price: 43250.00,
      pnl: 89.75,
      time: '1h ago',
    },
  ]);

  const [opportunities] = useState([
    {
      id: 1,
      pair: 'SOL/USDC',
      exchange1: 'Raydium',
      exchange2: 'Orca',
      spread: 0.45,
      profit: 23.50,
      confidence: 95,
    },
    {
      id: 2,
      pair: 'BONK/SOL',
      exchange1: 'Jupiter',
      exchange2: 'Meteora',
      spread: 1.2,
      profit: 67.80,
      confidence: 88,
    },
  ]);

  useEffect(() => {
    // Configure main button for quick trade
    webApp?.MainButton.setParams({
      text: '⚡ Quick Trade',
      color: '#3b82f6',
      text_color: '#ffffff',
      is_active: true,
      is_visible: true,
    });

    webApp?.MainButton.onClick(() => {
      webApp?.HapticFeedback.impactOccurred('medium');
      webApp?.showPopup({
        title: 'Quick Trade',
        message: 'Select trading pair to execute instant trade',
        buttons: [
          { id: 'sol', type: 'default', text: 'SOL/USDC' },
          { id: 'eth', type: 'default', text: 'ETH/USDC' },
          { id: 'cancel', type: 'cancel', text: 'Cancel' },
        ],
      }, (buttonId) => {
        if (buttonId !== 'cancel') {
          webApp?.showAlert(`Executing ${buttonId.toUpperCase()}/USDC trade...`);
        }
      });
    });

    return () => {
      webApp?.MainButton.hide();
    };
  }, [webApp]);

  const handleQuickAction = (action: string) => {
    webApp?.HapticFeedback.selectionChanged();
    
    switch (action) {
      case 'trade':
        webApp?.showAlert('Opening trading interface...');
        break;
      case 'arbitrage':
        webApp?.showAlert('Scanning for arbitrage opportunities...');
        break;
      case 'pack':
        webApp?.showAlert('Loading pack dashboard...');
        break;
      case 'compete':
        webApp?.showAlert('Joining competition...');
        break;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 space-y-6"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className="text-center py-4">
        <h2 className="text-2xl font-bold mb-2">
          Welcome back, {user?.first_name || 'Alpha Trader'}! 🚀
        </h2>
        <p className="text-gray-400">Ready to hunt for alpha?</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
          <div className="flex items-center justify-between mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-primary-400" />
            <span className="text-xs text-gray-400">Portfolio</span>
          </div>
          <div className="text-lg font-bold">${stats.portfolioValue.toLocaleString()}</div>
          <div className="flex items-center text-xs">
            <ArrowTrendingUpIcon className="w-3 h-3 text-success-400 mr-1" />
            <span className="text-success-400">+${stats.dailyPnL}</span>
          </div>
        </div>

        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
          <div className="flex items-center justify-between mb-2">
            <TrophyIcon className="w-5 h-5 text-warning-400" />
            <span className="text-xs text-gray-400">Win Rate</span>
          </div>
          <div className="text-lg font-bold">{stats.winRate}%</div>
          <div className="text-xs text-gray-400">{stats.totalTrades} trades</div>
        </div>

        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
          <div className="flex items-center justify-between mb-2">
            <UserGroupIcon className="w-5 h-5 text-secondary-400" />
            <span className="text-xs text-gray-400">Pack Rank</span>
          </div>
          <div className="text-lg font-bold">#{stats.packRank}</div>
          <div className="text-xs text-gray-400">Alpha Wolves</div>
        </div>

        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
          <div className="flex items-center justify-between mb-2">
            <SparklesIcon className="w-5 h-5 text-accent-400" />
            <span className="text-xs text-gray-400">Social Score</span>
          </div>
          <div className="text-lg font-bold">{stats.socialScore.toLocaleString()}</div>
          <div className="text-xs text-gray-400">+127 today</div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleQuickAction('trade')}
            className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-left hover:from-primary-600 hover:to-primary-700 transition-all"
          >
            <BoltIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Quick Trade</div>
            <div className="text-xs opacity-80">Execute instant trades</div>
          </button>

          <button
            onClick={() => handleQuickAction('arbitrage')}
            className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-xl p-4 text-left hover:from-secondary-600 hover:to-secondary-700 transition-all"
          >
            <ChartBarIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Arbitrage</div>
            <div className="text-xs opacity-80">Find opportunities</div>
          </button>

          <button
            onClick={() => handleQuickAction('pack')}
            className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-4 text-left hover:from-accent-600 hover:to-accent-700 transition-all"
          >
            <UserGroupIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Pack Status</div>
            <div className="text-xs opacity-80">View pack performance</div>
          </button>

          <button
            onClick={() => handleQuickAction('compete')}
            className="bg-gradient-to-r from-success-500 to-success-600 rounded-xl p-4 text-left hover:from-success-600 hover:to-success-700 transition-all"
          >
            <TrophyIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Compete</div>
            <div className="text-xs opacity-80">Join competitions</div>
          </button>
        </div>
      </motion.div>

      {/* Recent Trades */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Recent Trades</h3>
          <button className="text-primary-400 text-sm">View All</button>
        </div>
        <div className="space-y-2">
          {recentTrades.map((trade) => (
            <div
              key={trade.id}
              className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    trade.type === 'BUY' ? 'bg-success-500' : 'bg-error-500'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">{trade.pair}</div>
                    <div className="text-xs text-gray-400">{trade.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium text-sm ${
                    trade.pnl >= 0 ? 'text-success-400' : 'text-error-400'
                  }`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl}
                  </div>
                  <div className="text-xs text-gray-400">
                    {trade.amount} @ ${trade.price}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Arbitrage Opportunities */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">🔥 Hot Opportunities</h3>
          <button className="text-primary-400 text-sm">Refresh</button>
        </div>
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-gradient-to-r from-warning-500/10 to-warning-600/10 rounded-lg p-3 border border-warning-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{opp.pair}</div>
                  <div className="text-xs text-gray-400">
                    {opp.exchange1} → {opp.exchange2}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-warning-400">
                    +${opp.profit}
                  </div>
                  <div className="text-xs text-gray-400">
                    {opp.spread}% spread
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success-500 rounded-full" />
                  <span className="text-xs text-gray-400">{opp.confidence}% confidence</span>
                </div>
                <button className="bg-warning-500 text-dark-900 px-3 py-1 rounded-md text-xs font-medium">
                  Execute
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
