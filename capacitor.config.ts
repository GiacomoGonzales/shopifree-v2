import type { CapacitorConfig } from '@capacitor/cli';

// Auto-generated config for store: Amaranto women (KnQKQDeBFLPPpLx1kar7jcSTzRt2)
// Generated at: 2026-04-30T00:20:47.567Z

const config: CapacitorConfig = {
  appId: 'app.shopifree.store.amarantowomen',
  appName: 'Amaranto Women',
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
