'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRightIcon, 
  SparklesIcon, 
  BoltIcon, 
  GlobeAltIcon,
  ChartBarIcon,
  UserGroupIcon,
  TrophyIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/layout/Footer';

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

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Alpha Pack</span>
            </motion.div>

            {/* Navigation Links */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hidden md:flex items-center space-x-8"
            >
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
                How it Works
              </Link>
              <Link href="#stats" className="text-gray-300 hover:text-white transition-colors">
                Stats
              </Link>
              <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">
                Docs
              </Link>
            </motion.div>

            {/* Wallet Connection */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center space-x-4"
            >
              {connected ? (
                <Link href="/app/dashboard" className="btn-primary">
                  Launch App
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Link>
              ) : (
                <WalletMultiButton className="!bg-primary-600 !rounded-lg !h-10" />
              )}
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 bg-dark-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="text-center mb-16"
            >
              <motion.h2 variants={itemVariants} className="text-4xl font-bold mb-4">
                How <span className="gradient-text">Alpha Pack</span> Works
              </motion.h2>
              <motion.p variants={itemVariants} className="text-xl text-gray-400 max-w-3xl mx-auto">
                Join the ultimate DeFi social trading experience in four simple steps
              </motion.p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {[
                {
                  step: '01',
                  title: 'Connect Wallet',
                  description: 'Connect your Solana wallet and create your Alpha Pack profile',
                  icon: BoltIcon,
                  color: 'from-primary-500 to-primary-600',
                },
                {
                  step: '02',
                  title: 'Join a Pack',
                  description: 'Find your tribe or create a new pack with friends and fellow traders',
                  icon: UserGroupIcon,
                  color: 'from-secondary-500 to-secondary-600',
                },
                {
                  step: '03',
                  title: 'Trade & Compete',
                  description: 'Execute trades, find arbitrage opportunities, and compete in real-time',
                  icon: ChartBarIcon,
                  color: 'from-accent-500 to-accent-600',
                },
                {
                  step: '04',
                  title: 'Win Rewards',
                  description: 'Earn tokens, NFTs, and social clout for your pack\'s performance',
                  icon: TrophyIcon,
                  color: 'from-success-500 to-success-600',
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="relative"
                >
                  <div className="card-hover text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-sm font-mono text-gray-500 mb-2">STEP {item.step}</div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-gray-400">{item.description}</p>
                  </div>
                  
                  {/* Connection Line */}
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary-500/50 to-transparent transform -translate-y-1/2" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <StatsSection />

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* CTA Section */}
        <CTASection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
