import { useState, useEffect } from 'react';

export const useTelegram = () => {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const telegram = window.Telegram.WebApp;
      setTg(telegram);
      
      // Get user data
      if (telegram.initDataUnsafe?.user) {
        setUser(telegram.initDataUnsafe.user);
      }
      
      // Set up event listeners
      telegram.onEvent('themeChanged', () => {
        console.log('Theme changed:', telegram.themeParams);
      });
      
      telegram.onEvent('viewportChanged', () => {
        console.log('Viewport changed:', telegram.viewportHeight);
      });
      
      setReady(true);
    } else {
      // Fallback for development/testing
      console.warn('Telegram WebApp not available');
      setTg({
        colorScheme: 'light',
        themeParams: {
          bg_color: '#ffffff',
          text_color: '#000000',
          hint_color: '#999999',
          link_color: '#2481cc',
          button_color: '#2481cc',
          button_text_color: '#ffffff',
        },
        platform: 'web',
        version: '7.0',
      });
      setUser({
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      });
      setReady(true);
    }
  }, []);

  const showAlert = (message) => {
    if (tg?.showAlert) {
      tg.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      if (tg?.showConfirm) {
        tg.showConfirm(message, resolve);
      } else {
        // eslint-disable-next-line no-restricted-globals
        resolve(confirm(message));
      }
    });
  };

  const hapticFeedback = (type = 'impact') => {
    if (tg?.HapticFeedback) {
      switch (type) {
        case 'light':
          tg.HapticFeedback.impactOccurred('light');
          break;
        case 'medium':
          tg.HapticFeedback.impactOccurred('medium');
          break;
        case 'heavy':
          tg.HapticFeedback.impactOccurred('heavy');
          break;
        case 'success':
          tg.HapticFeedback.notificationOccurred('success');
          break;
        case 'warning':
          tg.HapticFeedback.notificationOccurred('warning');
          break;
        case 'error':
          tg.HapticFeedback.notificationOccurred('error');
          break;
        default:
          tg.HapticFeedback.impactOccurred('medium');
      }
    }
  };

  const sendData = (data) => {
    if (tg?.sendData) {
      tg.sendData(JSON.stringify(data));
    } else {
      console.log('Would send data:', data);
    }
  };

  const close = () => {
    if (tg?.close) {
      tg.close();
    }
  };

  return {
    tg,
    user,
    ready,
    showAlert,
    showConfirm,
    hapticFeedback,
    sendData,
    close,
  };
};
