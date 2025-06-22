'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrophyIcon,
  FireIcon,
  ClockIcon,
  BoltIcon,
  SparklesIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface MiniAppCompetitionsProps {
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

export function MiniAppCompetitions({ user, webApp }: MiniAppCompetitionsProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'my'>('live');

  const [liveCompetitions] = useState([
    {
      id: 1,
      title: 'Solana Speed Trading 🚀',
      description: 'Fastest SOL trades win',
      prize: 5000,
      participants: 247,
      timeLeft: '2h 34m',
      difficulty: 'Medium',
      category: 'Speed',
      isJoined: true,
      currentRank: 23,
    },
    {
      id: 2,
      title: 'DeFi Arbitrage Masters ⚡',
      description: 'Find the best arbitrage opportunities',
      prize: 10000,
      participants: 156,
      timeLeft: '5h 12m',
      difficulty: 'Hard',
      category: 'Arbitrage',
      isJoined: false,
      currentRank: null,
    },
    {
      id: 3,
      title: 'Pack vs Pack Battle 🐺',
      description: 'Alpha Wolves vs Solana Sharks',
      prize: 15000,
      participants: 94,
      timeLeft: '1h 45m',
      difficulty: 'Elite',
      category: 'Pack Battle',
      isJoined: true,
      currentRank: 8,
    },
  ]);

  const [upcomingCompetitions] = useState([
    {
      id: 4,
      title: 'Weekly Profit Challenge 💰',
      description: 'Highest weekly returns win',
      prize: 25000,
      participants: 0,
      startsIn: '6h 30m',
      difficulty: 'Medium',
      category: 'Profit',
      entryFee: 50,
    },
    {
      id: 5,
      title: 'Meme Coin Madness 🎭',
      description: 'Trade meme coins for maximum gains',
      prize: 7500,
      participants: 0,
      startsIn: '1d 12h',
      difficulty: 'Easy',
      category: 'Meme',
      entryFee: 25,
    },
  ]);

  const [myCompetitions] = useState([
    {
      id: 1,
      title: 'Solana Speed Trading 🚀',
      status: 'Active',
      rank: 23,
      score: 1247,
      prize: 5000,
      timeLeft: '2h 34m',
    },
    {
      id: 3,
      title: 'Pack vs Pack Battle 🐺',
      status: 'Active',
      rank: 8,
      score: 2156,
      prize: 15000,
      timeLeft: '1h 45m',
    },
    {
      id: 6,
      title: 'Flash Trading Championship',
      status: 'Completed',
      rank: 12,
      score: 1834,
      prize: 2500,
      reward: 125,
    },
  ]);

  useEffect(() => {
    // Configure main button based on active tab
    if (activeTab === 'live') {
      webApp?.MainButton.setParams({
        text: '🏆 Join Competition',
        color: '#f59e0b',
        text_color: '#ffffff',
        is_active: true,
        is_visible: true,
      });

      webApp?.MainButton.onClick(() => {
        webApp?.HapticFeedback.impactOccurred('medium');
        webApp?.showPopup({
          title: 'Join Competition',
          message: 'Select a competition to join',
          buttons: [
            { id: 'speed', type: 'default', text: '🚀 Speed Trading' },
            { id: 'arbitrage', type: 'default', text: '⚡ Arbitrage' },
            { id: 'cancel', type: 'cancel', text: 'Cancel' },
          ],
        }, (buttonId) => {
          if (buttonId !== 'cancel') {
            webApp?.showAlert(`Joining ${buttonId} competition...`);
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

  const handleJoinCompetition = (competition: any) => {
    webApp?.HapticFeedback.impactOccurred('heavy');
    
    if (competition.entryFee) {
      webApp?.showConfirm(
        `Join "${competition.title}" for ${competition.entryFee} USDC entry fee?`,
        (confirmed) => {
          if (confirmed) {
            webApp?.showAlert('🎉 Successfully joined the competition!');
          }
        }
      );
    } else {
      webApp?.showAlert('🎉 Successfully joined the competition!');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-success-400 bg-success-500/20';
      case 'Medium': return 'text-warning-400 bg-warning-500/20';
      case 'Hard': return 'text-error-400 bg-error-500/20';
      case 'Elite': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const renderLiveCompetitions = () => (
    <div className="space-y-4">
      {liveCompetitions.map((comp) => (
        <div
          key={comp.id}
          className={`rounded-xl p-4 border ${
            comp.isJoined
              ? 'bg-primary-500/10 border-primary-500/30'
              : 'bg-dark-800/50 border-dark-700/50'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{comp.title}</h4>
              <p className="text-sm text-gray-400 mb-2">{comp.description}</p>
              <div className="flex items-center space-x-3 text-xs">
                <span className={`px-2 py-1 rounded-md ${getDifficultyColor(comp.difficulty)}`}>
                  {comp.difficulty}
                </span>
                <span className="text-gray-400">{comp.participants} participants</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-warning-400">${comp.prize.toLocaleString()}</div>
              <div className="text-xs text-gray-400 flex items-center">
                <ClockIcon className="w-3 h-3 mr-1" />
                {comp.timeLeft}
              </div>
            </div>
          </div>
          
          {comp.isJoined ? (
            <div className="flex items-center justify-between bg-primary-500/20 rounded-lg p-2">
              <span className="text-sm text-primary-400">Rank #{comp.currentRank}</span>
              <button className="bg-primary-500 text-white px-3 py-1 rounded-md text-xs font-medium">
                View Details
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleJoinCompetition(comp)}
              className="w-full bg-warning-500 hover:bg-warning-600 text-dark-900 py-2 rounded-lg font-medium transition-colors"
            >
              Join Competition
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const renderUpcomingCompetitions = () => (
    <div className="space-y-4">
      {upcomingCompetitions.map((comp) => (
        <div
          key={comp.id}
          className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{comp.title}</h4>
              <p className="text-sm text-gray-400 mb-2">{comp.description}</p>
              <div className="flex items-center space-x-3 text-xs">
                <span className={`px-2 py-1 rounded-md ${getDifficultyColor(comp.difficulty)}`}>
                  {comp.difficulty}
                </span>
                {comp.entryFee && (
                  <span className="text-warning-400">${comp.entryFee} entry fee</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-warning-400">${comp.prize.toLocaleString()}</div>
              <div className="text-xs text-gray-400 flex items-center">
                <ClockIcon className="w-3 h-3 mr-1" />
                Starts in {comp.startsIn}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => handleJoinCompetition(comp)}
            className="w-full bg-secondary-500 hover:bg-secondary-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Register Now
          </button>
        </div>
      ))}
    </div>
  );

  const renderMyCompetitions = () => (
    <div className="space-y-4">
      {myCompetitions.map((comp) => (
        <div
          key={comp.id}
          className={`rounded-xl p-4 border ${
            comp.status === 'Active'
              ? 'bg-success-500/10 border-success-500/30'
              : 'bg-dark-800/50 border-dark-700/50'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{comp.title}</h4>
              <div className="flex items-center space-x-3 text-xs">
                <span className={`px-2 py-1 rounded-md ${
                  comp.status === 'Active' ? 'text-success-400 bg-success-500/20' : 'text-gray-400 bg-gray-500/20'
                }`}>
                  {comp.status}
                </span>
                <span className="text-gray-400">Rank #{comp.rank}</span>
                <span className="text-gray-400">Score: {comp.score}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-warning-400">${comp.prize.toLocaleString()}</div>
              {comp.status === 'Active' ? (
                <div className="text-xs text-gray-400 flex items-center">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  {comp.timeLeft}
                </div>
              ) : (
                <div className="text-xs text-success-400">
                  Won: ${comp.reward}
                </div>
              )}
            </div>
          </div>
          
          <button className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg font-medium transition-colors">
            {comp.status === 'Active' ? 'View Progress' : 'View Results'}
          </button>
        </div>
      ))}
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
        <h2 className="text-2xl font-bold mb-2">🏆 Competitions</h2>
        <p className="text-gray-400">Compete, win prizes, climb the leaderboard!</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex bg-dark-800/50 rounded-lg p-1">
          {[
            { id: 'live', label: 'Live', icon: FireIcon },
            { id: 'upcoming', label: 'Upcoming', icon: ClockIcon },
            { id: 'my', label: 'My Comps', icon: TrophyIcon },
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
                    ? 'bg-primary-600 text-white'
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
        {activeTab === 'live' && renderLiveCompetitions()}
        {activeTab === 'upcoming' && renderUpcomingCompetitions()}
        {activeTab === 'my' && renderMyCompetitions()}
      </motion.div>
    </motion.div>
  );
}
