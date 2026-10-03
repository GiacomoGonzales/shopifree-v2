/**
 * Datos de ejemplo del PANEL ADMIN (/es/admin/*) para panel-shot.
 *
 * TODO ES INVENTADO: tiendas, duenos, correos (@example.com), telefonos (rangos
 * de relleno tipo 900 000 0xx / 555-01xx), facturas de Stripe, chats y feedback.
 *
 * Solo se usa en rutas /admin (ver esRutaAdmin): mock-firestore mezcla
 * ADMIN_COLLECTIONS encima de DEMO_COLLECTIONS y mock-auth entra como
 * admin@shopifree.app. En el resto del panel nada cambia.
 *
 * - ~60 tiendas (AURELIA incluida) con todos los estados comerciales de
 *   src/lib/admin/modelo.ts (estadoComercial), creadas en los ultimos 14 meses.
 * - Usuarios duenos + 6 usuarios sin tienda.
 * - feedback, chats (+ messages), productos en casi todas las tiendas, pedidos y
 *   analytics en AURELIA + 2 tiendas, adminNotes/{storeId} en dos tiendas.
 * - Facturas pagadas de Stripe (DEMO_INVOICES), las mismas que devuelve el mock
 *   de /api/sync-subscription y de las que sale `cobros`/`serie12m` del resumen.
 * - adminStats/resumen con la forma EXACTA de ResumenAdmin (src/lib/admin/tipos.ts),
 *   calculado de estos mismos datos.
 *
 * Determinista (semilla fija); solo se corren las fechas con el dia.
 */
import { estadoComercial as estadoDePlan, fechaVencimiento as vencimientoDePlan, normalizarPlan, type DatosPlan, type EstadoComercial } from '../../src/lib/admin/modelo'
import type { ResumenAdmin, PorMoneda, TopItem } from '../../src/lib/admin/tipos'
import { DEMO_COLLECTIONS, DEMO_STORE, DEMO_USER, STORE_ID } from './demo-data'

/** true en /es/admin, /en/admin/... (se decide al cargar el modulo). */
export function esRutaAdmin(): boolean {
  return typeof window !== 'undefined' && /\/admin(\/|$)/.test(window.location.pathname)
}

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000
const NOW = Date.now()

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(2026)
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]
const round2 = (n: number) => Math.round(n * 100) / 100
const ago = (ms: number) => new Date(NOW - ms)
const idChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const stripeId = (prefix: string, n = 14) => {
  let s = prefix + '_'
  for (let i = 0; i < n; i++) s += idChars[Math.floor(rand() * idChars.length)]
  return s
}
/** Suma meses de calendario (como los ciclos de Stripe). */
function addMonths(d: Date, n: number) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

type Doc = { id: string } & Record<string, unknown>
const estadoComercial = (t: Doc) => estadoDePlan(t as DatosPlan)
const fechaVencimiento = (t: Doc, ahora: number) => vencimientoDePlan(t as DatosPlan, ahora)

// ── Tiendas ──────────────────────────────────────────────────────────────────
type Pais = 'PE' | 'MX' | 'CO' | 'AR' | 'CL' | 'EC' | 'US' | ''
type Rubro = 'fashion' | 'food' | 'grocery' | 'cosmetics' | 'tech' | 'pets' | 'craft' | 'general'

// [nombre, subdominio, pais, rubro, estado, plan pago, extra]
// extra: 'anual' | 'trialing' | 'cancela' | 'unpaid' | 'pro' (cancelada con plan pro) | 'sinfecha' | 'pen'
type Spec = [string, string, Pais, Rubro, EstadoComercial, ('pro' | 'business')?, string?]
const SPECS: Spec[] = [
  // Peru
  ['Dulce Tentación', 'dulcetentacion', 'PE', 'food', 'pagando', 'pro'],
  ['Moda Inka', 'modainka', 'PE', 'fashion', 'pagando', 'business', 'pen'],
  ['Café Arábica Cusco', 'cafearabicacusco', 'PE', 'food', 'prueba_vencida', 'pro'],
  ['Pastelería Mi Abuela', 'pasteleriamiabuela', 'PE', 'food', 'gratis'],
  ['Calzados Arequipa', 'calzadosarequipa', 'PE', 'fashion', 'pago_pendiente', 'pro'],
  ['Joyería Killa', 'joyeriakilla', 'PE', 'craft', 'pagando', 'pro', 'anual'],
  ['Tienda Natural Andina', 'naturalandina', 'PE', 'grocery', 'prueba', 'pro'],
  ['Boutique Valeria', 'boutiquevaleria', 'PE', 'fashion', 'cortesia', 'business', 'sinfecha'],
  ['TecnoPlaza Perú', 'tecnoplaza', 'PE', 'tech', 'prueba_vencida', 'pro'],
  ['Mascotas Felices', 'mascotasfelices', 'PE', 'pets', 'pagando', 'pro', 'pen'],
  ['Florería Las Rosas', 'florerialasrosas', 'PE', 'general', 'gratis'],
  ['Cosmética Pura', 'cosmeticapura', 'PE', 'cosmetics', 'cancelada', 'pro'],
  ['Polos Gamarra Store', 'polosgamarra', 'PE', 'fashion', 'prueba', 'pro'],
  ['Artesanías Chulucanas', 'chulucanas', 'PE', 'craft', 'gratis'],
  ['La Bodeguita de Surco', 'bodeguitasurco', 'PE', 'grocery', 'prueba_vencida', 'pro'],
  ['Lentes & Estilo', 'lentesyestilo', 'PE', 'fashion', 'cortesia', 'pro'],
  ['Bebé Feliz Perú', 'bebefeliz', 'PE', 'general', 'prueba', 'pro'],
  ['Sabores del Norte', 'saboresdelnorte', 'PE', 'food', 'gratis'],
  ['Vinos Ica Selección', 'vinosica', 'PE', 'food', 'pagando', 'business', 'trialing'],
  ['Glow Beauty', 'glowbeauty', 'PE', 'cosmetics', 'prueba_vencida', 'pro'],
  ['Mochilas Andes', 'mochilasandes', 'PE', 'fashion', 'gratis'],
  ['Chocolates Amazonía', 'chocolatesamazonia', 'PE', 'food', 'cortesia_vencida', 'pro'],
  // Mexico
  ['Tacos Don Memo', 'tacosdonmemo', 'MX', 'food', 'pagando', 'pro', 'cancela'],
  ['Artesanías Oaxaca', 'artesaniasoaxaca', 'MX', 'craft', 'gratis'],
  ['Velas Luna', 'velasluna', 'MX', 'craft', 'prueba', 'pro'],
  ['Ropa Coyoacán', 'ropacoyoacan', 'MX', 'fashion', 'prueba_vencida', 'pro'],
  ['Tecno Monterrey', 'tecnomonterrey', 'MX', 'tech', 'pago_pendiente', 'business'],
  ['Dulces Típicos Puebla', 'dulcespuebla', 'MX', 'food', 'gratis'],
  ['Plata Taxco', 'platataxco', 'MX', 'craft', 'pagando', 'business'],
  ['Bolsos Guadalajara', 'bolsosgdl', 'MX', 'fashion', 'cancelada', 'pro', 'pro'],
  ['Salsas La Abuela', 'salsaslaabuela', 'MX', 'food', 'prueba_vencida', 'pro'],
  // Colombia
  ['Café de la Sierra', 'cafedelasierra', 'CO', 'food', 'pagando', 'pro'],
  ['Moda Medellín', 'modamedellin', 'CO', 'fashion', 'prueba', 'pro'],
  ['Arepas Doña Rosa', 'arepasdonarosa', 'CO', 'food', 'gratis'],
  ['Joyas Cartagena', 'joyascartagena', 'CO', 'craft', 'cortesia', 'pro'],
  ['Mochilas Wayuu', 'mochilaswayuu', 'CO', 'craft', 'prueba_vencida', 'pro'],
  ['Belleza Bogotá', 'bellezabogota', 'CO', 'cosmetics', 'pago_pendiente', 'pro', 'unpaid'],
  ['Frutos del Valle', 'frutosdelvalle', 'CO', 'grocery', 'gratis'],
  ['Calzado Bucaramanga', 'calzadobga', 'CO', 'fashion', 'cancelada', 'pro'],
  // Argentina
  ['Mate & Co', 'mateyco', 'AR', 'general', 'pagando', 'pro', 'anual'],
  ['Alfajores del Sur', 'alfajoresdelsur', 'AR', 'food', 'prueba_vencida', 'pro'],
  ['Cuero Pampa', 'cueropampa', 'AR', 'fashion', 'gratis'],
  ['Vinos Mendoza Directo', 'vinosmendoza', 'AR', 'food', 'cortesia_vencida', 'business'],
  ['Libros Palermo', 'librospalermo', 'AR', 'general', 'cortesia', 'pro'],
  ['Yerba Misiones', 'yerbamisiones', 'AR', 'grocery', 'prueba', 'pro'],
  // Chile
  ['Empanadas Valpo', 'empanadasvalpo', 'CL', 'food', 'prueba_vencida', 'pro'],
  ['Lanas Patagonia', 'lanaspatagonia', 'CL', 'craft', 'pagando', 'pro'],
  ['Pisco Elqui', 'piscoelqui', 'CL', 'food', 'gratis'],
  ['Diseño Santiago', 'disenosantiago', 'CL', 'general', 'cancelada', 'business'],
  // Ecuador
  ['Rosas de Quito', 'rosasdequito', 'EC', 'general', 'gratis'],
  ['Cacao Manabí', 'cacaomanabi', 'EC', 'food', 'prueba_vencida', 'pro'],
  ['Sombreros Montecristi', 'sombrerosmontecristi', 'EC', 'craft', 'pagando', 'pro'],
  ['Moda Guayaquil', 'modaguayaquil', 'EC', 'fashion', 'gratis'],
  // EE. UU.
  ['Latina Beauty Miami', 'latinabeauty', 'US', 'cosmetics', 'pagando', 'business'],
  ['Panadería Houston', 'panaderiahouston', 'US', 'food', 'prueba_vencida', 'pro'],
  ['Sazón Boricua NYC', 'sazonboricua', 'US', 'food', 'gratis'],
  // Sin pais
  ['Mi Tienda', 'mitienda2847', '', 'general', 'gratis'],
  ['Ventas Online Karla', 'ventaskarla', '', 'general', 'prueba', 'pro'],
  ['Tienda de Prueba', 'tiendadeprueba91', '', 'general', 'gratis'],
]

const MONEDA: Record<Pais, string> = { PE: 'PEN', MX: 'MXN', CO: 'COP', AR: 'ARS', CL: 'CLP', EC: 'USD', US: 'USD', '': 'USD' }
const TZ: Record<Pais, string> = { PE: 'America/Lima', MX: 'America/Mexico_City', CO: 'America/Bogota', AR: 'America/Argentina/Buenos_Aires', CL: 'America/Santiago', EC: 'America/Guayaquil', US: 'America/New_York', '': 'America/Lima' }
const CIUDAD: Record<Pais, string[]> = {
  PE: ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura'], MX: ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Oaxaca'],
  CO: ['Bogotá', 'Medellín', 'Cali', 'Cartagena'], AR: ['Buenos Aires', 'Córdoba', 'Mendoza', 'Rosario'],
  CL: ['Santiago', 'Valparaíso', 'Concepción'], EC: ['Quito', 'Guayaquil', 'Cuenca'], US: ['Miami', 'Houston', 'New York'], '': [''],
}
// Telefonos de relleno (bloques 900 000 0xx / 555-01xx), no son de nadie.
const TEL: Record<Pais, (n: number) => string> = {
  PE: n => `+51900000${String(n).padStart(3, '0')}`,
  MX: n => `+5255000${String(n).padStart(5, '0')}`,
  CO: n => `+57300000${String(n).padStart(4, '0')}`,
  AR: n => `+549110000${String(n).padStart(4, '0')}`,
  CL: n => `+5690000${String(n).padStart(4, '0')}`,
  EC: n => `+5939900${String(n).padStart(5, '0')}`,
  US: n => `+1305555${String(100 + (n % 100)).padStart(4, '0')}`,
  '': n => `+51900001${String(n).padStart(3, '0')}`,
}

const NOMBRES = ['Rosa', 'Carlos', 'María', 'Luis', 'Ana', 'Jorge', 'Lucía', 'Miguel', 'Carmen', 'José', 'Patricia', 'Diego', 'Sofía', 'Andrés', 'Gabriela', 'Fernando', 'Valeria', 'Ricardo', 'Paola', 'Héctor', 'Daniela', 'Raúl', 'Camila', 'Óscar', 'Elena', 'Javier', 'Karla', 'Pedro', 'Mónica', 'Iván']
const APELLIDOS = ['Quispe', 'Flores', 'Huamán', 'García', 'Rodríguez', 'Mamani', 'Torres', 'Ramírez', 'Castro', 'Vargas', 'Morales', 'Gutiérrez', 'Rojas', 'Sánchez', 'Mendoza', 'Herrera', 'Cruz', 'Ortiz', 'Silva', 'Reyes', 'Chávez', 'Paredes', 'Salazar', 'Navarro', 'Romero', 'Aguilar', 'Peña', 'Cárdenas', 'Medina', 'León']
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Fecha de alta: mas tiendas cuanto mas reciente (14 meses ~ 425 dias).
function diasDeAlta(estado: EstadoComercial): number {
  if (estado === 'prueba') return 0.3 + rand() * 6 // la prueba dura 7 dias
  if (estado === 'gratis') return 120 + Math.pow(rand(), 0.8) * 300 // las free son las viejas (antes de la prueba)
  const min = estado === 'prueba_vencida' ? 8 : 25
  return min + Math.pow(rand(), 1.7) * (420 - min)
}

interface Suscripcion { inicio: Date; ciclos: Date[]; anual: boolean; moneda: string; monto: number; fin?: Date }
const SUSCRIPCIONES = new Map<string, Suscripcion>()

const PRECIO = { pro: { m: 4.99, y: 49.99 }, business: { m: 9.99, y: 99.99 } }
const PRECIO_PEN = { pro: 18.9, business: 37.9 }
const PRICE_ID = { pro: { m: 'price_1PqProMonthlyUSD', y: 'price_1PqProYearlyUSD' }, business: { m: 'price_1PqBizMonthlyUSD', y: 'price_1PqBizYearlyUSD' } }

const tiendas: Doc[] = []
const duenos: Doc[] = []
let telN = 10

SPECS.forEach(([name, subdomain, pais, rubro, estado, planPago, extra], i) => {
  const id = `st-${subdomain}`
  const ownerId = `u-${subdomain}`
  const horas = randInt(0, 20)
  let created = ago(diasDeAlta(estado) * DAY + (estado === 'prueba' ? 0 : horas * HOUR))
  if (subdomain === 'ventaskarla') created = ago(3 * HOUR + 10 * MIN) // alta de hoy
  const nombre = NOMBRES[(i * 7) % NOMBRES.length]
  const apellido = APELLIDOS[(i * 11 + 3) % APELLIDOS.length]
  const whatsapp = TEL[pais](telN++)
  const d: Doc = {
    id,
    ownerId,
    name,
    subdomain,
    whatsapp,
    currency: MONEDA[pais],
    language: 'es',
    timezone: TZ[pais],
    businessType: rubro,
    themeId: pick(['boutique', 'minimal', 'fresh', 'classic', 'bold']),
    plan: 'free',
    createdAt: created,
    updatedAt: new Date(Math.min(NOW - 30 * MIN, created.getTime() + randInt(1, 60) * DAY)),
  }
  if (pais) d.location = { country: pais, city: pick(CIUDAD[pais]) }
  const trialEnd = new Date(created.getTime() + 7 * DAY)

  const conStripe = estado === 'pagando' || estado === 'pago_pendiente' || estado === 'cancelada'
  if (conStripe) {
    const plan = planPago || 'pro'
    const anual = extra === 'anual'
    const pen = extra === 'pen'
    const inicio = new Date(Math.min(NOW - 3 * DAY, trialEnd.getTime() + randInt(0, 12) * DAY + randInt(1, 20) * HOUR))
    const paso = anual ? 12 : 1
    // Ciclos cobrados (fecha de cada factura) desde el inicio hasta hoy.
    const ciclos: Date[] = []
    for (let k = 0; ; k += paso) {
      const c = addMonths(inicio, k)
      if (c.getTime() > NOW) break
      ciclos.push(c)
    }
    let status = 'active'
    let fin: Date | undefined
    if (estado === 'pagando' && extra === 'trialing') {
      // Prueba de Stripe (con tarjeta): todavia no hay factura cobrada.
      status = 'trialing'
      ciclos.length = 0
    }
    if (estado === 'pago_pendiente') {
      status = extra === 'unpaid' ? 'unpaid' : 'past_due'
      // El ultimo ciclo no se pudo cobrar.
      if (ciclos.length > 1) ciclos.pop()
    }
    if (estado === 'cancelada') {
      status = 'canceled'
      const meses = Math.max(1, Math.min(ciclos.length, randInt(1, 4)))
      ciclos.length = meses
      fin = addMonths(ciclos[ciclos.length - 1], 1)
      if (fin.getTime() > NOW) fin = ago(randInt(2, 20) * DAY)
    }
    const ultimo = ciclos.length ? ciclos[ciclos.length - 1] : (estado === 'pago_pendiente' ? addMonths(inicio, 0) : inicio)
    const periodStart = estado === 'pago_pendiente' ? addMonths(ultimo, 1).getTime() > NOW ? ultimo : addMonths(ultimo, 1) : ultimo
    const periodEnd = estado === 'cancelada' ? fin! : status === 'trialing' ? new Date(NOW + 9 * DAY) : addMonths(periodStart, paso)
    const moneda = pen ? 'pen' : 'usd'
    const monto = pen ? PRECIO_PEN[plan] : anual ? PRECIO[plan].y : PRECIO[plan].m
    SUSCRIPCIONES.set(id, { inicio, ciclos, anual, moneda, monto, fin })

    d.subscription = {
      stripeCustomerId: stripeId('cus'),
      stripeSubscriptionId: stripeId('sub', 24),
      stripePriceId: pen ? `price_1Pq${plan === 'pro' ? 'Pro' : 'Biz'}MonthlyPEN` : PRICE_ID[plan][anual ? 'y' : 'm'],
      status,
      currentPeriodStart: status === 'trialing' ? created : periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: extra === 'cancela',
      ...(status === 'trialing' ? { trialEnd: periodEnd } : {}),
    }
    d.trialEndsAt = trialEnd
    if (estado === 'cancelada') {
      // El webhook la bajo a free... salvo una que todavia figura como pro.
      d.plan = extra === 'pro' ? plan : 'free'
      d.planExpiresAt = extra === 'pro' ? periodEnd : null
    } else {
      d.plan = plan
      d.planExpiresAt = periodEnd
    }
  } else if (estado === 'prueba' || estado === 'prueba_vencida') {
    d.plan = planPago || 'pro'
    d.trialEndsAt = trialEnd
    d.emailsSent = estado === 'prueba_vencida' ? ['welcome', 'trial-reminder', 'trial-expired'] : ['welcome']
  } else if (estado === 'cortesia') {
    d.plan = planPago || 'pro'
    // Una sin fecha (null = indefinida), otra que vence en 4 dias, otras mas adelante.
    if (extra === 'sinfecha' || name === 'Joyas Cartagena') d.planExpiresAt = null
    else d.planExpiresAt = name === 'Lentes & Estilo' ? new Date(NOW + 4 * DAY + 5 * HOUR) : new Date(NOW + randInt(40, 120) * DAY)
  } else if (estado === 'cortesia_vencida') {
    d.plan = planPago || 'pro'
    d.planExpiresAt = ago(randInt(5, 60) * DAY)
  } else {
    // gratis: algunas viejas tuvieron prueba y quedaron en free
    if (rand() < 0.4) d.trialEndsAt = trialEnd
  }

  // Ultima vez en linea: las que trabajan entran seguido.
  const activa = estado === 'pagando' || estado === 'cortesia' || estado === 'prueba'
  if (activa || rand() < 0.5) d.lastOnlineAt = ago((activa ? randInt(1, 72) : randInt(48, 900)) * HOUR + randInt(0, 59) * MIN)
  if (rand() < 0.35) d.instagram = subdomain.slice(0, 18)

  tiendas.push(d)
  duenos.push({
    id: ownerId,
    email: `${sinTildes(nombre)}.${sinTildes(apellido)}${i % 3 === 0 ? i : ''}@example.com`,
    firstName: nombre,
    lastName: apellido,
    phone: whatsapp,
    storeId: id,
    role: 'user',
    createdAt: new Date(created.getTime() - randInt(2, 30) * MIN),
    updatedAt: created,
    ...((d.subscription as Record<string, unknown> | undefined)?.stripeCustomerId ? { stripeCustomerId: (d.subscription as Record<string, unknown>).stripeCustomerId } : {}),
  })
})

// En linea ahora mismo (ultimos 5 minutos).
for (const [sub, minutos] of [['latinabeauty', 1], ['dulcetentacion', 2], ['naturalandina', 3], ['platataxco', 4]] as const) {
  const t = tiendas.find(x => x.subdomain === sub)!
  t.lastOnlineAt = ago(minutos * MIN + 12_000)
}

// Dominio propio en dos tiendas Business.
tiendas.find(x => x.subdomain === 'modainka')!.customDomain = { domain: 'modainka.pe', status: 'active' }
tiendas.find(x => x.subdomain === 'latinabeauty')!.customDomain = { domain: 'latinabeautymiami.com', status: 'active' }

// AURELIA (la tienda del panel de comerciante) es una tienda mas del admin.
{
  const sub = (DEMO_STORE as unknown as { subscription: Record<string, unknown> }).subscription
  const periodEnd = sub.currentPeriodEnd as Date
  const inicio = addMonths(new Date(NOW - 232 * DAY), 0)
  const ciclos: Date[] = []
  for (let k = 0; ; k++) {
    const c = addMonths(inicio, k)
    if (c.getTime() > NOW) break
    ciclos.push(c)
  }
  SUSCRIPCIONES.set(STORE_ID, { inicio, ciclos, anual: false, moneda: 'usd', monto: PRECIO.business.m })
  tiendas.unshift({
    ...(DEMO_STORE as unknown as Doc),
    trialEndsAt: new Date(NOW - 233 * DAY),
    planExpiresAt: periodEnd,
    subscription: { ...sub, currentPeriodStart: ciclos[ciclos.length - 1], currentPeriodEnd: periodEnd },
    lastOnlineAt: ago(7 * MIN),
  })
}

// ── Apps (appConfig) ─────────────────────────────────────────────────────────
const SS = ['/demo-products/blusa.jpg', '/demo-products/polo.jpg', '/demo-products/zapatillas.jpg']
function app(sub: string, cfg: Record<string, unknown>) {
  const t = tiendas.find(x => x.subdomain === sub)!
  t.appConfig = {
    appName: t.name,
    primaryColor: pick(['#1f2937', '#7c3aed', '#0f766e', '#b91c1c', '#1d4ed8', '#be185d']),
    secondaryColor: '#ffffff',
    splashColor: '#ffffff',
    pushEnabled: true,
    requestedAt: ago(randInt(10, 40) * DAY),
    iosBundleId: `app.shopifree.store.${sub}`,
    publishInfo: { testers: [`${sub}.tester1@example.com`, `${sub}.tester2@example.com`] },
    ...cfg,
  }
}
const run = (n: number) => `https://github.com/shopifree/shopifree-app/actions/runs/${n}`
app('aurelia', {
  status: 'published', publishedAt: ago(60 * DAY),
  androidUrl: 'https://play.google.com/store/apps/details?id=app.shopifree.store.aurelia', iosUrl: 'https://apps.apple.com/app/id6700000001', androidIsTesting: false,
  build: { status: 'success', runUrl: run(11000001), buildNumber: 7, versionName: '1.0.6', artifactName: 'aurelia-v7.aab', startedAt: ago(61 * DAY), finishedAt: ago(61 * DAY - 9 * MIN) },
  buildIos: { status: 'success', runUrl: run(11000002), buildNumber: 5, versionName: '1.0.6', testflightUrl: 'https://testflight.apple.com/join/demo', startedAt: ago(61 * DAY), finishedAt: ago(61 * DAY - 18 * MIN) },
  screenshots: { status: 'success', urls: SS, generatedAt: ago(62 * DAY) },
})
app('modainka', {
  status: 'published', publishedAt: ago(12 * DAY),
  androidUrl: 'https://play.google.com/apps/testing/app.shopifree.store.modainka', androidIsTesting: true,
  build: { status: 'success', runUrl: run(11000101), buildNumber: 3, versionName: '1.0.2', artifactName: 'modainka-v3.aab', startedAt: ago(13 * DAY), finishedAt: ago(13 * DAY - 8 * MIN) },
  buildIos: { status: 'idle' },
  screenshots: { status: 'success', urls: SS, generatedAt: ago(14 * DAY) },
})
app('latinabeauty', {
  status: 'building',
  build: { status: 'running', runUrl: run(11000201), buildNumber: 2, versionName: '1.0.1', startedAt: ago(4 * MIN) },
  buildIos: { status: 'queued', versionName: '1.0.1', startedAt: ago(1 * MIN) },
  screenshots: { status: 'success', urls: SS, generatedAt: ago(1 * DAY) },
})
app('platataxco', {
  status: 'building',
  build: { status: 'failed', runUrl: run(11000301), buildNumber: 1, versionName: '1.0.0', lastError: 'Gradle: Execution failed for task \':app:bundleRelease\' (icono 1024x1024 con transparencia)', startedAt: ago(2 * HOUR), finishedAt: ago(2 * HOUR - 6 * MIN) },
  buildIos: { status: 'idle' },
  screenshots: { status: 'idle' },
})
app('vinosica', {
  status: 'requested', requestedAt: ago(1 * DAY + 3 * HOUR),
  build: { status: 'idle' },
  screenshots: { status: 'idle' },
})
app('boutiquevaleria', {
  status: 'requested', requestedAt: ago(3 * DAY),
  build: { status: 'idle' },
  screenshots: { status: 'success', urls: SS, generatedAt: ago(2 * DAY) },
})
app('dulcetentacion', {
  status: 'building',
  build: { status: 'success', runUrl: run(11000401), buildNumber: 4, versionName: '1.1.0', artifactName: 'dulcetentacion-v4.aab', startedAt: ago(5 * HOUR), finishedAt: ago(5 * HOUR - 9 * MIN) },
  buildIos: { status: 'failed', runUrl: run(11000402), buildNumber: 2, versionName: '1.1.0', lastError: 'Fastlane match: certificate expired', startedAt: ago(5 * HOUR), finishedAt: ago(5 * HOUR - 14 * MIN) },
  screenshots: { status: 'running', urls: [] },
})
app('cosmeticapura', {
  status: 'none',
  build: { status: 'idle' },
})

// ── Usuarios ─────────────────────────────────────────────────────────────────
const SIN_TIENDA: [string, string, number][] = [
  ['Martín', 'Pérez', 0.2], ['Lorena', 'Soto', 1], ['Kevin', 'Huanca', 3], ['Milagros', 'Ccori', 9], ['Esteban', 'Rivas', 26], ['Brenda', 'Lozano', 75],
]
const usuarios: Doc[] = [
  { ...(DEMO_USER as unknown as Doc), phone: '+13055550100' },
  ...duenos,
  ...SIN_TIENDA.map(([firstName, lastName, dias], k) => ({
    id: `u-sintienda-${k + 1}`,
    email: `${sinTildes(firstName)}${sinTildes(lastName)}${k + 1}@example.com`,
    firstName, lastName,
    phone: TEL.PE(200 + k),
    role: 'user',
    createdAt: ago(dias * DAY),
    updatedAt: ago(dias * DAY),
  })),
]

// ── Productos, pedidos y analytics ───────────────────────────────────────────
const PRODUCTOS: Record<Rubro, [string, number][]> = {
  fashion: [['Polo básico', 39], ['Jean slim', 119], ['Blusa de lino', 89], ['Casaca denim', 159], ['Vestido midi', 139], ['Zapatillas urbanas', 189], ['Gorra bordada', 45], ['Short de playa', 59]],
  food: [['Torta de chocolate', 85], ['Cheesecake de maracuyá', 75], ['Caja de alfajores x12', 36], ['Café en grano 250 g', 32], ['Galletas artesanales', 18], ['Pie de limón', 55], ['Brownies x6', 28], ['Panetón artesanal', 49]],
  grocery: [['Quinua orgánica 1 kg', 22], ['Miel de abeja 500 g', 28], ['Aceite de oliva 500 ml', 35], ['Granola casera', 19], ['Cacao en polvo', 24], ['Mix de frutos secos', 27]],
  cosmetics: [['Sérum vitamina C', 79], ['Crema hidratante', 59], ['Labial mate', 35], ['Paleta de sombras', 89], ['Protector solar FPS 50', 65], ['Agua micelar', 39]],
  tech: [['Audífonos bluetooth', 129], ['Cargador rápido 20 W', 49], ['Funda para celular', 25], ['Smartwatch', 199], ['Power bank 10000 mAh', 79], ['Cable USB-C', 19]],
  pets: [['Collar ajustable', 29], ['Cama para perro M', 119], ['Juguete mordedor', 22], ['Arena para gatos 5 kg', 35], ['Snacks naturales', 18]],
  craft: [['Collar de plata', 149], ['Aretes artesanales', 59], ['Taza de cerámica', 39], ['Manta tejida', 189], ['Vela aromática', 35], ['Pulsera tejida', 25]],
  general: [['Set de regalo', 99], ['Agenda 2027', 45], ['Ramo de rosas', 89], ['Caja sorpresa', 69], ['Tarjeta de regalo', 50]],
}
const sub: Record<string, Doc[]> = {}

for (const t of tiendas) {
  if (t.id === STORE_ID) continue // AURELIA ya trae sus productos
  const e = estadoComercial(t)
  const n = e === 'gratis' ? randInt(0, 4) : e === 'prueba' ? randInt(1, 6) : e === 'prueba_vencida' ? randInt(0, 8) : randInt(5, 14)
  if (!n) continue
  const pool = PRODUCTOS[t.businessType as Rubro]
  const factor = t.currency === 'USD' ? 0.3 : t.currency === 'MXN' ? 5 : t.currency === 'COP' ? 1100 : t.currency === 'ARS' ? 280 : t.currency === 'CLP' ? 260 : 1
  const prods: Doc[] = []
  for (let k = 0; k < n; k++) {
    const [nombre, precio] = pool[k % pool.length]
    const p = Math.round(precio * factor * (k >= pool.length ? 1.15 : 1) * 100) / 100
    prods.push({
      id: `${t.id}-p${k + 1}`,
      storeId: t.id,
      name: k >= pool.length ? `${nombre} premium` : nombre,
      price: p,
      images: [],
      image: null,
      active: rand() > 0.1,
      trackStock: rand() > 0.4,
      stock: randInt(0, 40),
      order: k,
      createdAt: new Date((t.createdAt as Date).getTime() + randInt(0, 5) * DAY + k * HOUR),
      updatedAt: ago(randInt(1, 30) * DAY),
    })
  }
  sub[`stores/${t.id}/products`] = prods
}

/** Pedidos de ejemplo en la moneda de la tienda (ultimos ~60 dias). */
function pedidosDe(t: Doc, cantidad: number, prefijo: string) {
  const prods = sub[`stores/${t.id}/products`] || []
  const out: Doc[] = []
  for (let k = 0; k < cantidad; k++) {
    const created = ago(Math.pow(rand(), 1.3) * 60 * DAY + randInt(1, 12) * HOUR)
    const items = Array.from({ length: randInt(1, 3) }, () => {
      const p = pick(prods)
      const quantity = randInt(1, 2)
      return { productId: p.id, productName: p.name, productImage: null, price: p.price, quantity, itemTotal: round2((p.price as number) * quantity) }
    })
    const subtotal = round2(items.reduce((s, it) => s + it.itemTotal, 0))
    const reciente = NOW - created.getTime() < 2 * DAY
    const status = reciente ? pick(['pending', 'confirmed', 'preparing']) : rand() < 0.07 ? 'cancelled' : 'delivered'
    const paid = status !== 'pending' && status !== 'cancelled'
    out.push({
      id: `${t.id}-o${k + 1}`,
      storeId: t.id,
      orderNumber: `${prefijo}-${1001 + k}`,
      items,
      customer: { name: `${pick(NOMBRES)} ${pick(APELLIDOS)}`, phone: TEL[(((t.location as Record<string, string>) || {}).country || '') as Pais](300 + k) },
      deliveryMethod: rand() < 0.7 ? 'delivery' : 'pickup',
      subtotal,
      shippingCost: 0,
      total: subtotal,
      status,
      paymentMethod: pick(['yape', 'transfer', 'cash', 'mercadopago', 'card']),
      paymentStatus: paid ? 'paid' : 'pending',
      ...(paid ? { paidAt: new Date(created.getTime() + 20 * MIN) } : {}),
      channel: pick(['online', 'online', 'whatsapp', 'instagram']),
      createdAt: created,
      updatedAt: new Date(Math.min(NOW - 5 * MIN, created.getTime() + randInt(2, 40) * HOUR)),
    })
  }
  return out.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
}

/** Eventos de analytics de los ultimos 30 dias (lo que lee analyticsService.getFullAnalytics). */
function analyticsDe(t: Doc, visitasDia: number, prods: Doc[]) {
  const out: Doc[] = []
  let n = 0
  const REF = ['direct', 'https://www.instagram.com/', 'https://l.facebook.com/', 'https://www.google.com/', 'https://wa.me/', 'https://www.tiktok.com/']
  for (let dia = 0; dia < 30; dia++) {
    const v = Math.max(1, Math.round(visitasDia * (0.6 + rand() * 0.8) * (dia < 7 ? 1.15 : 1)))
    for (let k = 0; k < v; k++) {
      const ts = ago(dia * DAY + randInt(0, 23) * HOUR + randInt(0, 59) * MIN + 5 * MIN)
      const deviceType = rand() < 0.78 ? 'mobile' : 'desktop'
      out.push({ id: `${t.id}-a${n++}`, type: 'page_view', productId: null, timestamp: ts, metadata: { deviceType, referrer: pick(REF) } })
      if (prods.length && rand() < 0.7) {
        const p = pick(prods)
        out.push({ id: `${t.id}-a${n++}`, type: 'product_view', productId: p.id, timestamp: new Date(ts.getTime() + 40_000), metadata: { productName: p.name, deviceType } })
        if (rand() < 0.22) out.push({ id: `${t.id}-a${n++}`, type: 'cart_add', productId: p.id, timestamp: new Date(ts.getTime() + 90_000), metadata: { productName: p.name, deviceType } })
      }
      if (rand() < 0.12) out.push({ id: `${t.id}-a${n++}`, type: 'whatsapp_click', productId: null, timestamp: new Date(ts.getTime() + 120_000), metadata: { deviceType } })
    }
  }
  return out
}

const CON_DATOS: [string, number, number, string][] = [['dulcetentacion', 34, 18, 'DT'], ['latinabeauty', 26, 22, 'LB']]
for (const [subd, pedidos, visitas, pref] of CON_DATOS) {
  const t = tiendas.find(x => x.subdomain === subd)!
  sub[`stores/${t.id}/orders`] = pedidosDe(t, pedidos, pref)
  sub[`stores/${t.id}/analytics`] = analyticsDe(t, visitas, sub[`stores/${t.id}/products`] || [])
  sub[`stores/${t.id}/categories`] = [
    { id: `${t.id}-c1`, name: 'Destacados', storeId: t.id, order: 0, active: true, createdAt: t.createdAt },
    { id: `${t.id}-c2`, name: 'Novedades', storeId: t.id, order: 1, active: true, createdAt: t.createdAt },
  ]
}
{
  const aurelia = tiendas.find(x => x.id === STORE_ID)!
  sub[`stores/${STORE_ID}/analytics`] = analyticsDe(aurelia, 42, DEMO_COLLECTIONS[`stores/${STORE_ID}/products`] || [])
}

// Nota interna del admin (TiendaFicha.tsx, pestana Notas: doc adminNotes/{storeId}
// con { texto, actualizadoEn, autor }).
const adminNotes: Doc[] = [
  {
    id: 'st-calzadosarequipa',
    texto: '03/10: escribió por WhatsApp, cambió de tarjeta y va a reintentar el pago esta semana. Le pasé el link del portal de Stripe.\n\nAgosto: pidió ayuda para importar productos desde Excel (resuelto).',
    autor: 'admin@shopifree.app',
    actualizadoEn: ago(2 * DAY + 3 * HOUR),
  },
  { id: 'st-boutiquevaleria', texto: 'Cortesía Business sin fecha: acuerdo de difusión en Instagram (no cobrar).', autor: 'giiacomo@gmail.com', actualizadoEn: ago(40 * DAY) },
]

// ── Facturas de Stripe (pagadas) ─────────────────────────────────────────────
export interface DemoInvoice {
  id: string
  amount: number
  currency: string
  status: 'paid'
  created: number
  periodStart: number
  periodEnd: number
  customerEmail: string | null
  customerId: string
  storeName: string | null
  storeSubdomain: string | null
  storePlan: string | null
  storeId: string | null
  invoiceUrl: string
  invoicePdf: string
  description: string | null
}
const usuarioPorId = new Map(usuarios.map(u => [u.id, u]))
const invoices: DemoInvoice[] = []
for (const t of tiendas) {
  const s = SUSCRIPCIONES.get(t.id)
  if (!s) continue
  const subs = t.subscription as Record<string, unknown>
  const plan = normalizarPlan(t.plan as string) === 'free' ? 'pro' : (t.plan as string)
  const planLabel = plan === 'business' ? 'Business' : 'Pro'
  const email = (usuarioPorId.get(t.ownerId as string)?.email as string) || null
  for (const c of s.ciclos) {
    const fin = addMonths(c, s.anual ? 12 : 1)
    const created = new Date(c.getTime() + randInt(1, 50) * MIN)
    if (created.getTime() > NOW) continue
    const id = stripeId('in', 24)
    invoices.push({
      id,
      amount: s.monto,
      currency: s.moneda,
      status: 'paid',
      created: Math.floor(created.getTime() / 1000),
      periodStart: Math.floor(c.getTime() / 1000),
      periodEnd: Math.floor(fin.getTime() / 1000),
      customerEmail: email,
      customerId: subs.stripeCustomerId as string,
      storeName: t.name as string,
      storeSubdomain: t.subdomain as string,
      storePlan: t.plan as string,
      storeId: t.id,
      invoiceUrl: `https://invoice.stripe.com/i/acct_demo/${id}`,
      invoicePdf: `https://pay.stripe.com/invoice/acct_demo/${id}/pdf`,
      description: `1 × Shopifree ${planLabel} (at ${s.moneda === 'pen' ? 'S/' : '$'}${s.monto.toFixed(2)} / ${s.anual ? 'year' : 'month'})`,
    })
  }
}
// Dos facturas de una tienda que ya no existe (sin tienda asociada), como en Stripe.
for (const meses of [9, 10]) {
  const c = addMonths(new Date(NOW), -meses)
  const id = stripeId('in', 24)
  invoices.push({
    id, amount: 4.99, currency: 'usd', status: 'paid', created: Math.floor(c.getTime() / 1000),
    periodStart: Math.floor(c.getTime() / 1000), periodEnd: Math.floor(addMonths(c, 1).getTime() / 1000),
    customerEmail: 'tienda.cerrada@example.com', customerId: 'cus_DemoBorrada01', storeName: null, storeSubdomain: null, storePlan: null, storeId: null,
    invoiceUrl: `https://invoice.stripe.com/i/acct_demo/${id}`, invoicePdf: `https://pay.stripe.com/invoice/acct_demo/${id}/pdf`,
    description: '1 × Shopifree Pro (at $4.99 / month)',
  })
}
invoices.sort((a, b) => b.created - a.created)
export const DEMO_INVOICES = invoices

// ── Feedback ─────────────────────────────────────────────────────────────────
// Forma de src/pages/admin/Feedback.tsx: type bug|suggestion|missing, status new|read|done.
const FEEDBACK: [string, 'bug' | 'suggestion' | 'missing', 'new' | 'read' | 'done', string, number][] = [
  ['dulcetentacion', 'suggestion', 'new', 'Sería genial poder programar pedidos para una fecha (tortas por encargo).', 0.1],
  ['calzadosarequipa', 'bug', 'new', 'Al subir fotos desde el celular a veces se queda cargando y no termina.', 0.4],
  ['naturalandina', 'missing', 'new', 'Me falta poder cobrar con Yape directo en la tienda.', 0.9],
  ['modainka', 'suggestion', 'read', 'Quisiera elegir el orden de las categorías en el menú.', 2],
  ['tecnomonterrey', 'bug', 'read', 'El total del carrito no suma el envío cuando elijo recojo y luego delivery.', 3],
  ['velasluna', 'missing', 'new', 'Falta factura electrónica para México (CFDI).', 4],
  ['cafedelasierra', 'suggestion', 'done', 'Agregar un botón de "volver a pedir" para clientes frecuentes.', 9],
  ['mateyco', 'bug', 'done', 'Las variantes de color no se veían en la app de iPhone.', 14],
  ['ventaskarla', 'missing', 'read', 'No encuentro cómo conectar mi dominio .com', 18],
  ['latinabeauty', 'suggestion', 'new', 'Que el reporte de ventas se pueda descargar en Excel.', 21],
  ['bolsosgdl', 'bug', 'done', 'Me cobraron dos veces el mismo mes (ya me devolvieron).', 35],
  ['mitienda2847', 'missing', 'read', 'Necesito más plantillas de diseño para mi rubro.', 52],
]
const feedback: Doc[] = FEEDBACK.map(([subd, type, status, message, dias], k) => {
  const t = tiendas.find(x => x.subdomain === subd)!
  const u = usuarioPorId.get(t.ownerId as string)!
  return { id: `fb-${k + 1}`, storeId: t.id, storeName: t.name, email: u.email, plan: t.plan, type, status, message, createdAt: ago(dias * DAY + 17 * MIN) }
})

// ── Chats de soporte (colección chats + chats/{id}/messages, ver lib/chatService) ──
type Msg = ['user' | 'admin' | 'assistant', string, number] // minutos atras
const CHATS: { subd: string; status: 'active' | 'closed'; escalated?: string; aiPaused?: boolean; unreadByAdmin: number; msgs: Msg[] }[] = [
  {
    subd: 'calzadosarequipa', status: 'active', escalated: 'El cliente reporta un cobro rechazado y pide hablar con una persona.', aiPaused: true, unreadByAdmin: 2,
    msgs: [
      ['user', 'Hola, me llegó un correo que mi pago falló pero mi tarjeta tiene saldo', 95],
      ['assistant', '¡Hola! Lo siento. A veces el banco rechaza cobros internacionales. ¿Probaste actualizar la tarjeta desde Configuración → Plan?', 94],
      ['user', 'Sí, ya lo intenté dos veces y sale el mismo error. ¿Me pueden ayudar?', 31],
      ['user', 'Necesito que mi tienda no se baje, tengo pedidos esta semana', 29],
    ],
  },
  {
    subd: 'naturalandina', status: 'active', unreadByAdmin: 1,
    msgs: [
      ['user', '¿Cómo agrego el costo de envío por distrito?', 12],
      ['assistant', 'En Configuración → Envíos puedes crear zonas y ponerle un precio a cada una. ¿Quieres que te explique paso a paso?', 11],
      ['user', 'Sí por favor', 8],
    ],
  },
  {
    subd: 'latinabeauty', status: 'active', unreadByAdmin: 0,
    msgs: [
      ['user', '¿Para cuándo estaría lista mi app de iPhone?', 300],
      ['admin', 'Hola! Ya está compilando, en unas horas te paso el link de TestFlight 🙌', 280],
      ['user', 'Genial, gracias!', 275],
    ],
  },
  {
    subd: 'velasluna', status: 'active', unreadByAdmin: 0,
    msgs: [
      ['user', 'Hola, ¿el plan Pro incluye dominio propio?', 1500],
      ['assistant', 'Sí: con Pro puedes conectar tu propio dominio .com. Lo configuras en Configuración → Dominio.', 1499],
    ],
  },
  {
    subd: 'mateyco', status: 'closed', unreadByAdmin: 0,
    msgs: [
      ['user', 'No me aparecen los colores en la app', 20200],
      ['admin', 'Ya quedó corregido, actualiza la app y nos cuentas.', 19000],
      ['user', 'Perfecto, ya se ve bien. Gracias', 18900],
    ],
  },
  {
    subd: 'cafedelasierra', status: 'closed', unreadByAdmin: 0,
    msgs: [
      ['user', '¿Puedo cambiar el subdominio de mi tienda?', 43000],
      ['assistant', 'Sí, en Configuración → General. Ten en cuenta que el link anterior dejará de funcionar.', 42990],
      ['user', 'Listo, gracias', 42900],
    ],
  },
]
const chats: Doc[] = []
CHATS.forEach((c, k) => {
  const t = tiendas.find(x => x.subdomain === c.subd)!
  const u = usuarioPorId.get(t.ownerId as string)!
  const id = `chat-${k + 1}`
  const last = c.msgs[c.msgs.length - 1]
  chats.push({
    id,
    storeId: t.id,
    storeName: t.name,
    userId: u.id,
    userEmail: u.email,
    status: c.status,
    lastMessage: last[1],
    lastMessageAt: ago(last[2] * MIN),
    lastMessageBy: last[0],
    unreadByAdmin: c.unreadByAdmin,
    unreadByUser: last[0] === 'user' ? 0 : c.status === 'active' ? 1 : 0,
    escalated: !!c.escalated,
    ...(c.escalated ? { escalationReason: c.escalated } : {}),
    aiPaused: !!c.aiPaused,
    createdAt: ago(c.msgs[0][2] * MIN + 30_000),
  })
  sub[`chats/${id}/messages`] = c.msgs.map(([senderType, text, min], j) => ({
    id: `${id}-m${j + 1}`,
    text,
    senderId: senderType === 'user' ? u.id : senderType === 'admin' ? 'admin-shopifree' : 'sofia',
    senderType,
    createdAt: ago(min * MIN),
  }))
})

// ── adminStats/resumen (forma exacta de ResumenAdmin) ────────────────────────
const ESTADOS: EstadoComercial[] = ['pagando', 'pago_pendiente', 'cancelada', 'prueba', 'prueba_vencida', 'cortesia', 'cortesia_vencida', 'gratis']
const estadoDe = new Map(tiendas.map(t => [t.id, estadoComercial(t)]))

function resumen(calculadoEn: Date, origen: string): ResumenAdmin {
  const hoy0 = new Date(calculadoEn); hoy0.setHours(0, 0, 0, 0)
  const mes0 = new Date(hoy0); mes0.setDate(1)
  const mesAnt0 = addMonths(mes0, -1)
  // Mismo dia (y hora) del mes anterior, sin pasarse de ese mes.
  const mismoDiaAnt = new Date(Math.min(addMonths(calculadoEn, -1).getTime(), mes0.getTime() - 1))
  const creada = (t: Doc) => (t.createdAt as Date).getTime()
  const entre = (ms: number, a: Date, b: Date) => ms >= a.getTime() && ms < b.getTime()

  const estados = Object.fromEntries(ESTADOS.map(e => [e, 0])) as Record<EstadoComercial, number>
  for (const e of estadoDe.values()) estados[e]++

  const pagandoT = tiendas.filter(t => estadoDe.get(t.id) === 'pagando')
  const pro = pagandoT.filter(t => t.plan === 'pro').length
  const business = pagandoT.filter(t => t.plan === 'business').length

  const cohorteDias = 90
  const cohorte = tiendas.filter(t => calculadoEn.getTime() - creada(t) <= cohorteDias * DAY && t.trialEndsAt && (t.trialEndsAt as Date).getTime() < calculadoEn.getTime())

  const mrr: PorMoneda = {}
  let suscripciones = 0
  let anuales = 0
  for (const t of tiendas) {
    const s = SUSCRIPCIONES.get(t.id)
    const st = (t.subscription as Record<string, unknown> | undefined)?.status
    if (!s || st !== 'active') continue
    suscripciones++
    if (s.anual) anuales++
    mrr[s.moneda] = round2((mrr[s.moneda] || 0) + (s.anual ? s.monto / 12 : s.monto))
  }

  const sumar = (desde: Date, hasta: Date): PorMoneda => {
    const out: PorMoneda = {}
    for (const inv of invoices) {
      const ms = inv.created * 1000
      if (entre(ms, desde, hasta)) out[inv.currency] = round2((out[inv.currency] || 0) + inv.amount)
    }
    return out
  }

  const serie12m: ResumenAdmin['serie12m'] = []
  for (let k = 11; k >= 0; k--) {
    const a = addMonths(mes0, -k)
    const b = addMonths(mes0, -k + 1)
    serie12m.push({
      mes: `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}`,
      altas: tiendas.filter(t => entre(creada(t), a, b)).length,
      cobrado: sumar(a, b),
      nuevasPagando: pagandoT.filter(t => { const s = SUSCRIPCIONES.get(t.id); return !!s && entre(s.inicio.getTime(), a, b) }).length,
    })
  }

  const porPais = new Map<string, { tiendas: number; pagando: number }>()
  for (const t of tiendas) {
    const p = ((t.location as Record<string, string> | undefined)?.country || '').toUpperCase()
    const x = porPais.get(p) || { tiendas: 0, pagando: 0 }
    x.tiendas++
    if (estadoDe.get(t.id) === 'pagando') x.pagando++
    porPais.set(p, x)
  }

  const item = (t: Doc, valor: number, moneda?: string): TopItem => ({ storeId: t.id, nombre: t.name as string, subdominio: t.subdomain as string, valor, ...(moneda ? { moneda } : {}) })
  const top10 = (f: (t: Doc) => number, moneda = false) =>
    tiendas.map(t => ({ t, v: f(t) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 10)
      .map(x => item(x.t, x.v, moneda ? (x.t.currency as string) : undefined))

  const venceProximo: ResumenAdmin['venceProximo'] = []
  for (const t of tiendas) {
    const e = estadoDe.get(t.id)!
    if (e !== 'pagando' && e !== 'cortesia' && e !== 'prueba') continue
    const v = fechaVencimiento(t, calculadoEn.getTime())
    if (v && v.getTime() > calculadoEn.getTime() && v.getTime() - calculadoEn.getTime() <= 7 * DAY) {
      venceProximo.push({ storeId: t.id, nombre: t.name as string, subdominio: t.subdomain as string, estado: e, vence: v.toISOString() })
    }
  }
  venceProximo.sort((a, b) => a.vence.localeCompare(b.vence))

  const productos = Object.entries({ ...DEMO_COLLECTIONS, ...sub }).filter(([k]) => /^stores\/[^/]+\/products$/.test(k)).reduce((s, [, v]) => s + v.length, 0)

  return {
    calculadoEn: calculadoEn.toISOString(),
    origen,
    duracionMs: origen === 'cron' ? 4821 : 3377,
    tiendas: {
      total: tiendas.length,
      nuevasHoy: tiendas.filter(t => creada(t) >= hoy0.getTime() && creada(t) <= calculadoEn.getTime()).length,
      nuevas7d: tiendas.filter(t => calculadoEn.getTime() - creada(t) <= 7 * DAY && creada(t) <= calculadoEn.getTime()).length,
      nuevasMes: tiendas.filter(t => creada(t) >= mes0.getTime() && creada(t) <= calculadoEn.getTime()).length,
      nuevasMesAnteriorMismoDia: tiendas.filter(t => creada(t) >= mesAnt0.getTime() && creada(t) <= mismoDiaAnt.getTime()).length,
    },
    usuarios: { total: usuarios.length },
    productos: { total: productos },
    estados,
    pagando: { pro, business, total: pro + business },
    conversion: { cohorteDias, terminaronPrueba: cohorte.length, pagan: cohorte.filter(t => estadoDe.get(t.id) === 'pagando').length },
    mrr: { porMoneda: mrr, suscripciones, anuales },
    cobros: {
      hoy: sumar(hoy0, new Date(calculadoEn.getTime() + 1)),
      mes: sumar(mes0, new Date(calculadoEn.getTime() + 1)),
      mesAnteriorMismoDia: sumar(mesAnt0, new Date(mismoDiaAnt.getTime() + 1)),
      mesAnterior: sumar(mesAnt0, mes0),
    },
    serie12m,
    paises: [...porPais.entries()].map(([pais, x]) => ({ pais, ...x })).sort((a, b) => b.tiendas - a.tiendas),
    top: {
      visitas: top10(t => METRICAS.get(t.id)!.visitas),
      pedidos: top10(t => METRICAS.get(t.id)!.pedidos),
      whatsapp: top10(t => METRICAS.get(t.id)!.whatsapp),
      ingresos: top10(t => METRICAS.get(t.id)!.ingresos, true),
    },
    venceProximo,
  }
}

// Metricas "de siempre" por tienda para los top (las de AURELIA y las 2 con
// pedidos salen de sus pedidos reales; el resto, inventadas segun el estado).
const METRICAS = new Map<string, { visitas: number; pedidos: number; whatsapp: number; ingresos: number }>()
for (const t of tiendas) {
  const e = estadoDe.get(t.id)!
  const peso = e === 'pagando' ? 1 : e === 'cortesia' || e === 'pago_pendiente' ? 0.6 : e === 'cancelada' || e === 'prueba_vencida' ? 0.25 : e === 'prueba' ? 0.08 : 0.12
  const ords = (t.id === STORE_ID ? DEMO_COLLECTIONS[`stores/${STORE_ID}/orders`] : sub[`stores/${t.id}/orders`]) as Doc[] | undefined
  const visitas = Math.round((800 + rand() * 9000) * peso)
  if (ords?.length) {
    const validos = ords.filter(o => o.status !== 'cancelled')
    METRICAS.set(t.id, { visitas: visitas + 4000, pedidos: validos.length, whatsapp: Math.round(visitas * 0.09), ingresos: round2(validos.reduce((s, o) => s + (o.total as number), 0)) })
  } else {
    const pedidos = Math.round(visitas * (0.004 + rand() * 0.012))
    const ticket = t.currency === 'USD' ? 35 : t.currency === 'PEN' ? 95 : t.currency === 'MXN' ? 520 : t.currency === 'COP' ? 110000 : t.currency === 'ARS' ? 28000 : t.currency === 'CLP' ? 24000 : 35
    METRICAS.set(t.id, { visitas, pedidos, whatsapp: Math.round(visitas * (0.03 + rand() * 0.05)), ingresos: round2(pedidos * ticket * (0.7 + rand() * 0.6)) })
  }
}

/** El resumen recalculado al momento (lo devuelve el mock de POST /api/admin-stats). */
export function resumenAhora(): ResumenAdmin {
  return resumen(new Date(), 'manual')
}

const RESUMEN_GUARDADO = resumen(ago(3 * HOUR), 'cron')

/** Para revisar los datos en consola: cuantas tiendas hay en cada estado. */
export const DEMO_ADMIN_DEBUG = { estados: RESUMEN_GUARDADO.estados, facturas: invoices.length }

// ── Colecciones ──────────────────────────────────────────────────────────────
export const ADMIN_COLLECTIONS: Record<string, Doc[]> = {
  stores: tiendas,
  users: usuarios,
  feedback,
  chats,
  adminNotes,
  adminStats: [{ id: 'resumen', ...(RESUMEN_GUARDADO as unknown as Record<string, unknown>) }],
  ...sub,
}
