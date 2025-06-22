'use client';

import React, { useEffect, useState } from 'react';
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
  RocketLaunchIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { TelegramWebApp } from '@/components/telegram/TelegramWebApp';
import { MiniAppDashboard } from '@/components/miniapp/MiniAppDashboard';
import { MiniAppTrading } from '@/components/miniapp/MiniAppTrading';
import { MiniAppPack } from '@/components/miniapp/MiniAppPack';
import { MiniAppCompetitions } from '@/components/miniapp/MiniAppCompetitions';
import { MiniAppSocial } from '@/components/miniapp/MiniAppSocial';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';

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

type MiniAppView = 'dashboard' | 'trading' | 'pack' | 'competitions' | 'social';

export default function MiniAppPage() {
  const [currentView, setCurrentView] = useState<MiniAppView>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const { webApp, user, isReady } = useTelegramWebApp();

  useEffect(() => {
    if (isReady) {
      setIsLoading(false);
      // Configure Telegram WebApp
      webApp?.ready();
      webApp?.expand();
      webApp?.enableClosingConfirmation();
      
      // Set theme
      webApp?.setHeaderColor('#0f0f23');
      webApp?.setBackgroundColor('#0f0f23');
      
      // Handle back button
      webApp?.BackButton.onClick(() => {
        if (currentView !== 'dashboard') {
          setCurrentView('dashboard');
        } else {
          webApp?.close();
        }
      });
      
      // Show back button for non-dashboard views
      if (currentView !== 'dashboard') {
        webApp?.BackButton.show();
      } else {
        webApp?.BackButton.hide();
      }
    }
  }, [isReady, webApp, currentView]);

  if (isLoading || !isReady) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RocketLaunchIcon className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Alpha Pack</h2>
          <p className="text-gray-400">Loading mini-app...</p>
        </motion.div>
      </div>
    );
  }

  const navigation = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: ChartBarIcon,
      color: 'from-primary-500 to-primary-600',
    },
    {
      id: 'trading',
      name: 'Trading',
      icon: BoltIcon,
      color: 'from-secondary-500 to-secondary-600',
    },
    {
      id: 'pack',
      name: 'Pack',
      icon: UserGroupIcon,
      color: 'from-accent-500 to-accent-600',
    },
    {
      id: 'competitions',
      name: 'Compete',
      icon: TrophyIcon,
      color: 'from-success-500 to-success-600',
    },
    {
      id: 'social',
      name: 'Social',
      icon: SparklesIcon,
      color: 'from-warning-500 to-warning-600',
    },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <MiniAppDashboard user={user} webApp={webApp} />;
      case 'trading':
        return <MiniAppTrading user={user} webApp={webApp} />;
      case 'pack':
        return <MiniAppPack user={user} webApp={webApp} />;
      case 'competitions':
        return <MiniAppCompetitions user={user} webApp={webApp} />;
      case 'social':
        return <MiniAppSocial user={user} webApp={webApp} />;
      default:
        return <MiniAppDashboard user={user} webApp={webApp} />;
    }
  };

  return (
    <TelegramWebApp>
      <div className="min-h-screen bg-dark-900 text-white">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-dark-700/50"
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Alpha Pack</h1>
                  <p className="text-xs text-gray-400">
                    Welcome, {user?.first_name || 'Trader'}!
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Live</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="pb-20"
        >
          {renderCurrentView()}
        </motion.main>

        {/* Bottom Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-dark-800/95 backdrop-blur-md border-t border-dark-700/50"
        >
          <div className="px-2 py-2">
            <div className="flex items-center justify-around">
              {navigation.map((item) => {
                const isActive = currentView === item.id;
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as MiniAppView)}
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`}>
                      <Icon className="w-full h-full" />
                    </div>
                    <span className="text-xs font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.nav>
      </div>
    </TelegramWebApp>
  );
}
