// Capturas del panel (Gestion y Clientes) con la tienda de ejemplo AURELIA, sin login y
// sin tocar Firestore. Necesita el servidor aparte de tools/panel-shot corriendo:
//
//   npx vite --config tools/panel-shot/vite.config.ts --port 5198 --strictPort
//   node tools/panel-shot/capturar.mjs [solo-estas,separadas,por-coma]
//
// Sale en C:\Users\giaco\shopifree-estudio\public\capturas\panel\<nombre>.png, en
// tamano celular (390x844 @3x = 1170x2532) y el resumen tambien en escritorio
// (1440x900 @2x). Carpeta de salida y URL se pueden cambiar con PANEL_OUT y PANEL_URL.
//
// El navegador solo habla con el servidor local y con Google Fonts: todo lo demas
// (Analytics, pixel de Meta, Firebase) se corta, asi que estas visitas no cuentan
// en ningun lado.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.PANEL_URL || 'http://localhost:5198'
const OUT = process.env.PANEL_OUT || 'C:/Users/giaco/shopifree-estudio/public/capturas/panel'
const SOLO = (process.argv[2] || '').split(',').map(s => s.trim()).filter(Boolean)
mkdirSync(OUT, { recursive: true })

const PERMITIDOS = new Set([new URL(BASE).host, 'fonts.googleapis.com', 'fonts.gstatic.com'])
const CABECERA_MOVIL = 48 // la barra fija de arriba en celular

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())

async function nuevaPagina(opciones) {
  const context = await browser.newContext({ locale: 'es-PE', ...opciones })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.protocol === 'data:' || url.protocol === 'blob:' || PERMITIDOS.has(url.host)) return route.continue()
    return route.abort()
  })
  // "Pedidos vistos" hace dos dias: la insignia de pedidos nuevos queda chica y creible.
  await context.addInitScript(() => {
    try { localStorage.setItem('ordersSeenAt_demo', String(Date.now() - 2 * 86400000)) } catch { /* sin storage */ }
  })
  const page = await context.newPage()
  page.on('pageerror', e => console.log('  [error de pagina]', e.message))
  page.on('console', m => { if (m.type() === 'error') console.log('  [consola]', m.text()) })
  return { context, page }
}

/** Espera a que la pagina tenga datos: texto presente, sin spinners, fuentes e imagenes cargadas. */
async function esperarLista(page, texto) {
  await page.getByText(texto, { exact: false }).first().waitFor({ timeout: 60000 })
  await page.waitForFunction(() => document.querySelectorAll('.animate-spin').length === 0, null, { timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 0), null, { timeout: 30000 })
  if (new URL(page.url()).pathname.includes('/login')) throw new Error('Redirigio a /login: el mock de sesion no se aplico')
  await page.waitForTimeout(700)
}

async function ir(page, ruta, texto) {
  await page.goto(`${BASE}${ruta}`, { waitUntil: 'load', timeout: 120000 })
  await esperarLista(page, texto)
}

/** Deja el elemento con ese texto arriba, justo debajo de la barra fija. */
async function bajarHasta(page, texto, margen = 12) {
  const el = page.getByText(texto, { exact: true }).first()
  await el.waitFor()
  await el.evaluate((node, [off, cabecera]) => {
    const card = node.closest('.rounded-\\[14px\\]') || node
    const y = card.getBoundingClientRect().top + window.scrollY - off
    window.scrollTo(0, Math.max(0, y))
    // Al final de la pagina no se puede bajar tanto y el borde de la barra fija puede
    // cortar un renglon por la mitad: se sube lo justo para que el corte caiga entre renglones.
    for (let i = 0; i < 6; i++) {
      let arriba = null
      for (const e of document.querySelectorAll('main p, main span, main h1, main h2, main h3, main a, main button, main img, main input, main select')) {
        const r = e.getBoundingClientRect()
        if (r.height > 0 && r.top < cabecera && r.bottom > cabecera + 1) arriba = arriba === null ? r.top : Math.min(arriba, r.top)
      }
      if (arriba === null) break
      window.scrollBy(0, arriba - cabecera - 10)
    }
  }, [CABECERA_MOVIL + margen, CABECERA_MOVIL])
  await page.waitForTimeout(500)
}

async function foto(page, nombre) {
  if (SOLO.length && !SOLO.some(s => nombre.startsWith(s))) return
  await page.screenshot({ path: `${OUT}/${nombre}.png` })
  console.log('ok', nombre)
}

const quiere = (...nombres) => !SOLO.length || nombres.some(n => SOLO.some(s => n.startsWith(s)))

// ── Celular ──────────────────────────────────────────────────────────────────
const movil = await nuevaPagina({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
const p = movil.page

if (quiere('resumen')) {
  await ir(p, '/es/finance', 'Estado de resultados')
  await foto(p, 'resumen')
  await bajarHasta(p, 'Ingresos vs gastos por día')
  await foto(p, 'resumen-2')
  await bajarHasta(p, 'Gastos operativos por categoría')
  await foto(p, 'resumen-3')
}

if (quiere('inventario')) {
  await ir(p, '/es/finance/inventory', 'Unidades totales')
  await foto(p, 'inventario')
  await bajarHasta(p, 'Solo con stock', 8)
  await foto(p, 'inventario-2')
  // Detalle de un producto: stock por almacen y por talla/color
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.getByText('Blusa Bordada Flores', { exact: true }).first().click()
  await p.getByText('Stock por Sucursal y Almacén').first().waitFor()
  await p.waitForTimeout(400)
  await bajarHasta(p, 'Blusa Bordada Flores', 4)
  await foto(p, 'inventario-3')
}

if (quiere('gastos')) {
  await ir(p, '/es/finance/expenses', 'Gastos fijos mensuales')
  await foto(p, 'gastos')
  await bajarHasta(p, 'Pasarela de pago')
  await foto(p, 'gastos-2')
}

if (quiere('flujo-de-caja')) {
  await ir(p, '/es/finance/cashflow', 'Estado de resultados')
  await foto(p, 'flujo-de-caja')
  await bajarHasta(p, 'Gastos operativos por categoría')
  await foto(p, 'flujo-de-caja-2')
}

if (quiere('clientes')) {
  await ir(p, '/es/dashboard/customers', 'Clientes')
  await foto(p, 'clientes')
}

if (quiere('movimientos')) {
  await ir(p, '/es/finance/stock-movements', 'Movimientos de stock')
  await foto(p, 'movimientos')
}

if (quiere('compras')) {
  await ir(p, '/es/finance/purchases', 'Compras')
  await foto(p, 'compras')
}
await movil.context.close()

// ── Escritorio ───────────────────────────────────────────────────────────────
if (quiere('resumen-escritorio')) {
  const esc = await nuevaPagina({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await ir(esc.page, '/es/finance', 'Estado de resultados')
  await foto(esc.page, 'resumen-escritorio')
  await esc.context.close()
}

await browser.close()
