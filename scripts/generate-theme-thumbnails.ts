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
 * Salida: public/themes/<id>.png
 */

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { themes } from '../src/themes/index'

const BASE = process.env.SHOT_BASE || 'http://localhost:5173'
const OUT = path.resolve(process.cwd(), 'public/themes')
const W = 1100
const H = 760

async function main() {
  const args = process.argv.slice(2)
  const ids = args.length ? args : themes.map(t => t.id)

  await mkdir(OUT, { recursive: true })
  console.log(`→ ${ids.length} temas · base ${BASE}\n`)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

  let ok = 0
  for (const id of ids) {
    const url = `${BASE}/theme-shot/${id}`
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      // Dar tiempo a fuentes de Google + imagenes demo a asentarse
      await page.waitForTimeout(1800)
      await page.screenshot({
        path: path.join(OUT, `${id}.png`),
        clip: { x: 0, y: 0, width: W, height: H },
      })
      ok++
      console.log(`  ✓ ${id}`)
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
