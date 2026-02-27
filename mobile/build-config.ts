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
import { writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import https from 'https'
import http from 'http'
import sharp from 'sharp'

// Android icon densities: name → launcher size (dp*scale), foreground size (108dp*scale)
const ANDROID_DENSITIES = [
  { name: 'mipmap-mdpi',    launcher: 48,  foreground: 108 },
  { name: 'mipmap-hdpi',    launcher: 72,  foreground: 162 },
  { name: 'mipmap-xhdpi',   launcher: 96,  foreground: 216 },
  { name: 'mipmap-xxhdpi',  launcher: 144, foreground: 324 },
  { name: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
]

function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location!).then(resolve).catch(reject)
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function hexToRgba(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
    alpha: 1,
  }
}

async function generateIcons(logoUrl: string, bgColor: string) {
  console.log(`\n  Generating icons from logo: ${logoUrl}`)
  const logoBuffer = await downloadImage(logoUrl)
  const bg = hexToRgba(bgColor)
  const resDir = resolve(process.cwd(), 'android/app/src/main/res')

  for (const density of ANDROID_DENSITIES) {
    const dir = resolve(resDir, density.name)

    // --- ic_launcher.png (square legacy icon) ---
    const lSize = density.launcher
    const lPad = Math.round(lSize * 0.15)
    const lLogoSize = lSize - lPad * 2

    const lLogo = await sharp(logoBuffer)
      .resize(lLogoSize, lLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()

    await sharp({ create: { width: lSize, height: lSize, channels: 4, background: bg } })
      .composite([{ input: lLogo, gravity: 'centre' }])
      .png()
      .toFile(resolve(dir, 'ic_launcher.png'))

    // --- ic_launcher_round.png (circular mask) ---
    const circleSvg = Buffer.from(
      `<svg width="${lSize}" height="${lSize}"><circle cx="${lSize / 2}" cy="${lSize / 2}" r="${lSize / 2}" fill="white"/></svg>`
    )
    const squareIcon = await sharp({ create: { width: lSize, height: lSize, channels: 4, background: bg } })
      .composite([{ input: lLogo, gravity: 'centre' }])
      .png()
      .toBuffer()

    await sharp(squareIcon)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(resolve(dir, 'ic_launcher_round.png'))

    // --- ic_launcher_foreground.png (adaptive icon foreground, 108dp canvas) ---
    const fgSize = density.foreground
    const safeZone = Math.round(fgSize * 0.66) // inner 66% is visible safe zone
    const fgLogoPad = Math.round(safeZone * 0.1)
    const fgLogoSize = safeZone - fgLogoPad * 2

    const fgLogo = await sharp(logoBuffer)
      .resize(fgLogoSize, fgLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()

    await sharp({ create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fgLogo, gravity: 'centre' }])
      .png()
      .toFile(resolve(dir, 'ic_launcher_foreground.png'))

    console.log(`    ✓ ${density.name} (${lSize}px / ${fgSize}px)`)
  }

  // Update background color in values/
  const bgColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${bgColor}</color>
</resources>
`
  writeFileSync(resolve(resDir, 'values/ic_launcher_background.xml'), bgColorXml, 'utf-8')

  // Replace vector drawable background with simple solid color
  const bgDrawableXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="${bgColor}"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`
  writeFileSync(resolve(resDir, 'drawable/ic_launcher_background.xml'), bgDrawableXml, 'utf-8')

  // iOS icon (1024×1024)
  const iosDir = resolve(process.cwd(), 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
  if (existsSync(iosDir)) {
    const iosLogoSize = Math.round(1024 * 0.7)
    const iosLogo = await sharp(logoBuffer)
      .resize(iosLogoSize, iosLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()

    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } })
      .composite([{ input: iosLogo, gravity: 'centre' }])
      .png()
      .toFile(resolve(iosDir, 'AppIcon-512@2x.png'))

    console.log(`    ✓ iOS icon (1024px)`)
  }

  console.log(`    ✓ Background color: ${bgColor}`)
}

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
`

  const outPath = resolve(process.cwd(), 'capacitor.config.ts')
  writeFileSync(outPath, configContent, 'utf-8')

  // Write .env.whitelabel for Vite white-label build
  const envContent = `VITE_WHITELABEL=true\nVITE_STORE_SUBDOMAIN=${subdomain}\n`
  const envPath = resolve(process.cwd(), '.env.whitelabel')
  writeFileSync(envPath, envContent, 'utf-8')

  // Update Android strings.xml with store name and app ID
  const stringsXml = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">${appName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'")}</string>
    <string name="title_activity_main">${appName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'")}</string>
    <string name="package_name">${appId}</string>
    <string name="custom_url_scheme">${appId}</string>
</resources>
`
  const stringsPath = resolve(process.cwd(), 'android/app/src/main/res/values/strings.xml')
  writeFileSync(stringsPath, stringsXml, 'utf-8')

  // Generate app icons from store logo
  const logoUrl = store.logo
  if (logoUrl) {
    await generateIcons(logoUrl, splashColor)
  } else {
    console.log('\n  ⚠ No store logo found, keeping default icons')
  }

  console.log(`\n  Store:   ${store.name}`)
  console.log(`  App ID:  ${appId}`)
  console.log(`  App Name: ${appName}`)
  console.log(`  Config written to: ${outPath}`)
  console.log(`  Env written to:    ${envPath}`)
  console.log(`\n  Next steps:`)
  console.log(`    1. npm run wl:build`)
  console.log(`    2. npx cap sync android  (or ios)`)
  console.log(`    3. npx cap open android  (or ios)`)
  console.log(`    4. Build & sign in Android Studio / Xcode\n`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
