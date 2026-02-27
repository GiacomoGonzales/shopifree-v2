/**
 * CLI script to generate a store-specific Capacitor config for white-label builds.
 *
 * Usage: npx tsx mobile/build-config.ts <storeId>
 *
 * Requirements:
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars
 *   - Store must have appConfig in Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const storeId = process.argv[2]
if (!storeId) {
  console.error('Usage: npx tsx mobile/build-config.ts <storeId>')
  process.exit(1)
}

async function main() {
  // Initialize Firebase Admin
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    if (!privateKey || !process.env.FIREBASE_PROJECT_ID) {
      console.error('Missing Firebase env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)')
      process.exit(1)
    }
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    })
  }

  const db = getFirestore()
  const storeDoc = await db.collection('stores').doc(storeId).get()

  if (!storeDoc.exists) {
    console.error(`Store ${storeId} not found`)
    process.exit(1)
  }

  const store = storeDoc.data()!
  const appConfig = store.appConfig

  if (!appConfig) {
    console.error(`Store ${storeId} has no appConfig`)
    process.exit(1)
  }

  const subdomain = store.subdomain || storeId
  const appId = `app.shopifree.store.${subdomain.replace(/[^a-z0-9]/gi, '')}`
  const appName = appConfig.appName || store.name || 'Store'
  const splashColor = appConfig.splashColor || '#ffffff'

  const configContent = `import type { CapacitorConfig } from '@capacitor/cli';

// Auto-generated config for store: ${store.name} (${storeId})
// Generated at: ${new Date().toISOString()}

const config: CapacitorConfig = {
  appId: '${appId}',
  appName: '${appName.replace(/'/g, "\\'")}',
  webDir: 'dist',
  backgroundColor: '${splashColor}',
  server: {
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 10000,
      launchAutoHide: false,
      backgroundColor: '${splashColor}',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '${splashColor}'
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true
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
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
`

  const outPath = resolve(process.cwd(), 'capacitor.config.ts')
  writeFileSync(outPath, configContent, 'utf-8')

  console.log(`\n  Store:   ${store.name}`)
  console.log(`  App ID:  ${appId}`)
  console.log(`  App Name: ${appName}`)
  console.log(`  Config written to: ${outPath}`)
  console.log(`\n  Next steps:`)
  console.log(`    1. npx vite build`)
  console.log(`    2. npx cap sync`)
  console.log(`    3. npx cap open android  (or ios)`)
  console.log(`    4. Build & sign in Android Studio / Xcode\n`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
