import { useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    chat_instance?: string;
    chat_type?: string;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  
  // Methods
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (buttonId: string) => void): void;
  showScanQrPopup(params: {
    text?: string;
  }, callback?: (text: string) => void): void;
  closeScanQrPopup(): void;
  readTextFromClipboard(callback?: (text: string) => void): void;
  requestWriteAccess(callback?: (granted: boolean) => void): void;
  requestContact(callback?: (granted: boolean) => void): void;
  
  // Haptic feedback
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  
  // Main button
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    setParams(params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }): void;
  };
  
  // Back button
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  
  // Settings button
  SettingsButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  
  // Cloud storage
  CloudStorage: {
    setItem(key: string, value: string, callback?: (error: Error | null, success: boolean) => void): void;
    getItem(key: string, callback?: (error: Error | null, value: string) => void): void;
    getItems(keys: string[], callback?: (error: Error | null, values: Record<string, string>) => void): void;
    removeItem(key: string, callback?: (error: Error | null, success: boolean) => void): void;
    removeItems(keys: string[], callback?: (error: Error | null, success: boolean) => void): void;
    getKeys(callback?: (error: Error | null, keys: string[]) => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if we're in Telegram WebApp environment
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tgWebApp = window.Telegram.WebApp;
      setWebApp(tgWebApp);
      setUser(tgWebApp.initDataUnsafe.user || null);
      setIsReady(true);
    } else {
      // Fallback for development/testing outside Telegram
      console.warn('Telegram WebApp not available - using mock data for development');
      
      // Mock WebApp for development
      const mockWebApp = {
        initData: '',
        initDataUnsafe: {
          user: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            language_code: 'en',
          },
        },
        version: '6.0',
        platform: 'web',
        colorScheme: 'dark' as const,
        themeParams: {
          bg_color: '#0f0f23',
          text_color: '#ffffff',
          hint_color: '#6b7280',
          link_color: '#3b82f6',
          button_color: '#3b82f6',
          button_text_color: '#ffffff',
          secondary_bg_color: '#1f1f37',
        },
        isExpanded: true,
        viewportHeight: window.innerHeight,
        viewportStableHeight: window.innerHeight,
        headerColor: '#0f0f23',
        backgroundColor: '#0f0f23',
        isClosingConfirmationEnabled: false,
        
        ready: () => console.log('WebApp ready'),
        expand: () => console.log('WebApp expand'),
        close: () => console.log('WebApp close'),
        enableClosingConfirmation: () => console.log('Closing confirmation enabled'),
        disableClosingConfirmation: () => console.log('Closing confirmation disabled'),
        setHeaderColor: (color: string) => console.log('Header color set:', color),
        setBackgroundColor: (color: string) => console.log('Background color set:', color),
        showAlert: (message: string, callback?: () => void) => {
          alert(message);
          callback?.();
        },
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => {
          const confirmed = confirm(message);
          callback?.(confirmed);
        },
        showPopup: (params: any, callback?: (buttonId: string) => void) => {
          alert(params.message);
          callback?.('ok');
        },
        showScanQrPopup: (params: any, callback?: (text: string) => void) => {
          console.log('QR scan requested');
          callback?.('mock-qr-data');
        },
        closeScanQrPopup: () => console.log('QR scan closed'),
        readTextFromClipboard: (callback?: (text: string) => void) => {
          callback?.('mock-clipboard-text');
        },
        requestWriteAccess: (callback?: (granted: boolean) => void) => {
          callback?.(true);
        },
        requestContact: (callback?: (granted: boolean) => void) => {
          callback?.(true);
        },
        
        HapticFeedback: {
          impactOccurred: (style: string) => console.log('Haptic impact:', style),
          notificationOccurred: (type: string) => console.log('Haptic notification:', type),
          selectionChanged: () => console.log('Haptic selection changed'),
        },
        
        MainButton: {
          text: '',
          color: '#3b82f6',
          textColor: '#ffffff',
          isVisible: false,
          isActive: true,
          isProgressVisible: false,
          setText: (text: string) => console.log('Main button text:', text),
          onClick: (callback: () => void) => console.log('Main button click handler set'),
          offClick: (callback: () => void) => console.log('Main button click handler removed'),
          show: () => console.log('Main button shown'),
          hide: () => console.log('Main button hidden'),
          enable: () => console.log('Main button enabled'),
          disable: () => console.log('Main button disabled'),
          showProgress: (leaveActive?: boolean) => console.log('Main button progress shown'),
          hideProgress: () => console.log('Main button progress hidden'),
          setParams: (params: any) => console.log('Main button params:', params),
        },
        
        BackButton: {
          isVisible: false,
          onClick: (callback: () => void) => console.log('Back button click handler set'),
          offClick: (callback: () => void) => console.log('Back button click handler removed'),
          show: () => console.log('Back button shown'),
          hide: () => console.log('Back button hidden'),
        },
        
        SettingsButton: {
          isVisible: false,
          onClick: (callback: () => void) => console.log('Settings button click handler set'),
          offClick: (callback: () => void) => console.log('Settings button click handler removed'),
          show: () => console.log('Settings button shown'),
          hide: () => console.log('Settings button hidden'),
        },
        
        CloudStorage: {
          setItem: (key: string, value: string, callback?: any) => {
            localStorage.setItem(`tg_${key}`, value);
            callback?.(null, true);
          },
          getItem: (key: string, callback?: any) => {
            const value = localStorage.getItem(`tg_${key}`) || '';
            callback?.(null, value);
          },
          getItems: (keys: string[], callback?: any) => {
            const values: Record<string, string> = {};
            keys.forEach(key => {
              values[key] = localStorage.getItem(`tg_${key}`) || '';
            });
            callback?.(null, values);
          },
          removeItem: (key: string, callback?: any) => {
            localStorage.removeItem(`tg_${key}`);
            callback?.(null, true);
          },
          removeItems: (keys: string[], callback?: any) => {
            keys.forEach(key => localStorage.removeItem(`tg_${key}`));
            callback?.(null, true);
          },
          getKeys: (callback?: any) => {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('tg_'));
            callback?.(null, keys.map(key => key.replace('tg_', '')));
          },
        },
      } as TelegramWebApp;
      
      setWebApp(mockWebApp);
      setUser(mockWebApp.initDataUnsafe.user || null);
      setIsReady(true);
    }
  }, []);

  return {
    webApp,
    user,
    isReady,
  };
}
