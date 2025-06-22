'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon,
  TrophyIcon,
  ChartBarIcon,
  FireIcon,
  SparklesIcon,
  BoltIcon,

  StarIcon,
} from '@heroicons/react/24/outline';

interface MiniAppPackProps {
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

export function MiniAppPack({ user, webApp }: MiniAppPackProps) {
  const [currentPack] = useState({
    id: 'alpha-wolves',
    name: 'Alpha Wolves 🐺',
    rank: 8,
    members: 47,
    totalValue: 2847392.50,
    dailyPnL: 12847.30,
    winRate: 73.5,
    strategy: 'Aggressive DeFi',
    leader: 'CryptoWolf',
    joinedDate: '2024-01-15',
    level: 'Elite',
    badges: ['🏆 Top 10', '🔥 Hot Streak', '⚡ Speed Trader'],
  });

  const [packMembers] = useState([
    {
      id: 1,
      username: 'CryptoWolf',
      role: 'Leader',
      contribution: 347892.50,
      trades: 156,
      winRate: 78.2,
      isOnline: true,
    },
    {
      id: 2,
      username: 'DeFiHunter',
      role: 'Co-Leader',
      contribution: 298473.20,
      trades: 134,
      winRate: 71.6,
      isOnline: true,
    },
    {
      id: 3,
      username: 'AlphaSeeker',
      role: 'Member',
      contribution: 189234.80,
      trades: 89,
      winRate: 69.4,
      isOnline: false,
    },
    {
      id: 4,
      username: user?.username || 'You',
      role: 'Member',
      contribution: 127845.60,
      trades: 67,
      winRate: 73.1,
      isOnline: true,
      isCurrentUser: true,
    },
  ]);

  const [packLeaderboard] = useState([
    { rank: 1, name: 'Solana Sharks 🦈', value: 4892347.20, change: 8.7 },
    { rank: 2, name: 'DeFi Dragons 🐉', value: 4234891.50, change: 6.2 },
    { rank: 3, name: 'Crypto Titans ⚡', value: 3847293.80, change: 5.9 },
    { rank: 4, name: 'Moon Hunters 🌙', value: 3456782.30, change: 4.1 },
    { rank: 5, name: 'Alpha Bulls 🐂', value: 3298473.90, change: 3.8 },
    { rank: 6, name: 'Yield Farmers 🌾', value: 3147829.60, change: 2.9 },
    { rank: 7, name: 'Flash Traders ⚡', value: 2984736.40, change: 2.1 },
    { rank: 8, name: 'Alpha Wolves 🐺', value: 2847392.50, change: 1.8, isCurrentPack: true },
  ]);

  useEffect(() => {
    // Configure main button for pack actions
    webApp?.MainButton.setParams({
      text: '🚀 Boost Pack',
      color: '#8b5cf6',
      text_color: '#ffffff',
      is_active: true,
      is_visible: true,
    });

    webApp?.MainButton.onClick(() => {
      webApp?.HapticFeedback.impactOccurred('medium');
      webApp?.showPopup({
        title: 'Boost Your Pack',
        message: 'Choose how to contribute to pack performance',
        buttons: [
          { id: 'trade', type: 'default', text: '⚡ Execute Trade' },
          { id: 'invite', type: 'default', text: '👥 Invite Friends' },
          { id: 'strategy', type: 'default', text: '📊 Share Strategy' },
          { id: 'cancel', type: 'cancel', text: 'Cancel' },
        ],
      }, (buttonId) => {
        if (buttonId !== 'cancel') {
          webApp?.showAlert(`${buttonId} action initiated!`);
        }
      });
    });

    return () => {
      webApp?.MainButton.hide();
    };
  }, [webApp]);

  const handlePackAction = (action: string) => {
    webApp?.HapticFeedback.selectionChanged();
    
    switch (action) {
      case 'invite':
        webApp?.showAlert('Generating invite link...');
        break;
      case 'leave':
        webApp?.showConfirm('Are you sure you want to leave the pack?', (confirmed) => {
          if (confirmed) {
            webApp?.showAlert('Left the pack. You can join another pack anytime.');
          }
        });
        break;
      case 'strategy':
        webApp?.showAlert('Opening strategy discussion...');
        break;
      case 'challenge':
        webApp?.showAlert('Challenging another pack...');
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
      {/* Pack Header */}
      <motion.div variants={itemVariants}>
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{currentPack.name}</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span>#{currentPack.rank} Global</span>
                  <span>•</span>
                  <span>{currentPack.members} Members</span>
                  <span>•</span>
                  <span className="text-purple-400">{currentPack.level}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">${currentPack.totalValue.toLocaleString()}</div>
              <div className="text-sm text-success-400">+${currentPack.dailyPnL.toLocaleString()}</div>
            </div>
          </div>
          
          {/* Pack Badges */}
          <div className="flex flex-wrap gap-2">
            {currentPack.badges.map((badge, index) => (
              <span
                key={index}
                className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md text-xs font-medium"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Pack Stats */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold mb-3">Pack Performance</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
            <div className="flex items-center justify-between mb-2">
              <TrophyIcon className="w-5 h-5 text-warning-400" />
              <span className="text-xs text-gray-400">Win Rate</span>
            </div>
            <div className="text-lg font-bold">{currentPack.winRate}%</div>
            <div className="text-xs text-gray-400">Above average</div>
          </div>

          <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
            <div className="flex items-center justify-between mb-2">
              <ChartBarIcon className="w-5 h-5 text-primary-400" />
              <span className="text-xs text-gray-400">Strategy</span>
            </div>
            <div className="text-lg font-bold">{currentPack.strategy}</div>
            <div className="text-xs text-gray-400">High risk/reward</div>
          </div>
        </div>
      </motion.div>

      {/* Pack Actions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold mb-3">Pack Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handlePackAction('invite')}
            className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-left hover:from-primary-600 hover:to-primary-700 transition-all"
          >
            <UserGroupIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Invite Friends</div>
            <div className="text-xs opacity-80">Grow the pack</div>
          </button>

          <button
            onClick={() => handlePackAction('strategy')}
            className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-xl p-4 text-left hover:from-secondary-600 hover:to-secondary-700 transition-all"
          >
            <ChartBarIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Strategy Chat</div>
            <div className="text-xs opacity-80">Discuss trades</div>
          </button>

          <button
            onClick={() => handlePackAction('challenge')}
            className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-4 text-left hover:from-accent-600 hover:to-accent-700 transition-all"
          >
            <BoltIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Challenge Pack</div>
            <div className="text-xs opacity-80">Battle other packs</div>
          </button>

          <button
            onClick={() => handlePackAction('leave')}
            className="bg-gradient-to-r from-error-500 to-error-600 rounded-xl p-4 text-left hover:from-error-600 hover:to-error-700 transition-all"
          >
            <FireIcon className="w-6 h-6 mb-2" />
            <div className="font-semibold">Leave Pack</div>
            <div className="text-xs opacity-80">Find new pack</div>
          </button>
        </div>
      </motion.div>

      {/* Pack Members */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Pack Members</h3>
          <button className="text-primary-400 text-sm">View All</button>
        </div>
        <div className="space-y-2">
          {packMembers.slice(0, 4).map((member) => (
            <div
              key={member.id}
              className={`rounded-lg p-3 border ${
                member.isCurrentUser
                  ? 'bg-primary-500/10 border-primary-500/30'
                  : 'bg-dark-800/50 border-dark-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">
                      {member.username.slice(0, 2).toUpperCase()}
                    </div>
                    {member.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success-500 rounded-full border-2 border-dark-900" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center space-x-1">
                      <span>{member.username}</span>
                      {member.role === 'Leader' && <StarIcon className="w-3 h-3 text-warning-400" />}
                      {member.isCurrentUser && <span className="text-primary-400">(You)</span>}
                    </div>
                    <div className="text-xs text-gray-400">{member.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">${member.contribution.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{member.winRate}% win rate</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pack Leaderboard */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Global Leaderboard</h3>
          <button className="text-primary-400 text-sm">View Full</button>
        </div>
        <div className="space-y-1">
          {packLeaderboard.slice(0, 8).map((pack) => (
            <div
              key={pack.rank}
              className={`flex items-center justify-between p-2 rounded-lg ${
                pack.isCurrentPack
                  ? 'bg-purple-500/20 border border-purple-500/30'
                  : 'bg-dark-800/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  pack.rank <= 3 ? 'bg-warning-500 text-dark-900' : 'bg-dark-700 text-gray-300'
                }`}>
                  {pack.rank}
                </div>
                <span className="font-medium text-sm">{pack.name}</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">${(pack.value / 1000000).toFixed(1)}M</div>
                <div className="text-xs text-success-400">+{pack.change}%</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
