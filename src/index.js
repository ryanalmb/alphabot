import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Telegram WebApp
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  
  // Configure WebApp
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
  
  // Set theme
  document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
  document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
  document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
  document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
  document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
  document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
  
  console.log('Telegram WebApp initialized:', {
    version: tg.version,
    platform: tg.platform,
    user: tg.initDataUnsafe?.user,
    colorScheme: tg.colorScheme
  });
} else {
  console.warn('Telegram WebApp not available - running in browser mode');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
