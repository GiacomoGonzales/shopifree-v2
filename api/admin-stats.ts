/**
 * /api/admin-stats — calcula las cifras del Resumen del admin y las guarda en
 * el documento `adminStats/resumen`, que la página lee de un tirón.
 *
 * - GET con `Authorization: Bearer $CRON_SECRET` (Vercel Cron, 05:00 Lima):
 *   calcula, guarda y responde { ok: true }.
 * - POST con el ID token de un admin (botón "Actualizar ahora"): calcula,
 *   guarda y devuelve el objeto.
 *
 * Por qué un documento precalculado: antes el Dashboard bajaba la colección
 * `stores` completa en el navegador y además llamaba a /api/admin-rankings,
 * que descargaba TODOS los pedidos de TODAS las tiendas para sumar ingresos.
 * Abrir el admin tardaba y costaba lecturas cada vez.
 *
 * Lecturas por corrida:
 * - stores: una lectura de la colección (solo los campos que se usan).
 * - users y products (collectionGroup): un count() cada uno.
 * - Top: 4 agregaciones por tienda (visitas, WhatsApp, pedidos+ingresos
 *   totales y pedidos+ingresos cancelados). Los ingresos salen con sum() en
 *   Firestore, sin bajar pedidos.
 * - Stripe: suscripciones activas y facturas pagadas de los últimos 12 meses.
 *
 * Cada bloque (Stripe MRR, Stripe cobros, top) va en su try/catch y deja el
 * error en su campo `error` en vez de tumbar todo el cálculo.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, AggregateField, type Firestore } from 'firebase-admin/firestore'
import { isAdminToken } from './_shared/admin.js'
import { ESTADOS, aFecha, estadoComercial, fechaVencimiento, normalizarPlan, type DatosPlan, type EstadoComercial } from './_shared/adminModelo.js'

export const config = {
  maxDuration: 300,
}

// ── Contrato ─────────────────────────────────────────────────────────────
// COPIA de ResumenAdmin en src/lib/admin/tipos.ts (api/ no puede importar de
// src/). Cambiar un campo aquí = cambiarlo allá.

type PorMoneda = Record<string, number>

interface TopItem {
  storeId: string
  nombre: string
  subdominio: string
  valor: number
  moneda?: string
}

interface ResumenAdmin {
  calculadoEn: string
  origen: string
  duracionMs: number
  tiendas: { total: number; nuevasHoy: number; nuevas7d: number; nuevasMes: number; nuevasMesAnteriorMismoDia: number }
  usuarios: { total: number }
  productos: { total: number }
  estados: Record<EstadoComercial, number>
  pagando: { pro: number; business: number; total: number }
  conversion: { cohorteDias: number; terminaronPrueba: number; pagan: number }
  mrr: { porMoneda: PorMoneda; suscripciones: number; anuales: number; error?: string }
  cobros: { hoy: PorMoneda; mes: PorMoneda; mesAnteriorMismoDia: PorMoneda; mesAnterior: PorMoneda; error?: string }
  serie12m: Array<{ mes: string; altas: number; cobrado: PorMoneda; nuevasPagando: number }>
  paises: Array<{ pais: string; tiendas: number; pagando: number }>
  top: { visitas: TopItem[]; pedidos: TopItem[]; whatsapp: TopItem[]; ingresos: TopItem[]; error?: string }
  venceProximo: Array<{ storeId: string; nombre: string; subdominio: string; estado: EstadoComercial; vence: string }>
}

// ── Clientes ─────────────────────────────────────────────────────────────

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      })
    }
    db = getFirestore()
  }
  return db
}

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

async function verifyAdmin(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  try {
    getDb()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7))
    return isAdminToken(decoded)
  } catch {
    return false
  }
}

// ── Fechas en hora de Lima ───────────────────────────────────────────────
// "Hoy" y "este mes" son de Lima (UTC-5 todo el año, sin horario de verano),
// no del servidor (UTC): si no, a las 8 p. m. de Lima ya sería "mañana".

const LIMA_MS = 5 * 3600 * 1000
const DIA_MS = 86400 * 1000

/** Año y mes (0-11) en Lima de un instante. */
function mesLima(ms: number): { y: number; m: number } {
  const d = new Date(ms - LIMA_MS)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
}

/** Instante en que empieza el mes (y, m) en Lima. m puede salirse de 0-11. */
function inicioMesLima(y: number, m: number): number {
  return Date.UTC(y, m, 1) + LIMA_MS
}

function inicioDiaLima(ms: number): number {
  const d = new Date(ms - LIMA_MS)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + LIMA_MS
}

function claveMes(ms: number): string {
  const { y, m } = mesLima(ms)
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

// Monedas sin decimales en Stripe: el monto ya viene en unidades enteras
// (dividir entre 100 mostraría 1/100 de lo cobrado).
const SIN_DECIMALES = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'])

/** Monto de Stripe (unidad mínima) a unidades de la moneda. */
function deStripe(monto: number, moneda: string): number {
  return SIN_DECIMALES.has(moneda.toLowerCase()) ? monto : monto / 100
}

function sumar(obj: PorMoneda, moneda: string, monto: number) {
  obj[moneda] = Math.round(((obj[moneda] || 0) + monto) * 100) / 100
}

/** Corre fn sobre items con como mucho `limite` a la vez (no abrir cientos de sockets). */
async function mapConcurrente<T, R>(items: T[], limite: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const res: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      res[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, worker))
  return res
}

// ── Tiendas ──────────────────────────────────────────────────────────────

interface Tienda {
  id: string
  nombre: string
  subdominio: string
  moneda: string
  pais: string
  creada: number | null
  trialEndsAt: number | null
  estado: EstadoComercial
  plan: 'free' | 'pro' | 'business'
  vence: Date | null
}

async function leerTiendas(ahora: number): Promise<Tienda[]> {
  // select(): solo los campos que el Resumen usa; un doc de tienda trae
  // tema, secciones, textos… que aquí no sirven.
  const snap = await getDb().collection('stores')
    .select('name', 'subdomain', 'currency', 'country', 'location.country', 'createdAt', 'plan', 'trialEndsAt', 'planExpiresAt', 'subscription')
    .get()
  return snap.docs.map(doc => {
    const d = doc.data()
    const datosPlan: DatosPlan = {
      plan: d.plan as string,
      trialEndsAt: d.trialEndsAt,
      planExpiresAt: d.planExpiresAt,
      subscription: (d.subscription || null) as DatosPlan['subscription'],
    }
    const location = (d.location || {}) as Record<string, unknown>
    return {
      id: doc.id,
      nombre: String(d.name || '(sin nombre)'),
      subdominio: String(d.subdomain || ''),
      moneda: String(d.currency || 'USD'),
      pais: String(location.country || d.country || '').toUpperCase(),
      creada: aFecha(d.createdAt)?.getTime() ?? null,
      trialEndsAt: aFecha(d.trialEndsAt)?.getTime() ?? null,
      estado: estadoComercial(datosPlan, ahora),
      plan: normalizarPlan(d.plan as string),
      vence: fechaVencimiento(datosPlan, ahora),
    }
  })
}

// ── Stripe: MRR ──────────────────────────────────────────────────────────

/** Factor para llevar un precio recurrente a "por mes". */
function factorMensual(intervalo?: string, cada = 1): number {
  const n = cada || 1
  if (intervalo === 'year') return 1 / (12 * n)
  if (intervalo === 'week') return 52 / 12 / n
  if (intervalo === 'day') return 365 / 12 / n
  return 1 / n
}

async function calcularMrr(stripe: Stripe, ahora: number): Promise<ResumenAdmin['mrr']> {
  const porMoneda: PorMoneda = {}
  let suscripciones = 0
  let anuales = 0
  // Cupones ya leídos: los descuentos de la lista traen solo el id del cupón.
  const cupones = new Map<string, Stripe.Coupon | null>()

  async function cupon(c: string | Stripe.Coupon | null | undefined): Promise<Stripe.Coupon | null> {
    if (!c) return null
    if (typeof c !== 'string') return c
    if (!cupones.has(c)) {
      try { cupones.set(c, await stripe.coupons.retrieve(c)) } catch { cupones.set(c, null) }
    }
    return cupones.get(c) || null
  }

  // Solo 'active': las 'trialing' de Stripe todavía no cobraron nada.
  for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.discounts'] })) {
    suscripciones++
    const moneda = sub.currency
    let mensual = 0
    let esAnual = false
    for (const item of sub.items.data) {
      const precio = item.price
      const rec = precio.recurring
      if (rec?.interval === 'year') esAnual = true
      mensual += deStripe((precio.unit_amount || 0) * (item.quantity ?? 1), moneda) * factorMensual(rec?.interval, rec?.interval_count)
    }
    if (esAnual) anuales++

    // Descuentos de la suscripción, solo los vigentes: % sobre el total o
    // monto fijo en la misma moneda (por factura, llevado a mes con el
    // intervalo del primer ítem). Descuentos por ítem no se consideran.
    const rec0 = sub.items.data[0]?.price.recurring
    for (const desc of sub.discounts || []) {
      if (typeof desc === 'string') continue
      if (desc.end && desc.end * 1000 < ahora) continue
      const c = await cupon(desc.source?.coupon)
      if (!c) continue
      if (c.percent_off) mensual *= 1 - c.percent_off / 100
      else if (c.amount_off && c.currency === moneda) mensual -= deStripe(c.amount_off, moneda) * factorMensual(rec0?.interval, rec0?.interval_count)
    }
    sumar(porMoneda, moneda, Math.max(0, mensual))
  }
  return { porMoneda, suscripciones, anuales }
}

// ── Stripe: cobros ───────────────────────────────────────────────────────

interface Cobros {
  cobros: ResumenAdmin['cobros']
  cobradoPorMes: Map<string, PorMoneda>
  nuevasPorMes: Map<string, number>
}

async function calcularCobros(stripe: Stripe, ahora: number): Promise<Cobros> {
  const { y, m } = mesLima(ahora)
  const inicioVentana = inicioMesLima(y, m - 11)
  const inicioMes = inicioMesLima(y, m)
  const inicioMesAnt = inicioMesLima(y, m - 1)
  // "Mes anterior al mismo día": el mismo trecho transcurrido de este mes,
  // contado desde el 1 del mes anterior, sin pasarse de su fin.
  const corteMesAnt = Math.min(inicioMesAnt + (ahora - inicioMes), inicioMes)
  const inicioHoy = inicioDiaLima(ahora)

  const cobros: ResumenAdmin['cobros'] = { hoy: {}, mes: {}, mesAnteriorMismoDia: {}, mesAnterior: {} }
  const cobradoPorMes = new Map<string, PorMoneda>()
  const nuevasPorMes = new Map<string, Set<string>>()

  // Se filtra por fecha de creación con un margen (una factura creada a fin
  // de mes puede pagarse días después) y se agrupa por fecha de pago.
  const creadaDesde = Math.floor((inicioVentana - 40 * DIA_MS) / 1000)
  for await (const inv of stripe.invoices.list({ status: 'paid', limit: 100, created: { gte: creadaDesde } })) {
    if (!inv.amount_paid) continue
    const pagada = (inv.status_transitions?.paid_at || inv.created) * 1000
    if (pagada < inicioVentana) continue
    const moneda = inv.currency
    const monto = deStripe(inv.amount_paid, moneda)
    const mes = claveMes(pagada)

    const delMes = cobradoPorMes.get(mes) || {}
    sumar(delMes, moneda, monto)
    cobradoPorMes.set(mes, delMes)

    if (pagada >= inicioHoy) sumar(cobros.hoy, moneda, monto)
    if (pagada >= inicioMes) sumar(cobros.mes, moneda, monto)
    if (pagada >= inicioMesAnt && pagada < inicioMes) sumar(cobros.mesAnterior, moneda, monto)
    if (pagada >= inicioMesAnt && pagada < corteMesAnt) sumar(cobros.mesAnteriorMismoDia, moneda, monto)

    // "Nuevas pagando" del mes = primeras facturas de suscripción
    // (billing_reason 'subscription_create') pagadas ese mes, una por cliente.
    // Es el primer cobro real de cada suscripción, sin tener que recorrer el
    // historial completo de Stripe para saber cuál fue la primera factura de
    // cada cliente. Las pruebas de 7 días de Shopifree no generan factura.
    if (inv.billing_reason === 'subscription_create') {
      const cliente = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || inv.id
      const set = nuevasPorMes.get(mes) || new Set<string>()
      set.add(cliente || '')
      nuevasPorMes.set(mes, set)
    }
  }

  return {
    cobros,
    cobradoPorMes,
    nuevasPorMes: new Map([...nuevasPorMes].map(([k, v]) => [k, v.size])),
  }
}

// ── Top tiendas ──────────────────────────────────────────────────────────

const TOP_N = 10
const CONCURRENCIA = 20

interface Metricas { visitas: number; whatsapp: number; pedidos: number; ingresos: number }

async function metricasTienda(storeId: string): Promise<Metricas> {
  const ref = getDb().collection('stores').doc(storeId)
  const pedidos = ref.collection('orders')
  // count() y sum() corren en Firestore y devuelven un número: no se baja
  // ningún evento ni pedido. Cancelados se restan aparte (igualdad en vez de
  // `!=`, que dejaría fuera los pedidos sin campo status). sum() ignora
  // totales que no sean número.
  const agregado = { n: AggregateField.count(), total: AggregateField.sum('total') }
  const [visitas, whatsapp, todos, cancelados] = await Promise.all([
    ref.collection('analytics').where('type', '==', 'page_view').count().get(),
    ref.collection('analytics').where('type', '==', 'whatsapp_click').count().get(),
    pedidos.aggregate(agregado).get(),
    pedidos.where('status', '==', 'cancelled').aggregate(agregado).get(),
  ])
  const t = todos.data()
  const c = cancelados.data()
  return {
    visitas: visitas.data().count,
    whatsapp: whatsapp.data().count,
    pedidos: Math.max(0, t.n - c.n),
    ingresos: Math.max(0, (Number(t.total) || 0) - (Number(c.total) || 0)),
  }
}

async function calcularTop(tiendas: Tienda[], limiteMs: number): Promise<ResumenAdmin['top']> {
  let fallidas = 0
  let sinTiempo = 0
  const metricas = await mapConcurrente(tiendas, CONCURRENCIA, async t => {
    // Presupuesto de tiempo: si se acaba, las tiendas que faltan quedan en 0
    // y se avisa, para que la función alcance a guardar el documento.
    if (Date.now() > limiteMs) { sinTiempo++; return null }
    try {
      return await metricasTienda(t.id)
    } catch (err) {
      fallidas++
      console.error(`[admin-stats] métricas de ${t.id}:`, err)
      return null
    }
  })

  const ranking = (campo: keyof Metricas, conMoneda = false): TopItem[] =>
    tiendas
      .map((t, i) => ({ t, v: metricas[i]?.[campo] || 0 }))
      .filter(x => x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, TOP_N)
      .map(({ t, v }) => ({
        storeId: t.id,
        nombre: t.nombre,
        subdominio: t.subdominio,
        valor: Math.round(v * 100) / 100,
        ...(conMoneda ? { moneda: t.moneda } : {}),
      }))

  const rankingPorMoneda = (): TopItem[] => {
    const grupos = new Map<string, Array<{ t: (typeof tiendas)[number]; v: number }>>()
    tiendas.forEach((t, i) => {
      const v = metricas[i]?.ingresos || 0
      if (v <= 0) return
      const moneda = (t.moneda || 'USD').toUpperCase()
      if (!grupos.has(moneda)) grupos.set(moneda, [])
      grupos.get(moneda)!.push({ t, v })
    })
    return [...grupos.entries()].flatMap(([moneda, lista]) =>
      lista.sort((a, b) => b.v - a.v).slice(0, TOP_N).map(({ t, v }) => ({
        storeId: t.id, nombre: t.nombre, subdominio: t.subdominio, valor: Math.round(v * 100) / 100, moneda,
      })))
  }

  const top: ResumenAdmin['top'] = {
    visitas: ranking('visitas'),
    pedidos: ranking('pedidos'),
    whatsapp: ranking('whatsapp'),
    // Ingresos: top 10 DENTRO de cada moneda. Ordenar soles contra pesos
    // colombianos por el número crudo ponía siempre primero a COP/ARS.
    ingresos: rankingPorMoneda(),
  }
  const avisos: string[] = []
  if (sinTiempo) avisos.push(`${sinTiempo} tiendas sin calcular por falta de tiempo`)
  if (fallidas) avisos.push(`${fallidas} tiendas fallaron`)
  if (avisos.length) top.error = `Top parcial: ${avisos.join(', ')}.`
  return top
}

// ── Cálculo completo ─────────────────────────────────────────────────────

const COHORTE_DIAS = 90
// Margen para guardar el documento antes de los 300 s de la función.
const PRESUPUESTO_TOP_MS = 220 * 1000

function mensajeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function calcular(origen: 'cron' | 'manual'): Promise<ResumenAdmin> {
  const inicio = Date.now()
  const ahora = inicio
  const firestore = getDb()
  const stripe = getStripe()

  const [tiendas, usuarios, productos] = await Promise.all([
    leerTiendas(ahora),
    firestore.collection('users').count().get(),
    firestore.collectionGroup('products').count().get(),
  ])

  // Stripe y el top corren en paralelo; cada uno se defiende solo.
  const [mrr, cobrosRes, top] = await Promise.all([
    calcularMrr(stripe, ahora).catch((err): ResumenAdmin['mrr'] => {
      console.error('[admin-stats] MRR:', err)
      return { porMoneda: {}, suscripciones: 0, anuales: 0, error: mensajeError(err) }
    }),
    calcularCobros(stripe, ahora).catch((err): Cobros => {
      console.error('[admin-stats] cobros:', err)
      return {
        cobros: { hoy: {}, mes: {}, mesAnteriorMismoDia: {}, mesAnterior: {}, error: mensajeError(err) },
        cobradoPorMes: new Map(),
        nuevasPorMes: new Map(),
      }
    }),
    calcularTop(tiendas, inicio + PRESUPUESTO_TOP_MS).catch((err): ResumenAdmin['top'] => {
      console.error('[admin-stats] top:', err)
      return { visitas: [], pedidos: [], whatsapp: [], ingresos: [], error: mensajeError(err) }
    }),
  ])

  const { y, m } = mesLima(ahora)
  const inicioHoy = inicioDiaLima(ahora)
  const inicioMes = inicioMesLima(y, m)
  const inicioMesAnt = inicioMesLima(y, m - 1)
  const corteMesAnt = Math.min(inicioMesAnt + (ahora - inicioMes), inicioMes)
  const hace7d = ahora - 7 * DIA_MS
  const inicioCohorte = ahora - COHORTE_DIAS * DIA_MS
  const en7d = ahora + 7 * DIA_MS

  const estados = Object.fromEntries(ESTADOS.map(e => [e, 0])) as Record<EstadoComercial, number>
  const pagando = { pro: 0, business: 0, total: 0 }
  const tiendasRes = { total: tiendas.length, nuevasHoy: 0, nuevas7d: 0, nuevasMes: 0, nuevasMesAnteriorMismoDia: 0 }
  const conversion = { cohorteDias: COHORTE_DIAS, terminaronPrueba: 0, pagan: 0 }
  const altasPorMes = new Map<string, number>()
  const paises = new Map<string, { tiendas: number; pagando: number }>()
  const vence: ResumenAdmin['venceProximo'] = []

  for (const t of tiendas) {
    estados[t.estado]++
    const paga = t.estado === 'pagando'
    if (paga) {
      pagando.total++
      if (t.plan === 'business') pagando.business++
      else pagando.pro++
    }

    const c = t.creada
    if (c !== null) {
      if (c >= inicioHoy) tiendasRes.nuevasHoy++
      if (c >= hace7d) tiendasRes.nuevas7d++
      if (c >= inicioMes) tiendasRes.nuevasMes++
      if (c >= inicioMesAnt && c < corteMesAnt) tiendasRes.nuevasMesAnteriorMismoDia++
      const mes = claveMes(c)
      altasPorMes.set(mes, (altasPorMes.get(mes) || 0) + 1)
      if (c >= inicioCohorte && t.trialEndsAt !== null && t.trialEndsAt < ahora) {
        conversion.terminaronPrueba++
        if (paga) conversion.pagan++
      }
    }

    const p = paises.get(t.pais) || { tiendas: 0, pagando: 0 }
    p.tiendas++
    if (paga) p.pagando++
    paises.set(t.pais, p)

    if ((t.estado === 'pagando' || t.estado === 'cortesia' || t.estado === 'prueba') && t.vence) {
      const v = t.vence.getTime()
      if (v >= ahora && v <= en7d) {
        vence.push({ storeId: t.id, nombre: t.nombre, subdominio: t.subdominio, estado: t.estado, vence: t.vence.toISOString() })
      }
    }
  }

  const serie12m: ResumenAdmin['serie12m'] = []
  for (let i = 11; i >= 0; i--) {
    const mes = claveMes(inicioMesLima(y, m - i))
    serie12m.push({
      mes,
      altas: altasPorMes.get(mes) || 0,
      cobrado: cobrosRes.cobradoPorMes.get(mes) || {},
      nuevasPagando: cobrosRes.nuevasPorMes.get(mes) || 0,
    })
  }

  return {
    calculadoEn: new Date().toISOString(),
    origen,
    duracionMs: Date.now() - inicio,
    tiendas: tiendasRes,
    usuarios: { total: usuarios.data().count },
    productos: { total: productos.data().count },
    estados,
    pagando,
    conversion,
    mrr,
    cobros: cobrosRes.cobros,
    serie12m,
    paises: [...paises].map(([pais, v]) => ({ pais, ...v })).sort((a, b) => b.tiendas - a.tiendas),
    top,
    venceProximo: vence.sort((a, b) => a.vence.localeCompare(b.vence)).slice(0, 50),
  }
}

async function calcularYGuardar(origen: 'cron' | 'manual'): Promise<ResumenAdmin> {
  const resumen = await calcular(origen)
  // Firestore no acepta `undefined` (los `error?` vacíos): se limpian.
  const limpio = JSON.parse(JSON.stringify(resumen)) as ResumenAdmin
  await getDb().collection('adminStats').doc('resumen').set(limpio)
  console.log(`[admin-stats] ${origen} listo en ${resumen.duracionMs} ms (${resumen.tiendas.total} tiendas)`)
  return limpio
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      // Fail closed: sin CRON_SECRET configurado nadie puede dispararlo.
      const cronSecret = process.env.CRON_SECRET
      if (!cronSecret) {
        console.error('[admin-stats] CRON_SECRET not configured — refusing to run')
        return res.status(500).json({ error: 'Cron not configured' })
      }
      if (req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await calcularYGuardar('cron')
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'POST') {
      if (!(await verifyAdmin(req))) return res.status(403).json({ error: 'Forbidden' })
      const resumen = await calcularYGuardar('manual')
      return res.status(200).json(resumen)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[admin-stats] error:', err)
    return res.status(500).json({ error: 'No se pudo calcular el resumen', details: mensajeError(err) })
  }
}
