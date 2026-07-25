/**
 * prerender.ts
 * =====================================================
 * Genera HTML estatico de las paginas de marketing despues de `vite build`.
 *
 * Por que hace falta: la app es un SPA renderizado en el cliente y vercel.json
 * reescribe todo a index.html. Google ejecuta JavaScript y ve el contenido, pero
 * los rastreadores de IA (GPTBot, ClaudeBot, PerplexityBot...) normalmente NO lo
 * ejecutan: piden la URL y leen el HTML tal cual. Sin prerender, los 16
 * articulos del blog les devuelven la misma cascara vacia, con el titulo y el
 * canonical de la landing.
 *
 * Como funciona: levanta un servidor estatico sobre dist/, visita cada ruta con
 * un navegador real, espera a que React monte y guarda el HTML resultante en
 * dist/<ruta>/index.html. Vercel sirve el sistema de archivos antes que los
 * rewrites, asi que esos archivos ganan sobre el fallback a index.html.
 *
 * Tolerante a fallos: si no hay navegador disponible (por ejemplo en un entorno
 * de CI sin Chrome), avisa y termina con exito para no romper el despliegue; el
 * sitio sigue funcionando como SPA.
 */
import { chromium, type Browser } from 'playwright'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { blogPosts } from '../src/pages/blog/blogData'

const DIST = path.resolve(process.cwd(), 'dist')
// Copia versionada del prerender. El build de Vercel corre en Amazon Linux y
// el chromium de Playwright no arranca ahi (le faltan librerias del sistema y
// no hay root para instalarlas), asi que el HTML se genera en la maquina del
// desarrollador, se commitea, y en el servidor solo se copia.
const SNAPSHOT = path.resolve(process.cwd(), 'prerendered')
const PORT = Number(process.env.PRERENDER_PORT || 4183)

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.ico': 'image/x-icon',
}

/** Servidor estatico con fallback a index.html, igual que hace Vercel. */
function serveDist() {
  return createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0])
    let file = path.join(DIST, url)
    if (!existsSync(file) || !path.extname(file)) file = path.join(DIST, 'index.html')
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
}

/** Copia el prerender versionado a dist/ cuando no hay navegador disponible. */
async function copySnapshot() {
  if (!existsSync(SNAPSHOT)) {
    console.warn('           y no hay copia en prerendered/ — se omite el prerender.')
    console.warn('           El sitio funciona como SPA, pero los rastreadores de IA no veran')
    console.warn('           el contenido. Genera la copia con: npm run prerender')
    return
  }
  let n = 0
  for (const route of routes) {
    const from = path.join(SNAPSHOT, route, 'index.html')
    if (!existsSync(from)) continue
    const dir = path.join(DIST, route)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'index.html'), await readFile(from), 'utf-8')
    n++
  }
  console.log(`prerender: ${n}/${routes.length} paginas copiadas desde prerendered/`)
  if (n < routes.length) {
    console.warn('           Faltan paginas: corre `npm run prerender` en local y commitea el resultado.')
  }
}

const routes = [
  '/es',
  '/en',
  '/es/blog',
  ...blogPosts.map(p => `/es/blog/${p.slug}`),
]

async function launch(): Promise<Browser | null> {
  // En Vercel no hay navegador que pueda arrancar, asi que conviene saltarse
  // el intento y usar directamente la copia versionada.
  if (process.env.PRERENDER_FROM_SNAPSHOT === '1') {
    console.log('prerender: PRERENDER_FROM_SNAPSHOT=1 — se usa la copia versionada.')
    return null
  }
  // Preferimos el Chrome del sistema (no requiere descarga); si no esta,
  // probamos el chromium de Playwright.
  const errors: string[] = []
  for (const [label, opts] of [['chrome del sistema', { channel: 'chrome' }], ['chromium de playwright', {}]] as const) {
    try {
      return await chromium.launch(opts as Parameters<typeof chromium.launch>[0])
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message.split('\n')[0]}`)
    }
  }
  // Registramos el motivo real: sin esto, un chromium presente pero que no
  // arranca (faltan librerias del sistema) parece "no hay navegador".
  errors.forEach(e => console.warn(`           ${e}`))
  return null
}

async function main() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.warn('prerender: no existe dist/index.html — se omite (corre vite build antes)')
    return
  }

  const browser = await launch()
  if (!browser) {
    if (process.env.PRERENDER_FROM_SNAPSHOT !== '1') {
      console.warn('prerender: no se pudo abrir un navegador.')
    }
    await copySnapshot()
    return
  }

  const server = serveDist()
  await new Promise<void>(resolve => server.listen(PORT, resolve))

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  let ok = 0
  const failed: string[] = []

  for (const route of routes) {
    try {
      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 30000 })
      // Esperamos a que React haya montado contenido real, no la cascara vacia.
      await page.waitForFunction(() => {
        const root = document.getElementById('root')
        return !!root && root.innerHTML.length > 2000
      }, { timeout: 20000 })
      await page.waitForTimeout(400)

      const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML)

      for (const base of [DIST, SNAPSHOT]) {
        const dir = path.join(base, route)
        await mkdir(dir, { recursive: true })
        await writeFile(path.join(dir, 'index.html'), html, 'utf-8')
      }
      ok++
      console.log(`  ✓ ${route}  (${Math.round(html.length / 1024)} KB)`)
    } catch (err) {
      failed.push(route)
      console.warn(`  ✗ ${route} — ${(err as Error).message.split('\n')[0]}`)
    }
  }

  await browser.close()
  await new Promise<void>(resolve => server.close(() => resolve()))

  console.log(`\nprerender: ${ok}/${routes.length} paginas`)
  if (failed.length) console.warn(`  sin prerenderizar: ${failed.join(', ')}`)
}

main().catch(err => {
  // Nunca rompemos el build por el prerender: el SPA sigue sirviendo.
  console.warn('prerender: fallo inesperado, se omite —', (err as Error).message)
})
