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

// Ícono chico de las notificaciones: 24dp en las cinco densidades
const NOTIFICATION_ICON_SIZES = [
  { dir: 'drawable-mdpi',    size: 24 },
  { dir: 'drawable-hdpi',    size: 36 },
  { dir: 'drawable-xhdpi',   size: 48 },
  { dir: 'drawable-xxhdpi',  size: 72 },
  { dir: 'drawable-xxxhdpi', size: 96 },
]

// Color de acento de la notificación si la tienda no tiene uno que se vea
const DEFAULT_NOTIFICATION_COLOR = '#333333'

// Color principal que Mi App pone por defecto (el azul de Shopifree): si la
// tienda no lo cambió, no es su color.
const SHOPIFREE_DEFAULT_PRIMARY = '#1e3a5f'

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

// Proporción de píxeles transparentes (alfa < 128) de una imagen.
async function transparentRatio(buf: Buffer): Promise<number> {
  const alpha = await sharp(buf).ensureAlpha().extractChannel(3).raw().toBuffer()
  let transparent = 0
  for (const a of alpha) if (a < 128) transparent++
  return transparent / alpha.length
}

interface BrandImage {
  /** Imagen lista para usar: sin bordes transparentes y cuadrada si es opaca. */
  buffer: Buffer
  /**
   * true = diseño opaco (un ícono cuadrado con su propio fondo, un JPG...).
   * Se muestra completo: ocupa todo el ícono de la app y va con esquinas
   * redondeadas en el splash. false = logo con fondo transparente, que se
   * centra sobre el color del splash.
   */
  opaque: boolean
  /** Color promedio de las esquinas; fondo del ícono adaptativo si es opaca. */
  edgeColor: string
  /** Color promedio del dibujo (lo que no es fondo). */
  accentColor: string
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

// Color promedio del dibujo: en un diseño opaco, los píxeles lejos del color
// de los bordes; en un logo transparente, los píxeles visibles.
async function accentOf(buffer: Buffer, opaque: boolean, edgeColor: string): Promise<string> {
  const { data } = await sharp(buffer).resize(64, 64, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const edge = hexToRgba(edgeColor)
  const sum = [0, 0, 0]
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    const isForeground = opaque
      ? Math.hypot(data[i] - edge.r, data[i + 1] - edge.g, data[i + 2] - edge.b) > 90
      : data[i + 3] >= 128
    if (!isForeground) continue
    sum[0] += data[i]
    sum[1] += data[i + 1]
    sum[2] += data[i + 2]
    n++
  }
  return n ? toHex(sum.map(v => v / n)) : edgeColor
}

async function prepareBrandImage(url: string): Promise<BrandImage> {
  const raw = await downloadImage(url)
  // Solo se recorta si trae bordes transparentes: trim() usa el color de la
  // esquina como referencia, y en un ícono opaco se comería el fondo del
  // propio diseño.
  let buffer = (await transparentRatio(raw)) >= 0.05
    ? await sharp(raw).trim({ threshold: 10 }).toBuffer()
    : raw
  const opaque = (await transparentRatio(buffer)) < 0.05

  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixel = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels
    return [data[i], data[i + 1], data[i + 2]]
  }
  const m = 2
  const corners = [
    pixel(m, m),
    pixel(info.width - 1 - m, m),
    pixel(m, info.height - 1 - m),
    pixel(info.width - 1 - m, info.height - 1 - m),
  ]
  const edgeColor = toHex([0, 1, 2].map(c => corners.reduce((sum, p) => sum + p[c], 0) / corners.length))

  // Un diseño opaco que no es cuadrado se completa con su color de borde
  // para no recortarlo al llenar el ícono.
  if (opaque && info.width !== info.height) {
    const side = Math.max(info.width, info.height)
    buffer = await sharp(buffer)
      .resize(side, side, { fit: 'contain', background: edgeColor })
      .png()
      .toBuffer()
  }

  const accentColor = await accentOf(buffer, opaque, edgeColor)
  return { buffer, opaque, edgeColor, accentColor }
}

// El diseño con esquinas redondeadas (radio 22%, como un ícono de app), para
// mostrarlo en el splash sin que se vea como un recorte cuadrado.
async function roundedImage(buf: Buffer, size: number): Promise<Buffer> {
  const r = Math.round(size * 0.22)
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/></svg>`
  )
  return sharp(buf)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function generateIcons(brand: BrandImage, bgColor: string) {
  const trimmedLogo = brand.buffer
  const resDir = resolve(process.cwd(), 'android/app/src/main/res')

  if (brand.opaque) {
    await generateFullBleedIcons(brand, resDir)
  } else {
    await generateLogoIcons(trimmedLogo, bgColor, resDir)
  }
  await generateNotificationIcon(brand, resDir)
}

// Diseño opaco: el ícono es la imagen completa. Cada launcher le aplica su
// forma (círculo, squircle), así que se ve entera en vez de un cuadrado chico
// sobre el color del splash. En el ícono adaptativo la imagen ocupa los 72dp
// visibles de los 108 del lienzo, y el fondo es el color de sus bordes para
// que no se note dónde termina.
async function generateFullBleedIcons(brand: BrandImage, resDir: string) {
  const source = brand.buffer
  for (const density of ANDROID_DENSITIES) {
    const dir = resolve(resDir, density.name)
    const lSize = density.launcher

    const square = await sharp(source).resize(lSize, lSize, { fit: 'cover' }).png().toBuffer()
    await sharp(square).toFile(resolve(dir, 'ic_launcher.png'))

    const circleSvg = Buffer.from(
      `<svg width="${lSize}" height="${lSize}"><circle cx="${lSize / 2}" cy="${lSize / 2}" r="${lSize / 2}" fill="white"/></svg>`
    )
    await sharp(square)
      .ensureAlpha()
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(resolve(dir, 'ic_launcher_round.png'))

    const fgSize = density.foreground
    const visible = Math.round(fgSize * 72 / 108)
    const fg = await sharp(source).resize(visible, visible, { fit: 'cover' }).png().toBuffer()
    await sharp({ create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fg, gravity: 'centre' }])
      .png()
      .toFile(resolve(dir, 'ic_launcher_foreground.png'))

    console.log(`    ✓ ${density.name} (${lSize}px / ${fgSize}px, imagen completa)`)
  }

  writeLauncherBackground(resDir, brand.edgeColor)

  // Splash del sistema (Android 12+) y overlay de React: el diseño con
  // esquinas redondeadas, al mismo 32% que un logo transparente.
  const splashIconSize = 432
  const splashIconLogoSize = Math.round(splashIconSize * 0.32)
  const splashIconLogo = await roundedImage(source, splashIconLogoSize)
  await sharp({ create: { width: splashIconSize, height: splashIconSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: splashIconLogo, gravity: 'centre' }])
    .png()
    .toFile(resolve(resDir, 'drawable/ic_splash_icon.png'))
  console.log(`    ✓ drawable/ic_splash_icon.png (esquinas redondeadas)`)

  const publicDir = resolve(process.cwd(), 'public')
  if (existsSync(publicDir)) {
    await sharp(await roundedImage(source, 512)).toFile(resolve(publicDir, 'whitelabel-splash-logo.png'))
    console.log(`    ✓ public/whitelabel-splash-logo.png (esquinas redondeadas)`)
  }

  // iOS: imagen completa y sin transparencia (App Store rechaza íconos con
  // alfa); iOS le pone las esquinas.
  const iosDir = resolve(process.cwd(), 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
  if (existsSync(iosDir)) {
    await sharp(source)
      .resize(1024, 1024, { fit: 'cover' })
      .flatten({ background: brand.edgeColor })
      .png()
      .toFile(resolve(iosDir, 'AppIcon-512@2x.png'))
    console.log(`    ✓ iOS icon (1024px, imagen completa)`)
  }

  console.log(`    ✓ Fondo del ícono adaptativo: ${brand.edgeColor}`)
}

function writeLauncherBackground(resDir: string, color: string) {
  writeFileSync(resolve(resDir, 'values/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${color}</color>
</resources>
`, 'utf-8')

  // Replace vector drawable background with simple solid color
  writeFileSync(resolve(resDir, 'drawable/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="${color}"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`, 'utf-8')
}

// Logo con fondo transparente: se centra sobre el color del splash.
async function generateLogoIcons(trimmedLogo: Buffer, bgColor: string, resDir: string) {
  const bg = hexToRgba(bgColor)

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

  writeLauncherBackground(resDir, bgColor)

  // ic_splash_icon.png — Android 12+ system splash icon (windowSplashScreenAnimatedIcon).
  // This is the FIRST splash users see, before Capacitor's SplashScreen plugin runs.
  // Without regenerating it per-tenant, the user sees a brief flash of the previous
  // store's logo before the configured Amaranto/etc. splash takes over ("double splash").
  // Canvas is 432×432 (the xxxhdpi-equivalent reference size). Android renders the inner
  // 288dp portion of this asset 1:1 inside the splash icon container, so a logo at N%
  // of the 432px canvas appears at N×432/screen_dp percent of screen width. With the
  // logo at 32% of canvas (~138dp), it lands at ~33% of a 411dp screen — matching the
  // React overlay's `width: 32%` so the system splash → overlay handoff has no size
  // jump. Anything bigger (we used to ship 44%) makes the system splash visibly larger
  // than the overlay and the user sees the logo "shrink" mid-launch.
  const splashIconSize = 432
  const splashIconLogoSize = Math.round(splashIconSize * 0.32)
  const splashIconLogo = await sharp(trimmedLogo)
    .resize(splashIconLogoSize, splashIconLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: splashIconSize, height: splashIconSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: splashIconLogo, gravity: 'centre' }])
    .png()
    .toFile(resolve(resDir, 'drawable/ic_splash_icon.png'))
  console.log(`    ✓ drawable/ic_splash_icon.png (Android 12+ system splash)`)

  // public/whitelabel-splash-logo.png — same trimmed logo on a transparent canvas,
  // served from the WebView so the React splash overlay (Catalog.tsx) can render
  // pixel-identical content as the system splash. Without this, the overlay loads
  // the original logo URL — which often has asymmetric transparent padding —
  // and shows a visibly smaller logo than the system splash.
  const publicDir = resolve(process.cwd(), 'public')
  if (existsSync(publicDir)) {
    await sharp(trimmedLogo)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(resolve(publicDir, 'whitelabel-splash-logo.png'))
    console.log(`    ✓ public/whitelabel-splash-logo.png (React splash overlay)`)
  }

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

// ic_stat_notification: el ícono de la barra de estado para las push. Android
// solo usa el canal alfa y pinta todo de blanco, así que sirve la silueta del
// logo cuando el logo trae transparencia. Si es opaco (JPG, fondo sólido) la
// silueta sería un cuadrado blanco y va un círculo. El que está en el repo es
// la bolsa de Shopifree: sin esto las apps de las tiendas la mostrarían.
// Sin logo (null) también va el círculo.
// Silueta blanca (lo único que usa Android: el canal alfa) para el ícono de
// notificación, recortada a su contorno. Logo transparente: su propio alfa.
// Diseño opaco: el dibujo se separa del fondo por la distancia al color de
// los bordes, con un borde suave; así el alien sobre fondo morado da la
// silueta del alien (con los ojos calados) y no un cuadrado. null si no sale
// una silueta usable (casi vacía o casi llena, p. ej. una foto).
async function notificationSilhouette(brand: BrandImage): Promise<Buffer | null> {
  const S = 256
  const { data, info } = await sharp(brand.buffer)
    .resize(S, S, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const edge = hexToRgba(brand.edgeColor)
  const out = Buffer.alloc(info.width * info.height * 4)
  let solid = 0
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1
  for (let p = 0; p < info.width * info.height; p++) {
    const i = p * 4
    let a = data[i + 3]
    if (brand.opaque && a > 0) {
      const d = Math.hypot(data[i] - edge.r, data[i + 1] - edge.g, data[i + 2] - edge.b)
      a = Math.max(0, Math.min(255, Math.round(((d - 40) / 50) * 255)))
    }
    out[i] = out[i + 1] = out[i + 2] = 255
    out[i + 3] = a
    if (a >= 128) {
      solid++
      const x = p % info.width
      const y = Math.floor(p / info.width)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const ratio = solid / (info.width * info.height)
  if (maxX < 0 || ratio < 0.05 || ratio > 0.9) return null
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer()
}

async function generateNotificationIcon(brand: BrandImage | null, resDir: string) {
  const silhouette = brand ? await notificationSilhouette(brand) : null

  for (const { dir, size } of NOTIFICATION_ICON_SIZES) {
    const out = resolve(resDir, dir, 'ic_stat_notification.png')
    if (!silhouette) {
      const r = size * 0.42
      const circle = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="white"/></svg>`
      )
      await sharp(circle).png().toFile(out)
      continue
    }

    const inner = Math.round(size * 0.92)
    const scaled = await sharp(silhouette)
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: scaled, gravity: 'centre' }])
      .png()
      .toFile(out)
  }
  const kind = !silhouette ? 'círculo: no salió una silueta del logo'
    : brand?.opaque ? 'silueta del dibujo, separado de su fondo'
    : 'silueta del logo'
  console.log(`    ✓ ic_stat_notification (${kind})`)
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

async function generateSplashScreens(brand: BrandImage, bgColor: string, storeName: string) {
  console.log(`\n  Generating splash screens...`)

  // La imagen llega sin bordes transparentes (prepareBrandImage), así el logo
  // cae en el centro exacto del splash: las subidas suelen traer márgenes
  // asimétricos que lo corrían. Un diseño opaco va con esquinas redondeadas,
  // igual que en el splash de Android 12+.
  const logoBuffer = brand.opaque ? await roundedImage(brand.buffer, 1024) : brand.buffer

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
      // Disabled: Android 12+ forces a system splash via Theme.SplashScreen
      // anyway, and stacking Capacitor's splash on top of it causes a visible
      // "double flash" (system splash → Capacitor splash → app content). With
      // duration 0 the WebView paints as soon as it's ready, right after the
      // system splash hands off. The same logo is rendered as a React overlay
      // by main-whitelabel.tsx during initial load, so the crossfade still
      // lands on matching content.
      launchShowDuration: 0,
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

  // El "Ícono de la app" que se sube en Mi App es el diseño pensado para el
  // ícono (el mismo que va a la ficha de Play Store); el logo de la tienda
  // queda de respaldo. Se prepara acá porque también da el color de acento.
  const brandUrl: string | undefined = appConfig.icon || store.logo
  const brand = brandUrl ? await prepareBrandImage(brandUrl) : null

  // Color de acento de las push (tiñe el ícono y el encabezado de la
  // notificación). El del repo es el azul de Shopifree. Va el color principal
  // de la tienda si lo eligió; si quedó el azul por defecto, el color del
  // dibujo de su ícono. Nunca uno tan claro que el ícono no se vea sobre blanco.
  const readable = (hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false
    const { r, g, b } = hexToRgba(hex)
    return (r * 299 + g * 587 + b * 114) / 1000 < 200
  }
  const primaryColor = typeof appConfig.primaryColor === 'string' ? appConfig.primaryColor : ''
  const isDefaultPrimary = primaryColor.toLowerCase() === SHOPIFREE_DEFAULT_PRIMARY
  const notificationColor =
    readable(primaryColor) && !isDefaultPrimary ? primaryColor
    : brand && readable(brand.accentColor) ? brand.accentColor
    : readable(primaryColor) ? primaryColor
    : DEFAULT_NOTIFICATION_COLOR
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Color de acento de las notificaciones (generado por build-config.ts) -->
    <color name="notification_color">${notificationColor}</color>
</resources>
`
  writeFileSync(resolve(process.cwd(), 'android/app/src/main/res/values/colors.xml'), colorsXml, 'utf-8')
  console.log(`  ✓ Android notification_color → ${notificationColor}`)

  // Write per-tenant Gradle properties so the Android build picks up the
  // store-specific applicationId. Without this, every white-label AAB would
  // ship with the main Shopifree applicationId and collide with it on Play
  // Console (and on the user's device). build.gradle reads APP_ID from this
  // file at the start of the android{} block. The file is gitignored so each
  // build run produces a fresh value without polluting source control.
  const whitelabelPropsPath = resolve(process.cwd(), 'android/app/whitelabel.properties')
  writeFileSync(whitelabelPropsPath, `APP_ID=${appId}\n`, 'utf-8')
  console.log(`  ✓ android/app/whitelabel.properties → APP_ID=${appId}`)

  // styles.xml: keep the launch theme structure intact and only swap the
  // windowSplashScreenBackground hex so the Android 12+ system splash matches
  // the per-tenant splash color. Hardcoding it here would mean every build
  // shows the previous store's color for the brief moment before Capacitor's
  // SplashScreen plugin takes over.
  const stylesPath = resolve(process.cwd(), 'android/app/src/main/res/values/styles.xml')
  if (existsSync(stylesPath)) {
    const { readFileSync } = await import('fs')
    let styles = readFileSync(stylesPath, 'utf-8')
    styles = styles.replace(
      /(<item name="windowSplashScreenBackground">)#[0-9a-fA-F]{6,8}(<\/item>)/,
      `$1${splashColor}$2`
    )
    writeFileSync(stylesPath, styles, 'utf-8')
    console.log(`  ✓ Android styles.xml windowSplashScreenBackground → ${splashColor}`)
  }

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
  if (brand) {
    console.log(`\n  Imagen de marca: ${appConfig.icon ? 'ícono de la app (Mi App)' : 'logo de la tienda'} → ${brandUrl}`)
    console.log(`    ${brand.opaque ? 'Diseño opaco: imagen completa, esquinas redondeadas en el splash' : 'Logo transparente: centrado sobre el color del splash'}`)
    await generateIcons(brand, splashColor)
    await generateSplashScreens(brand, splashColor, appName)
  } else {
    console.log('\n  ⚠ No store logo found, keeping default icons/splash')
    await generateNotificationIcon(null, resolve(process.cwd(), 'android/app/src/main/res'))
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
