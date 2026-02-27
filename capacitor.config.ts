import type { CapacitorConfig } from '@capacitor/cli';

// Auto-generated config for store: AlienStore (mJe3zuUhY8ggu8FxnKWyVP5fI3Z2)
// Generated at: 2026-02-27T22:57:54.429Z

const config: CapacitorConfig = {
  appId: 'app.shopifree.store.alienstore',
  appName: 'AlienStore',
  webDir: 'dist',
  backgroundColor: '#000000',
  server: {
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 10000,
      launchAutoHide: false,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000'
    },
    Keyboard: {
      resize: 'native'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  ios: {
    contentInset: 'never',
    allowsLinkPreview: true,
    scrollEnabled: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
