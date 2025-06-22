'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ClockIcon,
  FireIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface MiniAppTradingProps {
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

export function MiniAppTrading({ user, webApp }: MiniAppTradingProps) {
  const [selectedPair, setSelectedPair] = useState('SOL/USDC');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const [tradingPairs] = useState([
    {
      symbol: 'SOL/USDC',
      price: 98.42,
      change24h: 5.67,
      volume: '2.4M',
      high24h: 102.15,
      low24h: 94.30,
    },
    {
      symbol: 'ETH/USDC',
      price: 2341.20,
      change24h: -2.34,
      volume: '8.7M',
      high24h: 2398.50,
      low24h: 2320.80,
    },
    {
      symbol: 'BTC/USDC',
      price: 43250.00,
      change24h: 1.89,
      volume: '15.2M',
      high24h: 43890.00,
      low24h: 42100.00,
    },
    {
      symbol: 'BONK/SOL',
      price: 0.000023,
      change24h: 12.45,
      volume: '890K',
      high24h: 0.000025,
      low24h: 0.000021,
    },
  ]);

  const [recentTrades] = useState([
    {
      id: 1,
      pair: 'SOL/USDC',
      type: 'BUY',
      amount: 15.5,
      price: 98.42,
      time: '2m ago',
      status: 'completed',
    },
    {
      id: 2,
      pair: 'ETH/USDC',
      type: 'SELL',
      amount: 0.8,
      price: 2341.20,
      time: '15m ago',
      status: 'completed',
    },
    {
      id: 3,
      pair: 'BTC/USDC',
      type: 'BUY',
      amount: 0.02,
      price: 43250.00,
      time: '1h ago',
      status: 'pending',
    },
  ]);

  const selectedPairData = tradingPairs.find(pair => pair.symbol === selectedPair);

  useEffect(() => {
    // Configure main button for trade execution
    webApp?.MainButton.setParams({
      text: `${tradeType} ${selectedPair}`,
      color: tradeType === 'BUY' ? '#10b981' : '#ef4444',
      text_color: '#ffffff',
      is_active: amount !== '',
      is_visible: true,
    });

    webApp?.MainButton.onClick(() => {
      if (amount !== '') {
        executeTrade();
      }
    });

    return () => {
      webApp?.MainButton.hide();
    };
  }, [webApp, tradeType, selectedPair, amount]);

  const executeTrade = async () => {
    if (!amount || isExecuting) return;

    setIsExecuting(true);
    webApp?.HapticFeedback.impactOccurred('heavy');
    webApp?.MainButton.showProgress();

    try {
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      webApp?.HapticFeedback.notificationOccurred('success');
      webApp?.showAlert(`✅ ${tradeType} order executed successfully!\n\n${amount} ${selectedPair} @ $${selectedPairData?.price}`);
      
      setAmount('');
    } catch (error) {
      webApp?.HapticFeedback.notificationOccurred('error');
      webApp?.showAlert('❌ Trade execution failed. Please try again.');
    } finally {
      setIsExecuting(false);
      webApp?.MainButton.hideProgress();
    }
  };

  const handleQuickAmount = (percentage: number) => {
    webApp?.HapticFeedback.selectionChanged();
    // Simulate calculating amount based on portfolio percentage
    const portfolioValue = 12847.50;
    const usdAmount = (portfolioValue * percentage) / 100;
    const tokenAmount = selectedPairData ? (usdAmount / selectedPairData.price).toFixed(4) : '0';
    setAmount(tokenAmount);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 space-y-6"
    >
      {/* Trading Pairs */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold mb-3">Trading Pairs</h3>
        <div className="grid grid-cols-1 gap-2">
          {tradingPairs.map((pair) => (
            <button
              key={pair.symbol}
              onClick={() => {
                setSelectedPair(pair.symbol);
                webApp?.HapticFeedback.selectionChanged();
              }}
              className={`p-3 rounded-lg border transition-all ${
                selectedPair === pair.symbol
                  ? 'bg-primary-500/20 border-primary-500'
                  : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold">{pair.symbol}</div>
                  <div className="text-xs text-gray-400">Vol: {pair.volume}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${pair.price.toLocaleString()}</div>
                  <div className={`text-xs flex items-center justify-end ${
                    pair.change24h >= 0 ? 'text-success-400' : 'text-error-400'
                  }`}>
                    {pair.change24h >= 0 ? (
                      <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(pair.change24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Selected Pair Details */}
      {selectedPairData && (
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-semibold mb-3">{selectedPair} Details</h3>
          <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-400 mb-1">24h High</div>
                <div className="font-semibold text-success-400">
                  ${selectedPairData.high24h.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Current</div>
                <div className="font-bold text-lg">
                  ${selectedPairData.price.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">24h Low</div>
                <div className="font-semibold text-error-400">
                  ${selectedPairData.low24h.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Trade Type Selection */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold mb-3">Trade Type</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setTradeType('BUY');
              webApp?.HapticFeedback.selectionChanged();
            }}
            className={`p-4 rounded-xl border transition-all ${
              tradeType === 'BUY'
                ? 'bg-success-500/20 border-success-500 text-success-400'
                : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'
            }`}
          >
            <ArrowTrendingUpIcon className="w-6 h-6 mx-auto mb-2" />
            <div className="font-semibold">BUY</div>
          </button>
          <button
            onClick={() => {
              setTradeType('SELL');
              webApp?.HapticFeedback.selectionChanged();
            }}
            className={`p-4 rounded-xl border transition-all ${
              tradeType === 'SELL'
                ? 'bg-error-500/20 border-error-500 text-error-400'
                : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'
            }`}
          >
            <ArrowTrendingDownIcon className="w-6 h-6 mx-auto mb-2" />
            <div className="font-semibold">SELL</div>
          </button>
        </div>
      </motion.div>

      {/* Amount Input */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold mb-3">Amount</h3>
        <div className="space-y-3">
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-dark-800/50 border border-dark-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
              {selectedPair.split('/')[0]}
            </div>
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((percentage) => (
              <button
                key={percentage}
                onClick={() => handleQuickAmount(percentage)}
                className="bg-dark-700/50 hover:bg-dark-600/50 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {percentage}%
              </button>
            ))}
          </div>
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
                  <div className="font-medium text-sm">
                    {trade.type} {trade.amount}
                  </div>
                  <div className={`text-xs ${
                    trade.status === 'completed' ? 'text-success-400' : 'text-warning-400'
                  }`}>
                    {trade.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
