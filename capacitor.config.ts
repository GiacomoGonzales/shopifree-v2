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
    },
    SocialLogin: {
      // Only ship the providers we actually use. Setting facebook/twitter
      // to false makes the @capgo/capacitor-social-login plugin exclude
      // those native SDKs from the build, shrinking the iOS app size.
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false
      }
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
