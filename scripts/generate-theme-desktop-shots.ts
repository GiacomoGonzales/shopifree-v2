/**
 * generate-theme-desktop-shots.ts
 * =====================================================
 * Igual que generate-theme-thumbnails.ts pero en viewport DESKTOP. Se usa para
 * la seccion de temas de la landing, donde se muestra un tema a lo ancho dentro
 * de un marco de navegador (los thumbnails moviles siguen saliendo del otro
 * script).
 *
 * Usa el Chrome instalado en el sistema (channel: 'chrome') para no depender de
 * `npx playwright install chromium`.
 *
 * Requisitos:
 *   1) Dev server corriendo:  npm run dev
 *   2) Google Chrome instalado
 *
 * Uso:
 *   npx tsx scripts/generate-theme-desktop-shots.ts velvet prism
 *   SHOT_BASE=http://localhost:5199 npx tsx scripts/generate-theme-desktop-shots.ts velvet
 *
 * Salida: public/themes/desktop/<id>.jpg
 */

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.SHOT_BASE || 'http://localhost:5173'
const OUT = path.resolve(process.cwd(), 'public/themes/desktop')
// Viewport de escritorio 16:10. deviceScaleFactor 2 para que se vea nitido al
// reducirlo dentro del marco de navegador de la landing.
const W = 1440
const H = 900

async function main() {
  const ids = process.argv.slice(2)
  if (!ids.length) {
    console.error('Uso: npx tsx scripts/generate-theme-desktop-shots.ts <themeId> [themeId...]')
    process.exit(1)
  }

  await mkdir(OUT, { recursive: true })
  console.log(`→ ${ids.length} temas · base ${BASE}\n`)

  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })

  let ok = 0
  for (const id of ids) {
    const url = `${BASE}/theme-shot/${id}`
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(2200) // fuentes de Google + imagenes demo
      await page.screenshot({
        path: path.join(OUT, `${id}.jpg`),
        type: 'jpeg',
        quality: 82,
        clip: { x: 0, y: 0, width: W, height: H },
      })
      ok++
      console.log(`  ✓ ${id}`)
    } catch (err) {
      console.warn(`  ✗ ${id} — ${(err as Error).message.split('\n')[0]}`)
    }
  }

  await browser.close()
  console.log(`\n✔ ${ok}/${ids.length} capturas en public/themes/desktop/`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
