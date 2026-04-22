/**
 * Regenerates Android + iOS icons for the main Shopifree platform app.
 * Uses `public/icon-512.png` as the source and the app's brand background.
 *
 * Usage: npx tsx mobile/build-main-icons.ts
 *
 * Icons are committed to the repo and picked up by build-main-app.yml.
 * Re-run this script whenever the logo or brand color changes.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import sharp from 'sharp'

const LOGO_PATH = resolve(process.cwd(), 'public/icon-512.png')
const BG_COLOR = '#ffffff'

const ANDROID_DENSITIES = [
  { name: 'mipmap-mdpi',    launcher: 48,  foreground: 108 },
  { name: 'mipmap-hdpi',    launcher: 72,  foreground: 162 },
  { name: 'mipmap-xhdpi',   launcher: 96,  foreground: 216 },
  { name: 'mipmap-xxhdpi',  launcher: 144, foreground: 324 },
  { name: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
]

function hexToRgba(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
    alpha: 1,
  }
}

async function main() {
  if (!existsSync(LOGO_PATH)) {
    console.error(`Logo not found at ${LOGO_PATH}`)
    process.exit(1)
  }

  console.log(`  Source logo: ${LOGO_PATH}`)
  console.log(`  Background:  ${BG_COLOR}`)

  const logoBuffer = readFileSync(LOGO_PATH)
  const trimmedLogo = await sharp(logoBuffer)
    .trim({ threshold: 10 })
    .toBuffer()

  const bg = hexToRgba(BG_COLOR)
  const resDir = resolve(process.cwd(), 'android/app/src/main/res')

  for (const density of ANDROID_DENSITIES) {
    const dir = resolve(resDir, density.name)

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

    const fgSize = density.foreground
    const fgLogoSize = Math.round(fgSize * 0.48)

    const fgLogo = await sharp(trimmedLogo)
      .resize(fgLogoSize, fgLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()

    await sharp({ create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fgLogo, gravity: 'centre' }])
      .png()
      .toFile(resolve(dir, 'ic_launcher_foreground.png'))

    console.log(`  ✓ ${density.name} (${lSize}px / ${fgSize}px)`)
  }

  const bgColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
</resources>
`
  writeFileSync(resolve(resDir, 'values/ic_launcher_background.xml'), bgColorXml, 'utf-8')

  const bgDrawableXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="${BG_COLOR}"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`
  writeFileSync(resolve(resDir, 'drawable/ic_launcher_background.xml'), bgDrawableXml, 'utf-8')

  const splashIconSize = 432
  const splashLogoSize = Math.round(splashIconSize * 0.65)
  const splashLogo = await sharp(trimmedLogo)
    .resize(splashLogoSize, splashLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({ create: { width: splashIconSize, height: splashIconSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: splashLogo, gravity: 'centre' }])
    .png()
    .toFile(resolve(resDir, 'drawable/ic_splash_icon.png'))
  console.log(`  ✓ Android splash icon (${splashIconSize}px, transparent bg)`)

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

    console.log(`  ✓ iOS icon (1024px)`)
  }

  console.log(`  ✓ Background color XML written`)
  console.log(`\nDone. Commit the updated PNGs + XMLs to apply in the next build.`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
