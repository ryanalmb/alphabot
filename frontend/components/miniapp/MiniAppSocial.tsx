'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  TrophyIcon,
  FireIcon,
  BoltIcon,
  UserGroupIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface MiniAppSocialProps {
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

export function MiniAppSocial({ user, webApp }: MiniAppSocialProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'leaderboard' | 'profile'>('feed');

  const [socialFeed] = useState([
    {
      id: 1,
      user: 'CryptoWolf',
      avatar: '🐺',
      time: '5m ago',
      type: 'trade',
      content: 'Just executed a perfect arbitrage on SOL/USDC! 🚀',
      trade: {
        pair: 'SOL/USDC',
        profit: 247.50,
        percentage: 12.3,
      },
      likes: 23,
      comments: 7,
      shares: 4,
      isLiked: false,
    },
    {
      id: 2,
      user: 'DeFiHunter',
      avatar: '🏹',
      time: '12m ago',
      type: 'achievement',
      content: 'Reached 1000 successful trades milestone! 🎉',
      achievement: {
        title: 'Trade Master',
        icon: '🏆',
        rarity: 'Epic',
      },
      likes: 45,
      comments: 12,
      shares: 8,
      isLiked: true,
    },
    {
      id: 3,
      user: 'AlphaSeeker',
      avatar: '⚡',
      time: '25m ago',
      type: 'strategy',
      content: 'New DeFi strategy showing 300% APY! Check it out 👇',
      strategy: {
        name: 'Lightning Yield',
        apy: 300,
        risk: 'Medium',
      },
      likes: 67,
      comments: 23,
      shares: 15,
      isLiked: false,
    },
    {
      id: 4,
      user: 'PackLeader',
      avatar: '👑',
      time: '1h ago',
      type: 'pack',
      content: 'Alpha Wolves just climbed to #6 in global rankings! 🐺📈',
      pack: {
        name: 'Alpha Wolves',
        rank: 6,
        change: '+2',
      },
      likes: 89,
      comments: 31,
      shares: 22,
      isLiked: true,
    },
  ]);

  const [leaderboard] = useState([
    {
      rank: 1,
      user: 'CryptoKing',
      avatar: '👑',
      score: 15847,
      profit: 47392.50,
      trades: 234,
      winRate: 89.2,
      badge: 'Legend',
    },
    {
      rank: 2,
      user: 'DeFiMaster',
      avatar: '🎯',
      score: 14523,
      profit: 42156.80,
      trades: 198,
      winRate: 85.7,
      badge: 'Master',
    },
    {
      rank: 3,
      user: 'AlphaWolf',
      avatar: '🐺',
      score: 13298,
      profit: 38947.20,
      trades: 176,
      winRate: 82.4,
      badge: 'Expert',
    },
    {
      rank: 4,
      user: 'FlashTrader',
      avatar: '⚡',
      score: 12847,
      profit: 35672.90,
      trades: 203,
      winRate: 79.8,
      badge: 'Expert',
    },
    {
      rank: 5,
      user: user?.username || 'You',
      avatar: '🚀',
      score: 11234,
      profit: 28394.60,
      trades: 127,
      winRate: 73.5,
      badge: 'Advanced',
      isCurrentUser: true,
    },
  ]);

  const [userProfile] = useState({
    username: user?.first_name || 'Alpha Trader',
    avatar: '🚀',
    level: 'Advanced',
    score: 11234,
    rank: 5,
    followers: 234,
    following: 156,
    totalTrades: 127,
    winRate: 73.5,
    totalProfit: 28394.60,
    achievements: [
      { id: 1, title: 'First Trade', icon: '🎯', rarity: 'Common' },
      { id: 2, title: 'Speed Demon', icon: '⚡', rarity: 'Rare' },
      { id: 3, title: 'Pack Member', icon: '🐺', rarity: 'Epic' },
      { id: 4, title: 'Profit Hunter', icon: '💰', rarity: 'Rare' },
    ],
    recentActivity: [
      { type: 'trade', content: 'Executed SOL/USDC trade', time: '2h ago' },
      { type: 'achievement', content: 'Unlocked Speed Demon', time: '1d ago' },
      { type: 'social', content: 'Joined Alpha Wolves pack', time: '3d ago' },
    ],
  });

  useEffect(() => {
    // Configure main button based on active tab
    if (activeTab === 'feed') {
      webApp?.MainButton.setParams({
        text: '✨ Share Trade',
        color: '#8b5cf6',
        text_color: '#ffffff',
        is_active: true,
        is_visible: true,
      });

      webApp?.MainButton.onClick(() => {
        webApp?.HapticFeedback.impactOccurred('medium');
        webApp?.showPopup({
          title: 'Share Your Success',
          message: 'What would you like to share?',
          buttons: [
            { id: 'trade', type: 'default', text: '📊 Recent Trade' },
            { id: 'achievement', type: 'default', text: '🏆 Achievement' },
            { id: 'strategy', type: 'default', text: '💡 Strategy' },
            { id: 'cancel', type: 'cancel', text: 'Cancel' },
          ],
        }, (buttonId) => {
          if (buttonId !== 'cancel') {
            webApp?.showAlert(`Sharing ${buttonId}...`);
          }
        });
      });
    } else {
      webApp?.MainButton.hide();
    }

    return () => {
      webApp?.MainButton.hide();
    };
  }, [webApp, activeTab]);

  const handleLike = (postId: number) => {
    webApp?.HapticFeedback.impactOccurred('light');
    // In a real app, this would update the like status
  };

  const handleComment = (postId: number) => {
    webApp?.HapticFeedback.selectionChanged();
    webApp?.showAlert('Opening comments...');
  };

  const handleShare = (postId: number) => {
    webApp?.HapticFeedback.selectionChanged();
    webApp?.showAlert('Sharing post...');
  };

  const renderFeed = () => (
    <div className="space-y-4">
      {socialFeed.map((post) => (
        <div
          key={post.id}
          className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50"
        >
          {/* Post Header */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-lg">
              {post.avatar}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{post.user}</div>
              <div className="text-xs text-gray-400">{post.time}</div>
            </div>
            <div className={`px-2 py-1 rounded-md text-xs ${
              post.type === 'trade' ? 'bg-primary-500/20 text-primary-400' :
              post.type === 'achievement' ? 'bg-warning-500/20 text-warning-400' :
              post.type === 'strategy' ? 'bg-secondary-500/20 text-secondary-400' :
              'bg-accent-500/20 text-accent-400'
            }`}>
              {post.type}
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-3">
            <p className="text-sm mb-2">{post.content}</p>
            
            {post.trade && (
              <div className="bg-primary-500/10 rounded-lg p-3 border border-primary-500/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{post.trade.pair}</span>
                  <div className="text-right">
                    <div className="text-success-400 font-bold">+${post.trade.profit}</div>
                    <div className="text-xs text-success-400">+{post.trade.percentage}%</div>
                  </div>
                </div>
              </div>
            )}

            {post.achievement && (
              <div className="bg-warning-500/10 rounded-lg p-3 border border-warning-500/20">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{post.achievement.icon}</span>
                  <div>
                    <div className="font-medium">{post.achievement.title}</div>
                    <div className="text-xs text-warning-400">{post.achievement.rarity}</div>
                  </div>
                </div>
              </div>
            )}

            {post.strategy && (
              <div className="bg-secondary-500/10 rounded-lg p-3 border border-secondary-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{post.strategy.name}</div>
                    <div className="text-xs text-gray-400">Risk: {post.strategy.risk}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-secondary-400 font-bold">{post.strategy.apy}%</div>
                    <div className="text-xs text-gray-400">APY</div>
                  </div>
                </div>
              </div>
            )}

            {post.pack && (
              <div className="bg-accent-500/10 rounded-lg p-3 border border-accent-500/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{post.pack.name}</span>
                  <div className="text-right">
                    <div className="text-accent-400 font-bold">#{post.pack.rank}</div>
                    <div className="text-xs text-success-400">{post.pack.change}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-dark-700/50">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                post.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <HeartIcon className="w-4 h-4" />
              <span className="text-sm">{post.likes}</span>
            </button>
            
            <button
              onClick={() => handleComment(post.id)}
              className="flex items-center space-x-1 px-3 py-1 rounded-md text-gray-400 hover:text-blue-400 transition-colors"
            >
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span className="text-sm">{post.comments}</span>
            </button>
            
            <button
              onClick={() => handleShare(post.id)}
              className="flex items-center space-x-1 px-3 py-1 rounded-md text-gray-400 hover:text-green-400 transition-colors"
            >
              <ShareIcon className="w-4 h-4" />
              <span className="text-sm">{post.shares}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLeaderboard = () => (
    <div className="space-y-2">
      {leaderboard.map((player) => (
        <div
          key={player.rank}
          className={`rounded-lg p-3 border ${
            player.isCurrentUser
              ? 'bg-primary-500/10 border-primary-500/30'
              : 'bg-dark-800/50 border-dark-700/50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              player.rank <= 3 ? 'bg-warning-500 text-dark-900' : 'bg-dark-700 text-gray-300'
            }`}>
              {player.rank}
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              {player.avatar}
            </div>
            <div className="flex-1">
              <div className="font-medium flex items-center space-x-2">
                <span>{player.user}</span>
                {player.isCurrentUser && <span className="text-primary-400 text-xs">(You)</span>}
              </div>
              <div className="text-xs text-gray-400">{player.badge} • {player.winRate}% win rate</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-success-400">${player.profit.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{player.score} pts</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl">
            {userProfile.avatar}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{userProfile.username}</h3>
            <div className="text-purple-400">{userProfile.level} Trader</div>
            <div className="text-sm text-gray-400">Rank #{userProfile.rank} • {userProfile.score} points</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-bold">{userProfile.followers}</div>
            <div className="text-xs text-gray-400">Followers</div>
          </div>
          <div>
            <div className="font-bold">{userProfile.following}</div>
            <div className="text-xs text-gray-400">Following</div>
          </div>
          <div>
            <div className="font-bold">{userProfile.totalTrades}</div>
            <div className="text-xs text-gray-400">Trades</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h4 className="text-lg font-semibold mb-3">🏆 Achievements</h4>
        <div className="grid grid-cols-2 gap-3">
          {userProfile.achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50 text-center"
            >
              <div className="text-2xl mb-1">{achievement.icon}</div>
              <div className="font-medium text-sm">{achievement.title}</div>
              <div className={`text-xs ${
                achievement.rarity === 'Epic' ? 'text-purple-400' :
                achievement.rarity === 'Rare' ? 'text-blue-400' :
                'text-gray-400'
              }`}>
                {achievement.rarity}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-lg font-semibold mb-3">📈 Recent Activity</h4>
        <div className="space-y-2">
          {userProfile.recentActivity.map((activity, index) => (
            <div
              key={index}
              className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{activity.content}</span>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h2 className="text-2xl font-bold mb-2">✨ Social Hub</h2>
        <p className="text-gray-400">Connect, share, and compete with traders</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex bg-dark-800/50 rounded-lg p-1">
          {[
            { id: 'feed', label: 'Feed', icon: SparklesIcon },
            { id: 'leaderboard', label: 'Leaders', icon: TrophyIcon },
            { id: 'profile', label: 'Profile', icon: UserGroupIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  webApp?.HapticFeedback.selectionChanged();
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'leaderboard' && renderLeaderboard()}
        {activeTab === 'profile' && renderProfile()}
      </motion.div>
    </motion.div>
  );
}
