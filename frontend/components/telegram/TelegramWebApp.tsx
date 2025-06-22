'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

interface TelegramWebAppProps {
  children: React.ReactNode;
}

export function TelegramWebApp({ children }: TelegramWebAppProps) {
  useEffect(() => {
    // Apply Telegram WebApp specific styles
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Prevent zoom and scroll
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* Load Telegram WebApp script */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log('Telegram WebApp script loaded');
        }}
      />
      
      {/* WebApp specific meta tags */}
      <meta name="telegram-web-app" content="true" />
      <meta name="theme-color" content="#0f0f23" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="format-detection" content="telephone=no" />
      
      {children}
    </>
  );
}
