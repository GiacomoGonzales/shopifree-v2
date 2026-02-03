import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.shopifree.mobile',
  appName: 'Shopifree',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  server: {
    // For production, comment out the url line
    // url: 'http://192.168.1.X:5173', // For dev testing on device
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 10000,
      launchAutoHide: false,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff'
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '610784604338-jn860v33lmt7urrlfd0gge96ihufra51.apps.googleusercontent.com',
      iosClientId: '610784604338-79a7qucapsm5bddqg1u2ndbkvaeutif7.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  ios: {
    contentInset: 'never',
    allowsLinkPreview: true,
    scrollEnabled: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true // Set to false for production
  }
};

export default config;
