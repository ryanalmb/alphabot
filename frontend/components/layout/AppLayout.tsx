'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  TrophyIcon,
  SparklesIcon,
  Cog6ToothIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  TrophyIcon as TrophyIconSolid,
  SparklesIcon as SparklesIconSolid,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { SearchModal } from '@/components/search/SearchModal';
import { UserMenu } from '@/components/user/UserMenu';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/app/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    name: 'Pack',
    href: '/app/pack',
    icon: UserGroupIcon,
    iconSolid: UserGroupIconSolid,
  },
  {
    name: 'Trading',
    href: '/app/trading',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
  },
  {
    name: 'Competitions',
    href: '/app/competitions',
    icon: TrophyIcon,
    iconSolid: TrophyIconSolid,
  },
  {
    name: 'Social',
    href: '/app/social',
    icon: SparklesIcon,
    iconSolid: SparklesIconSolid,
  },
];

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { connected } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-dark-800/95 backdrop-blur-md border-r border-dark-700/50 lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold gradient-text">Alpha Pack</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="p-4 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = isActive ? item.iconSolid : item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-dark-800/50 lg:backdrop-blur-md lg:border-r lg:border-dark-700/50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center space-x-2 p-6 border-b border-dark-700/50">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Alpha Pack</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = isActive ? item.iconSolid : item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="p-6 border-t border-dark-700/50">
            <Link
              href="/app/settings"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700/50 transition-all"
            >
              <Cog6ToothIcon className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-4">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center space-x-3 px-4 py-2 bg-dark-800/50 border border-dark-700/50 rounded-lg text-gray-400 hover:text-white hover:border-primary-500/30 transition-all"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span className="text-left">Search packs, users, trades...</span>
                <div className="ml-auto flex items-center space-x-1">
                  <kbd className="px-2 py-1 text-xs bg-dark-700/50 rounded border border-dark-600/50">⌘</kbd>
                  <kbd className="px-2 py-1 text-xs bg-dark-700/50 rounded border border-dark-600/50">K</kbd>
                </div>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button
                onClick={() => setNotificationsOpen(true)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
              >
                <BellIcon className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
              </button>

              {/* Wallet */}
              {connected ? (
                <UserMenu />
              ) : (
                <WalletMultiButton className="!bg-primary-600 !rounded-lg !h-10" />
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Modals */}
      <NotificationPanel 
        open={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
      <SearchModal 
        open={searchOpen} 
        onClose={() => setSearchOpen(false)} 
      />
    </div>
  );
}
