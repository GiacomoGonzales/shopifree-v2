import type { CapacitorConfig } from '@capacitor/cli';

// Shopifree Platform App - default config
// For white-label store builds, use: npx tsx mobile/build-config.ts <storeId>

const config: CapacitorConfig = {
  appId: 'app.shopifree.mobile',
  appName: 'Shopifree',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  server: {
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',             // dark text on light bg
      backgroundColor: '#ffffff',
      overlaysWebView: false
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
