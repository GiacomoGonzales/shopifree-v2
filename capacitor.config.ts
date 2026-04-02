import type { CapacitorConfig } from '@capacitor/cli';

// Shopifree Platform App - default config
// For white-label store builds, use: npx tsx mobile/build-config.ts <storeId>

const config: CapacitorConfig = {
  appId: 'app.shopifree.mobile',
  appName: 'Shopifree',
  webDir: 'dist',
  backgroundColor: '#1e3a5f',
  server: {
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#1e3a5f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1e3a5f'
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
