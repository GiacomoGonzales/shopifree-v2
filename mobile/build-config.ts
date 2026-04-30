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

// Android splash screen sizes per density (portrait w×h, landscape w×h)
const SPLASH_SIZES = [
  { port: 'drawable-port-mdpi',    land: 'drawable-land-mdpi',    pw: 320, ph: 480,  lw: 480,  lh: 320  },
  { port: 'drawable-port-hdpi',    land: 'drawable-land-hdpi',    pw: 480, ph: 800,  lw: 800,  lh: 480  },
  { port: 'drawable-port-xhdpi',   land: 'drawable-land-xhdpi',   pw: 720, ph: 1280, lw: 1280, lh: 720  },
  { port: 'drawable-port-xxhdpi',  land: 'drawable-land-xxhdpi',  pw: 960, ph: 1600, lw: 1600, lh: 960  },
  { port: 'drawable-port-xxxhdpi', land: 'drawable-land-xxxhdpi', pw: 1280, ph: 1920, lw: 1920, lh: 1280 },
]

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

  // Trim transparent/uniform edges so margins are consistent regardless of how
  // the source logo was exported (some come tight, some come with padding)
  const trimmedLogo = await sharp(logoBuffer)
    .trim({ threshold: 10 })
    .toBuffer()

  const bg = hexToRgba(bgColor)
  const resDir = resolve(process.cwd(), 'android/app/src/main/res')

  for (const density of ANDROID_DENSITIES) {
    const dir = resolve(resDir, density.name)

    // --- ic_launcher.png (square legacy icon) — logo ~60% of canvas ---
    const lSize = density.launcher
    const lPad = Math.round(lSize * 0.20)
    const lLogoSize = lSize - lPad * 2

    const lLogo = await sharp(trimmedLogo)
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

    // --- ic_launcher_foreground.png (adaptive icon, 108dp canvas) ---
    // Logo ~48% of canvas — sits well inside the 66dp safe zone with breathing
    // room so launcher masks (circle, squircle, squareish) don't crop visually
    const fgSize = density.foreground
    const fgLogoSize = Math.round(fgSize * 0.48)

    const fgLogo = await sharp(trimmedLogo)
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

  // iOS icon (1024×1024) — logo ~62% of canvas, matching typical App Store icon density
  const iosDir = resolve(process.cwd(), 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
  if (existsSync(iosDir)) {
    const iosLogoSize = Math.round(1024 * 0.62)
    const iosLogo = await sharp(trimmedLogo)
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

// Build a splash image: a centered logo on a solid background. Kept
// deliberately minimal — no text, no rounded card — so the splash reads as a
// single calm brand moment instead of a full screen with hierarchy.
async function buildSplashImage(
  logoBuffer: Buffer,
  bg: { r: number; g: number; b: number; alpha: number },
  _bgColor: string,
  _storeName: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const shortSide = Math.min(width, height)

  // Logo at ~18% of the short side. After scaleAspectFill on a portrait phone
  // (image is square; phone is taller than wide) the logo ends up at roughly
  // 32-35% of screen width — the proportion Apple uses for system splashes.
  const logoSize = Math.round(shortSide * 0.18)

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const topOffset = Math.round((height - logoSize) / 2)
  const logoLeft = Math.round((width - logoSize) / 2)

  return sharp({ create: { width, height, channels: 4, background: bg } })
    .composite([{ input: resizedLogo, top: topOffset, left: logoLeft }])
    .png()
    .toBuffer()
}

async function generateSplashScreens(logoUrl: string, bgColor: string, storeName: string) {
  console.log(`\n  Generating splash screens...`)
  const rawLogoBuffer = await downloadImage(logoUrl)

  // Trim transparent/uniform edges before compositing so the logo lands at the
  // exact geometric center of the splash. Source PNGs from Cloudinary often
  // have asymmetric padding that otherwise shifts the visible logo off-center
  // (this was the cause of the "splash pushed down/sideways" reports).
  const logoBuffer = await sharp(rawLogoBuffer)
    .trim({ threshold: 10 })
    .toBuffer()

  const bg = hexToRgba(bgColor)
  const resDir = resolve(process.cwd(), 'android/app/src/main/res')

  for (const size of SPLASH_SIZES) {
    // Portrait splash
    const portBuf = await buildSplashImage(logoBuffer, bg, bgColor, storeName, size.pw, size.ph)
    writeFileSync(resolve(resDir, size.port, 'splash.png'), portBuf)

    // Landscape splash
    const landBuf = await buildSplashImage(logoBuffer, bg, bgColor, storeName, size.lw, size.lh)
    writeFileSync(resolve(resDir, size.land, 'splash.png'), landBuf)

    console.log(`    ✓ ${size.port} (${size.pw}x${size.ph}) + landscape`)
  }

  // Default drawable/splash.png (480x320)
  const defBuf = await buildSplashImage(logoBuffer, bg, bgColor, storeName, 480, 320)
  writeFileSync(resolve(resDir, 'drawable', 'splash.png'), defBuf)

  console.log(`    ✓ drawable/splash.png (default)`)

  // iOS splash screens (2732x2732 for universal)
  const iosSplashDir = resolve(process.cwd(), 'ios/App/App/Assets.xcassets/Splash.imageset')
  if (existsSync(iosSplashDir)) {
    const iosSplash = await buildSplashImage(logoBuffer, bg, bgColor, storeName, 2732, 2732)
    writeFileSync(resolve(iosSplashDir, 'splash-2732x2732.png'), iosSplash)
    writeFileSync(resolve(iosSplashDir, 'splash-2732x2732-1.png'), iosSplash)
    writeFileSync(resolve(iosSplashDir, 'splash-2732x2732-2.png'), iosSplash)
    console.log(`    ✓ iOS splash (2732x2732)`)
  }
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
  const splashBg = hexToRgba(splashColor)

  // capacitor.config: identical to the working main Shopifree app config —
  // same SplashScreen + StatusBar settings — with only appId/appName/colors
  // swapped per store. This keeps the launch behavior exactly the same as the
  // main app (which the user has confirmed works smoothly).
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
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '${splashColor}',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',             // dark text on light bg
      backgroundColor: '${splashColor}',
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
`

  const outPath = resolve(process.cwd(), 'capacitor.config.ts')
  writeFileSync(outPath, configContent, 'utf-8')

  // Write .env.whitelabel for Vite white-label build.
  // VITE_SPLASH_COLOR is consumed by main-whitelabel.tsx so the body bg, the
  // native loading fallback, and the StatusBar all match the LaunchScreen
  // color — without that, the native splash fades into a screen of a different
  // color and the user sees a visible flash mid-launch.
  // VITE_STORE_LOGO_URL is the same logo baked into the splash image; the
  // Catalog renders it in a React overlay at the same position so the native
  // splash crossfade lands on pixel-identical content (no logo jump).
  const logoLine = store.logo ? `\nVITE_STORE_LOGO_URL=${store.logo}` : ''
  const envContent = `VITE_WHITELABEL=true\nVITE_STORE_SUBDOMAIN=${subdomain}\nVITE_SPLASH_COLOR=${splashColor}${logoLine}\n`
  const envPath = resolve(process.cwd(), '.env.whitelabel')
  writeFileSync(envPath, envContent, 'utf-8')

  // Write build metadata (used by CI workflows to read bundle id + name for signing)
  const metaPath = resolve(process.cwd(), '.build-meta.json')
  writeFileSync(metaPath, JSON.stringify({ appId, appName, subdomain }, null, 2), 'utf-8')

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

  // Update iOS Info.plist with the store's display name. Without this, the
  // home-screen label stays as whatever was last committed (e.g. "Shopifree").
  // CFBundleName references $(PRODUCT_NAME) so it's set by the Xcode project's
  // build settings — Fastlane handles that on CI; for local builds the name
  // shown on the home screen is CFBundleDisplayName, which we patch here.
  // We also pin UIStatusBarStyle + UIViewControllerBasedStatusBarAppearance
  // so the status bar text color matches the splash from the very first frame
  // (otherwise iOS shows the default light-content style during LaunchScreen
  // and the user sees the bar "appear" the moment Capacitor reconfigures it).
  const infoPlistPath = resolve(process.cwd(), 'ios/App/App/Info.plist')
  if (existsSync(infoPlistPath)) {
    const escapedAppName = appName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const splashIsDark =
      (splashBg.r * 299 + splashBg.g * 587 + splashBg.b * 114) / 1000 < 128
    const statusBarStyle = splashIsDark
      ? 'UIStatusBarStyleLightContent'
      : 'UIStatusBarStyleDarkContent'
    const { readFileSync } = await import('fs')
    let plist = readFileSync(infoPlistPath, 'utf-8')
    plist = plist.replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${escapedAppName}$2`
    )
    // UIViewControllerBasedStatusBarAppearance → false so Info.plist controls
    // the launch-time status bar style.
    plist = plist.replace(
      /(<key>UIViewControllerBasedStatusBarAppearance<\/key>\s*)<true\/>/,
      `$1<false/>`
    )
    // UIStatusBarStyle: replace if present, otherwise insert before </dict>.
    if (/<key>UIStatusBarStyle<\/key>/.test(plist)) {
      plist = plist.replace(
        /(<key>UIStatusBarStyle<\/key>\s*<string>)[^<]*(<\/string>)/,
        `$1${statusBarStyle}$2`
      )
    } else {
      plist = plist.replace(
        /<\/dict>\s*<\/plist>/,
        `\t<key>UIStatusBarStyle</key>\n\t<string>${statusBarStyle}</string>\n</dict>\n</plist>`
      )
    }
    writeFileSync(infoPlistPath, plist, 'utf-8')
    console.log(`  ✓ iOS Info.plist CFBundleDisplayName → "${appName}"`)
    console.log(`  ✓ iOS Info.plist UIStatusBarStyle → ${statusBarStyle}`)
  }

  // LaunchScreen.storyboard: keep the exact structure that ships with the
  // main Shopifree app (which the user has confirmed renders smoothly), only
  // swap the view's backgroundColor to splashColor. No structural rewrites,
  // no AppDelegate changes — anything fancier has caused regressions.
  const splashRgb01 = {
    r: (splashBg.r / 255).toFixed(6),
    g: (splashBg.g / 255).toFixed(6),
    b: (splashBg.b / 255).toFixed(6),
  }
  const launchScreenPath = resolve(process.cwd(), 'ios/App/App/Base.lproj/LaunchScreen.storyboard')
  if (existsSync(launchScreenPath)) {
    const { readFileSync } = await import('fs')
    let storyboard = readFileSync(launchScreenPath, 'utf-8')
    storyboard = storyboard.replace(
      /<color key="backgroundColor"[^/]*\/>/,
      `<color key="backgroundColor" red="${splashRgb01.r}" green="${splashRgb01.g}" blue="${splashRgb01.b}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>`
    )
    writeFileSync(launchScreenPath, storyboard, 'utf-8')
    console.log(`  ✓ LaunchScreen.storyboard background → ${splashColor}`)
  }

  // Generate app icons and splash screens from store logo
  const logoUrl = store.logo
  if (logoUrl) {
    await generateIcons(logoUrl, splashColor)
    await generateSplashScreens(logoUrl, splashColor, appName)
  } else {
    console.log('\n  ⚠ No store logo found, keeping default icons/splash')
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
