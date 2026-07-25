/**
 * prerender.ts
 * =====================================================
 * Genera HTML estatico de las paginas de marketing despues de `vite build`.
 *
 * Por que hace falta: la app es un SPA renderizado en el cliente y vercel.json
 * reescribe todo a index.html. Google ejecuta JavaScript y ve el contenido, pero
 * los rastreadores de IA (GPTBot, ClaudeBot, PerplexityBot...) normalmente NO lo
 * ejecutan: piden la URL y leen el HTML tal cual. Sin prerender, cada articulo
 * del blog les devuelve la misma cascara vacia, con el titulo y el canonical de
 * la landing.
 *
 * Como funciona:
 *   1. Levanta un servidor estatico sobre dist/ y visita cada ruta con un
 *      navegador real, esperando a que React monte.
 *   2. De cada pagina guarda SOLO lo que no depende del build — los metadatos
 *      del <head> y el markup de #root — en prerendered/<ruta>/page.json.
 *   3. Compone el HTML final inyectando esas partes en el index.html recien
 *      construido.
 *
 * El paso 2 es la parte importante. Los nombres de los assets llevan un hash de
 * contenido que cambia en cada compilacion, asi que guardar el HTML completo
 * ata la copia a un build concreto: al desplegarla contra otro, los <script> y
 * <link> apuntan a archivos inexistentes, Vercel los reescribe a index.html, y
 * el navegador recibe HTML donde espera CSS. La pagina sale sin estilos. Paso.
 *
 * En Vercel el navegador no puede arrancar (build sobre Amazon Linux, chromium
 * de Ubuntu, sin root para instalar las librerias que le faltan), asi que alli
 * se usa la copia versionada: PRERENDER_FROM_SNAPSHOT=1 se salta el intento.
 *
 * Tolerante a fallos: ante cualquier problema deja la ruta sin prerenderizar y
 * termina con exito. La pagina sigue sirviendose como SPA, que funciona bien.
 */
import { chromium, type Browser } from 'playwright'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { blogPosts } from '../src/pages/blog/blogData'

const DIST = path.resolve(process.cwd(), 'dist')
const SNAPSHOT = path.resolve(process.cwd(), 'prerendered')
const PORT = Number(process.env.PRERENDER_PORT || 4183)

interface PageParts {
  /** Tags de <head> con los metadatos SEO y el JSON-LD de la pagina. */
  head: string
  /** Markup renderizado dentro de #root. */
  root: string
}

const routes = [
  '/es',
  '/en',
  '/es/blog',
  ...blogPosts.map(p => `/es/blog/${p.slug}`),
]

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

/**
 * Arma el HTML de una ruta sobre el index.html vigente. Los <script>/<link>
 * salen del armazon, asi que siempre apuntan a los assets de este build.
 */
function compose(shell: string, parts: PageParts): string {
  let html = shell

  // Fuera los metadatos por defecto: los de la pagina son los que valen.
  html = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="(?:title|description|keywords)"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')

  html = html.replace('</head>', `  ${parts.head}\n  </head>`)

  // El contenedor viene vacio del build; lo llenamos con el markup renderizado.
  const rootTag = /(<div id="root">)(\s*)(<\/div>)/
  if (!rootTag.test(html)) throw new Error('no se encontro <div id="root"></div> en index.html')
  html = html.replace(rootTag, `$1${parts.root}$3`)

  return html
}

/** Escribe dist/<ruta>/index.html a partir del armazon y las partes guardadas. */
async function emit(shell: string, route: string, parts: PageParts) {
  const dir = path.join(DIST, route)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.html'), compose(shell, parts), 'utf-8')
}

/** Usa la copia versionada cuando no hay navegador (el caso de Vercel). */
async function fromSnapshot(shell: string) {
  if (!existsSync(SNAPSHOT)) {
    console.warn('           y no hay copia en prerendered/ — se omite el prerender.')
    console.warn('           El sitio funciona como SPA, pero los rastreadores de IA no veran')
    console.warn('           el contenido. Genera la copia con: npm run prerender')
    return
  }
  let n = 0
  const missing: string[] = []
  for (const route of routes) {
    const file = path.join(SNAPSHOT, route, 'page.json')
    if (!existsSync(file)) { missing.push(route); continue }
    try {
      await emit(shell, route, JSON.parse(await readFile(file, 'utf-8')) as PageParts)
      n++
    } catch (err) {
      missing.push(route)
      console.warn(`  ✗ ${route} — ${(err as Error).message}`)
    }
  }
  console.log(`prerender: ${n}/${routes.length} paginas compuestas desde prerendered/`)
  if (missing.length) {
    console.warn(`           Sin copia: ${missing.join(', ')}`)
    console.warn('           Corre `npm run prerender` en local y commitea prerendered/.')
  }
}

async function launch(): Promise<Browser | null> {
  // En Vercel ningun navegador arranca, asi que conviene saltarse el intento.
  if (process.env.PRERENDER_FROM_SNAPSHOT === '1') {
    console.log('prerender: PRERENDER_FROM_SNAPSHOT=1 — se usa la copia versionada.')
    return null
  }
  const errors: string[] = []
  for (const [label, opts] of [
    ['chrome del sistema', { channel: 'chrome' }],
    ['chromium de playwright', {}],
  ] as const) {
    try {
      return await chromium.launch(opts as Parameters<typeof chromium.launch>[0])
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message.split('\n')[0]}`)
    }
  }
  // Sin esto, un chromium presente pero que no arranca (le faltan librerias del
  // sistema) es indistinguible de uno que no esta instalado.
  errors.forEach(e => console.warn(`           ${e}`))
  return null
}

async function main() {
  const shellPath = path.join(DIST, 'index.html')
  if (!existsSync(shellPath)) {
    console.warn('prerender: no existe dist/index.html — se omite (corre vite build antes)')
    return
  }
  const shell = await readFile(shellPath, 'utf-8')

  const browser = await launch()
  if (!browser) {
    if (process.env.PRERENDER_FROM_SNAPSHOT !== '1') {
      console.warn('prerender: no se pudo abrir un navegador.')
    }
    await fromSnapshot(shell)
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

      // Solo los tags que React eleva al <head>. El JSON-LD queda dentro de
      // #root (React 19 no lo eleva), asi que ya viaja en el markup: incluirlo
      // aqui lo duplicaria.
      const parts: PageParts = await page.evaluate(() => ({
        head: [...document.querySelectorAll(
          'title[data-seo], meta[data-seo], link[rel="canonical"][data-seo]'
        )].map(el => el.outerHTML).join('\n    '),
        root: document.getElementById('root')?.innerHTML ?? '',
      }))
      if (!parts.root) throw new Error('#root quedo vacio')

      const dir = path.join(SNAPSHOT, route)
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, 'page.json'), JSON.stringify(parts), 'utf-8')

      await emit(shell, route, parts)
      ok++
      console.log(`  ✓ ${route}  (${Math.round(parts.root.length / 1024)} KB de markup)`)
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
