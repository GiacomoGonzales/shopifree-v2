/**
 * Respuestas de ejemplo para las llamadas del panel admin a /api/* (panel-shot).
 *
 * Lo importa mock-auth.tsx; solo actua si la pagina se abrio en una ruta /admin. Envuelve window.fetch: las URL
 * que contienen una de las rutas de abajo responden con JSON inventado (con la
 * misma forma que el api/*.ts real) tras una pequena espera; todo lo demas pasa
 * al fetch de siempre. Ojo: en dev apiUrl() apunta a https://shopifree.app/api,
 * asi que cualquier ruta admin que NO este aqui saldria a produccion (con un
 * token falso, que el servidor rechaza con 401/403).
 */
import { DEMO_INVOICES, esRutaAdmin, resumenAhora } from './demo-admin'

type Cuerpo = Record<string, unknown>
type Manejador = (body: Cuerpo, url: URL) => unknown | Promise<unknown>

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

const RUTAS: [string, Manejador][] = [
  // POST: recalcula y devuelve el ResumenAdmin (api/admin-stats.ts responde el resumen tal cual).
  ['/api/admin-stats', () => resumenAhora()],

  ['/api/sync-subscription', body => {
    const action = (body.action as string) || 'sync'
    if (action === 'list-payments') {
      const limit = Math.min(Number(body.limit) || 50, 100)
      const desde = body.starting_after ? DEMO_INVOICES.findIndex(i => i.id === body.starting_after) + 1 : 0
      const payments = DEMO_INVOICES.slice(desde, desde + limit)
      return { payments, hasMore: desde + limit < DEMO_INVOICES.length, lastId: payments[payments.length - 1]?.id || null }
    }
    if (action === 'payments-total') {
      // Como el real: suma todas las facturas sin separar moneda.
      return { totalAmount: Math.round(DEMO_INVOICES.reduce((s, i) => s + i.amount, 0) * 100) / 100, totalCount: DEMO_INVOICES.length }
    }
    if (action === 'cancel') return { success: true, canceled: true, subscriptionId: 'sub_demo' }
    return { success: true, status: 'active', plan: 'pro', message: 'Subscription synced: active' }
  }],

  ['/api/admin-trigger-app-build', () => ({ ok: true })],
  ['/api/admin-mark-app-published', () => ({ ok: true })],
  ['/api/admin-trigger-screenshot', () => ({ ok: true })],

  ['/api/admin-resync-stock', (_body, url) => {
    const fix = url.searchParams.get('fix') === 'true' || url.searchParams.get('fix') === '1'
    const storeId = url.searchParams.get('storeId')
    const drifts = [
      { storeId: storeId || 'demo', productId: 'p-zapatillas-urbanas', productName: 'Zapatillas Urbanas', productStock: 6, combinationSum: 4, drift: 2, fixed: fix },
      { storeId: storeId || 'st-modainka', productId: 'st-modainka-p3', productName: 'Blusa de lino', productStock: 12, combinationSum: 9, drift: 3, fixed: fix },
    ]
    return { mode: fix ? 'apply' : 'dryRun', scope: storeId ? `store:${storeId}` : 'all-stores', storesScanned: storeId ? 1 : 60, driftedProducts: drifts.length, drifts }
  }],

  // Del Dashboard viejo; lo dejo por si alguna pantalla lo sigue llamando.
  ['/api/admin-rankings', () => {
    const r = resumenAhora().top
    const a = (xs: typeof r.visitas) => xs.map(x => ({ id: x.storeId, name: x.nombre, subdomain: x.subdominio, logo: undefined, plan: 'pro', value: x.valor }))
    return { topByViews: a(r.visitas), topByOrders: a(r.pedidos), topByRevenue: a(r.ingresos), topByWhatsApp: a(r.whatsapp) }
  }],
]

const fetchOriginal = window.fetch.bind(window)

if (esRutaAdmin()) window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const ruta = RUTAS.find(([r]) => href.includes(r))
  if (!ruta) return fetchOriginal(input, init)

  let body: Cuerpo = {}
  try {
    const raw = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined)
    if (typeof raw === 'string' && raw) body = JSON.parse(raw)
  } catch { /* cuerpo no JSON */ }
  const url = new URL(href, window.location.origin)
  console.debug('[panel-shot/api]', ruta[0], body)
  await new Promise(r => setTimeout(r, 250 + Math.random() * 250))
  try {
    return json(await ruta[1](body, url))
  } catch (e) {
    console.error('[panel-shot/api]', e)
    return json({ error: e instanceof Error ? e.message : 'mock error' }, 500)
  }
}
