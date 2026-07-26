/**
 * generate-theme-thumbnails.ts
 * =====================================================
 * Captura un thumbnail real de cada tema usando Playwright contra la ruta
 * publica /theme-shot/:themeId (ver src/pages/ThemeShot.tsx).
 *
 * Requisitos:
 *   1) Dev server corriendo:   npm run dev        (por defecto http://localhost:5173)
 *   2) Navegador de Playwright: npx playwright install chromium   (una sola vez)
 *
 * Uso:
 *   npm run thumbnails                 # todos los temas
 *   npm run thumbnails -- receipt chat # solo algunos
 *   SHOT_BASE=http://localhost:5174 npm run thumbnails
 *
 * Salida: public/themes/<id>.webp
 *
 * Se guarda WebP y no PNG a 2x: los 86 PNG pesaban 24 MB (hasta 1,2 MB uno) y
 * /dashboard/branding los pinta todos. En WebP a 390px de ancho son ~20 KB, el
 * mismo formato que ya usan las capturas de la landing.
 */

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { themes } from '../src/themes/index'

const BASE = process.env.SHOT_BASE || 'http://localhost:5173'
const OUT = path.resolve(process.cwd(), 'public/themes')
// Viewport movil (≈ iPhone): la mayoria de clientes navegan en mobile, asi que
// el thumbnail muestra la version mobile. Ancho < 768px activa el layout movil.
const W = 390
const H = 720

async function main() {
  const args = process.argv.slice(2)
  const ids = args.length ? args : themes.map(t => t.id)

  await mkdir(OUT, { recursive: true })
  console.log(`→ ${ids.length} temas · base ${BASE}\n`)

  // channel: 'chrome' usa el Chrome instalado en el sistema, así no hace falta
  // `npx playwright install chromium` (~150 MB) solo para regenerar thumbnails.
  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true })

  let ok = 0
  for (const id of ids) {
    const url = `${BASE}/theme-shot/${id}`
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      // Dar tiempo a fuentes de Google + imagenes demo a asentarse
      await page.waitForTimeout(1800)
      // Se captura a 2x para que el texto salga nitido y luego se reduce a
      // ancho real: mejor resultado que capturar directamente a 1x.
      const shot = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })
      const out = await sharp(shot).resize({ width: W }).webp({ quality: 78 }).toBuffer()
      await writeFile(path.join(OUT, `${id}.webp`), out)
      ok++
      console.log(`  ✓ ${id}  ${Math.round(out.length / 1024)} KB`)
    } catch (err) {
      console.warn(`  ✗ ${id} — ${(err as Error).message.split('\n')[0]}`)
    }
  }

  await browser.close()
  console.log(`\n✔ ${ok}/${ids.length} thumbnails en public/themes/`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
