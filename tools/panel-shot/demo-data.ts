/**
 * Datos de ejemplo de la tienda AURELIA (moda, USD) para las capturas del panel.
 *
 * TODO ES INVENTADO: productos, clientes, pedidos, gastos y proveedores. Los
 * telefonos usan el rango 555-0100..0199 de Norteamerica, reservado para ficcion,
 * asi que no pueden ser de nadie.
 *
 * Las fechas son relativas a "ahora": el mes en curso (ultimos 30 dias) concentra
 * la actividad y hay otros dos meses detras para que las comparaciones ("vs periodo
 * previo") y los graficos tengan contra que medirse. Nada de dias 30 ni 60 exactos:
 * caen en el borde de las ventanas de 30 dias y cambiarian de lado segun la hora.
 *
 * El generador es determinista (semilla fija): cada corrida da los mismos pedidos,
 * solo se corren las fechas con el dia.
 *
 * Lo consume mock-firestore.ts, que convierte los Date en Timestamp al leer, igual
 * que Firestore.
 */
import type { Store, User } from '../../src/types'

const DAY = 86_400_000
const NOW = Date.now()

// ── Azar con semilla ─────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Semilla elegida entre 400 probando que los numeros cierren (ventas del mes ~5.2k USD,
// utilidad neta ~27%, crecimiento sobre los dos meses anteriores, grafico con barras).
const rand = mulberry32(97)
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
function pickWeighted<T>(items: T[], weight: (x: T) => number): T {
  const total = items.reduce((s, x) => s + weight(x), 0)
  let r = rand() * total
  for (const x of items) {
    r -= weight(x)
    if (r <= 0) return x
  }
  return items[items.length - 1]
}
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Fecha `daysAgo` dias atras a la hora dada (hora de UTC-5, Lima/Bogota; usar 0..18).
 * Nunca en el futuro.
 *
 * Se fija en UTC y no en la hora local de la maquina porque el grafico "Ingresos vs
 * gastos por dia" del Resumen agrupa por dia UTC (toISOString). Asi el dia de cada
 * pedido en el grafico no cambia segun a que hora se corran las capturas.
 */
function at(daysAgo: number, hour: number, minute = 0): Date {
  const d = new Date(NOW - daysAgo * DAY)
  d.setUTCHours(hour + 5, minute, 0, 0)
  const tope = NOW - (15 + ((hour * 7 + minute) % 40)) * 60_000
  if (d.getTime() > tope) return new Date(tope)
  return d
}

// ── Tienda, usuario ──────────────────────────────────────────────────────────
export const STORE_ID = 'demo'
export const OWNER_UID = 'demo-owner'

export const DEMO_STORE = {
  id: STORE_ID,
  ownerId: OWNER_UID,
  name: 'AURELIA',
  subdomain: 'aurelia',
  whatsapp: '+13055550100',
  instagram: 'aurelia.store',
  currency: 'USD',
  language: 'es',
  timezone: 'America/New_York',
  location: { country: 'US', city: 'Miami' },
  themeId: 'boutique',
  businessType: 'fashion',
  about: { slogan: 'Moda que se siente tuya' },
  plan: 'business',
  subscription: {
    stripeCustomerId: 'cus_demo',
    stripeSubscriptionId: 'sub_demo',
    stripePriceId: 'price_demo',
    status: 'active',
    currentPeriodEnd: new Date(NOW + 18 * DAY),
    cancelAtPeriodEnd: false,
  },
  onboardingDismissed: true,
  linkShared: true,
  catalogSettings: { showOutOfStock: true, lowStockThreshold: 5 },
  createdAt: new Date(NOW - 240 * DAY),
  updatedAt: new Date(NOW - 2 * DAY),
} as unknown as Store

export const DEMO_USER = {
  id: OWNER_UID,
  email: 'hola@aurelia.store',
  firstName: 'Daniela',
  lastName: 'Ríos',
  storeId: STORE_ID,
  role: 'user',
  createdAt: new Date(NOW - 240 * DAY),
  updatedAt: new Date(NOW - 2 * DAY),
} as User

/** Lo minimo de un firebase.User que el panel toca (uid, email, getIdToken). */
export const DEMO_FIREBASE_USER = {
  uid: OWNER_UID,
  email: DEMO_USER.email,
  emailVerified: true,
  displayName: 'Daniela Ríos',
  photoURL: null,
  phoneNumber: null,
  isAnonymous: false,
  providerId: 'firebase',
  tenantId: null,
  providerData: [],
  metadata: {},
  refreshToken: 'demo',
  getIdToken: async () => 'demo-token',
  getIdTokenResult: async () => ({ token: 'demo-token', claims: {} }),
  reload: async () => {},
  delete: async () => {},
  toJSON: () => ({ uid: OWNER_UID }),
}

// ── Almacenes, categorias ────────────────────────────────────────────────────
const W_TIENDA = 'wh-tienda'
const W_ALMACEN = 'wh-almacen'
const BRANCH = 'br-principal'

const branches = [
  { id: BRANCH, name: 'Local principal', address: 'Av. Las Palmeras 214', active: true, warehouseId: W_TIENDA, warehouseName: 'Tienda', createdAt: new Date(NOW - 200 * DAY), updatedAt: new Date(NOW - 200 * DAY) },
]
const warehouses = [
  { id: W_TIENDA, name: 'Tienda', branchId: BRANCH, branchName: 'Local principal', isDefault: true, active: true, createdAt: new Date(NOW - 200 * DAY), updatedAt: new Date(NOW - 200 * DAY) },
  { id: W_ALMACEN, name: 'Almacén', branchId: BRANCH, branchName: 'Local principal', isDefault: false, active: true, createdAt: new Date(NOW - 199 * DAY), updatedAt: new Date(NOW - 199 * DAY) },
]

const CATS: [string, string][] = [
  ['cat-blusas', 'Blusas y camisas'],
  ['cat-pantalones', 'Pantalones'],
  ['cat-polos', 'Polos'],
  ['cat-calzado', 'Calzado'],
  ['cat-accesorios', 'Accesorios'],
  ['cat-bolsos', 'Bolsos y mochilas'],
]
const categories = CATS.map(([id, name], i) => ({
  id, name, storeId: STORE_ID,
  slug: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-'),
  order: i, active: true,
  createdAt: new Date(NOW - 230 * DAY), updatedAt: new Date(NOW - 230 * DAY),
}))

// ── Productos ────────────────────────────────────────────────────────────────
const IMG = {
  blusa: '/demo-products/blusa.jpg',
  camisa: '/demo-products/camisa.jpg',
  collar: '/demo-products/collar.jpg',
  collar2: '/landing/prod-collar.jpg',
  lentes: '/demo-products/lentes.jpg',
  mochila: '/demo-products/mochila.jpg',
  polo: '/demo-products/polo.jpg',
  reloj: '/demo-products/reloj.jpg',
  zapatillas: '/demo-products/zapatillas.jpg',
  pantalon: '/landing/prod-pantalon.jpg',
}

type Dist = [number, number] // [Tienda, Almacén]
interface Spec {
  id: string
  name: string
  cat: string
  img: string | null
  price: number
  cost: number
  sku: string
  pop: number // peso de venta
  track?: boolean
  simple?: Dist
  // variaciones: nombre -> valores; combos: stock por combinacion en el orden del producto cartesiano
  vars?: [string, string[]][]
  combos?: Dist[]
  lowStockAlert?: number
}

const TALLAS = ['S', 'M', 'L']
const NUMEROS = ['36', '37', '38', '39']

const SPECS: Spec[] = [
  { id: 'p-aretes', name: 'Aretes Perla Gota', cat: 'cat-accesorios', img: IMG.collar, price: 29, cost: 11, sku: 'AUR-ARE-01', pop: 3, simple: [4, 14] },
  { id: 'p-blusa-bordada', name: 'Blusa Bordada Flores', cat: 'cat-blusas', img: IMG.blusa, price: 59, cost: 24, sku: 'AUR-BLU-01', pop: 5,
    vars: [['Talla', TALLAS], ['Color', ['Blanco', 'Marfil']]], combos: [[2, 5], [1, 4], [3, 6], [2, 4], [1, 4], [1, 2]] },
  { id: 'p-bolso-mini', name: 'Bolso Mochila Mini', cat: 'cat-bolsos', img: IMG.mochila, price: 72, cost: 31, sku: 'AUR-BOL-02', pop: 2, simple: [3, 9] },
  { id: 'p-camisa-denim', name: 'Camisa Denim Topos', cat: 'cat-blusas', img: IMG.camisa, price: 64, cost: 26, sku: 'AUR-CAM-01', pop: 3,
    vars: [['Talla', TALLAS]], combos: [[2, 6], [3, 7], [2, 4]] },
  { id: 'p-camiseta-original', name: 'Camiseta Estampada Original', cat: 'cat-polos', img: IMG.polo, price: 29, cost: 10, sku: 'AUR-POL-02', pop: 4,
    vars: [['Talla', TALLAS]], combos: [[4, 10], [5, 12], [3, 8]] },
  { id: 'p-collar-perlas', name: 'Collar de Perlas', cat: 'cat-accesorios', img: IMG.collar2, price: 49, cost: 18, sku: 'AUR-COL-01', pop: 4, simple: [3, 0] },
  { id: 'p-blusa-denim', name: 'Blusa Denim Clara', cat: 'cat-blusas', img: IMG.camisa, price: 55, cost: 22, sku: 'AUR-BLU-02', pop: 2,
    vars: [['Talla', TALLAS]], combos: [[2, 5], [2, 6], [1, 3]] },
  { id: 'p-gafas-sol', name: 'Gafas de Sol Clásicas', cat: 'cat-accesorios', img: IMG.lentes, price: 45, cost: 16, sku: 'AUR-LEN-02', pop: 2, simple: [5, 12] },
  { id: 'p-jogger-rosa', name: 'Jogger Satinado Rosa', cat: 'cat-pantalones', img: IMG.pantalon, price: 68, cost: 27, sku: 'AUR-PAN-01', pop: 5,
    vars: [['Talla', TALLAS]], combos: [[2, 6], [3, 8], [2, 5]] },
  { id: 'p-kimono', name: 'Kimono Bordado Floral', cat: 'cat-blusas', img: IMG.blusa, price: 72, cost: 30, sku: 'AUR-KIM-01', pop: 2, simple: [2, 7] },
  { id: 'p-lentes-redondos', name: 'Lentes Redondos Dorados', cat: 'cat-accesorios', img: IMG.lentes, price: 45, cost: 16, sku: 'AUR-LEN-01', pop: 3, simple: [2, 2] },
  { id: 'p-mochila-urbana', name: 'Mochila Urbana Navy', cat: 'cat-bolsos', img: IMG.mochila, price: 89, cost: 38, sku: 'AUR-MOC-01', pop: 3, simple: [4, 11] },
  { id: 'p-palazzo', name: 'Pantalón Palazzo Arena', cat: 'cat-pantalones', img: IMG.pantalon, price: 79, cost: 32, sku: 'AUR-PAN-02', pop: 3,
    vars: [['Talla', TALLAS]], combos: [[1, 4], [2, 5], [1, 3]] },
  { id: 'p-polo-basico', name: 'Polo Básico Algodón', cat: 'cat-polos', img: IMG.polo, price: 25, cost: 9, sku: 'AUR-POL-01', pop: 4,
    vars: [['Talla', TALLAS], ['Color', ['Negro', 'Blanco']]], combos: [[3, 8], [2, 7], [4, 10], [4, 9], [3, 6], [2, 5]] },
  { id: 'p-pulsera', name: 'Pulsera Perlas Finas', cat: 'cat-accesorios', img: IMG.collar, price: 25, cost: 8, sku: 'AUR-PUL-01', pop: 2, simple: [0, 0] },
  { id: 'p-reloj', name: 'Reloj Minimal Blanco', cat: 'cat-accesorios', img: IMG.reloj, price: 85, cost: 36, sku: 'AUR-REL-01', pop: 3, simple: [3, 8] },
  { id: 'p-rinonera', name: 'Riñonera Urbana', cat: 'cat-bolsos', img: IMG.mochila, price: 45, cost: 18, sku: 'AUR-RIN-01', pop: 2, simple: [3, 9] },
  { id: 'p-sobrecamisa', name: 'Sobrecamisa Oxford Celeste', cat: 'cat-blusas', img: IMG.camisa, price: 69, cost: 28, sku: 'AUR-CAM-02', pop: 2,
    vars: [['Talla', TALLAS]], combos: [[2, 4], [2, 6], [1, 4]] },
  { id: 'p-tenis-retro', name: 'Tenis Retro Colores', cat: 'cat-calzado', img: IMG.zapatillas, price: 95, cost: 42, sku: 'AUR-ZAP-02', pop: 3,
    vars: [['Talla', NUMEROS]], combos: [[1, 3], [2, 4], [2, 5], [1, 3]] },
  { id: 'p-top-bordado', name: 'Top Bordado Marfil', cat: 'cat-blusas', img: IMG.blusa, price: 49, cost: 19, sku: 'AUR-TOP-01', pop: 3,
    vars: [['Talla', TALLAS]], combos: [[2, 5], [3, 6], [1, 4]] },
  { id: 'p-zapatillas-urbanas', name: 'Zapatillas Urbanas', cat: 'cat-calzado', img: IMG.zapatillas, price: 98, cost: 43, sku: 'AUR-ZAP-01', pop: 5,
    vars: [['Talla', NUMEROS]], combos: [[1, 0], [1, 1], [1, 0], [0, 1]] },
]

function cartesian(vars: [string, string[]][]): Record<string, string>[] {
  let out: Record<string, string>[] = [{}]
  for (const [name, values] of vars) {
    const next: Record<string, string>[] = []
    for (const o of out) for (const v of values) next.push({ ...o, [name]: v })
    out = next
  }
  return out
}

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const products = SPECS.map((s, i) => {
  const base: Record<string, unknown> = {
    id: s.id,
    storeId: STORE_ID,
    name: s.name,
    slug: slugify(s.name),
    price: s.price,
    cost: s.cost,
    sku: s.sku,
    image: s.img,
    images: s.img ? [s.img] : [],
    categoryId: s.cat,
    trackStock: s.track !== false,
    active: true,
    featured: s.pop >= 5,
    order: i,
    createdAt: new Date(NOW - (200 - i * 5) * DAY),
    updatedAt: new Date(NOW - randInt(1, 12) * DAY),
  }
  if (s.lowStockAlert) base.lowStockAlert = s.lowStockAlert
  if (s.vars && s.combos) {
    const opts = cartesian(s.vars)
    const combinations = opts.map((options, j) => {
      const [t, a] = s.combos![j]
      const warehouseStock: Record<string, number> = { [W_TIENDA]: t, [W_ALMACEN]: a }
      return {
        id: `${s.id}-c${j + 1}`,
        options,
        sku: `${s.sku}-${Object.values(options).map(v => slugify(v).slice(0, 3).toUpperCase()).join('-')}`,
        stock: t + a,
        warehouseStock,
        available: t + a > 0,
      }
    })
    const ws: Record<string, number> = { [W_TIENDA]: 0, [W_ALMACEN]: 0 }
    for (const c of combinations) {
      ws[W_TIENDA] += c.warehouseStock[W_TIENDA]
      ws[W_ALMACEN] += c.warehouseStock[W_ALMACEN]
    }
    Object.assign(base, {
      hasVariations: true,
      variations: s.vars.map(([name, values], k) => ({
        id: `${s.id}-v${k + 1}`,
        name,
        options: values.map((value, m) => ({ id: `${s.id}-v${k + 1}-o${m + 1}`, value, available: true })),
      })),
      combinations,
      stock: combinations.reduce((sum, c) => sum + c.stock, 0),
      warehouseStock: ws,
    })
  } else if (s.track !== false) {
    const [t, a] = s.simple || [0, 0]
    Object.assign(base, { stock: t + a, warehouseStock: { [W_TIENDA]: t, [W_ALMACEN]: a } })
  }
  return base
})

type Prod = (typeof products)[number]
const productById = new Map(products.map(p => [p.id as string, p]))
const vendibles = SPECS.filter(s => s.pop > 0)

// ── Clientes ─────────────────────────────────────────────────────────────────
const NOMBRES = [
  'Valentina', 'Camila', 'Sofía', 'Lucía', 'Mariana', 'Daniela', 'Fernanda', 'Gabriela', 'Andrea', 'Isabella',
  'Paula', 'Renata', 'Ximena', 'Natalia', 'Carolina', 'Adriana', 'Julieta', 'Florencia', 'Antonella', 'Micaela',
  'Jimena', 'Alejandra', 'Victoria', 'Emilia', 'Rosa', 'Elena', 'Mateo', 'Diego', 'Sebastián', 'Andrés',
]
const APELLIDOS = [
  'Herrera', 'Rojas', 'Castillo', 'Mendoza', 'Paredes', 'Salazar', 'Núñez', 'Villanueva', 'Cárdenas', 'Benítez',
  'Aguilar', 'Delgado', 'Fuentes', 'Vega', 'Montoya', 'Rivas', 'Campos', 'Ortega', 'Palacios', 'Ramos',
  'Ibarra', 'Duarte', 'Soto', 'Robles', 'Tapia', 'León', 'Navarro', 'Chávez', 'Prado', 'Quintero',
]
interface Cliente { name: string; phone: string }
const clientes: Cliente[] = []
{
  const usados = new Set<string>()
  let n = 0
  // Lineas 0100..0199 de dos codigos de area, mezcladas para que no salgan en fila.
  const lineas: string[] = []
  for (let i = 0; i < 100; i++) for (const area of ['305', '786']) lineas.push(`+1 ${area} 555 ${String(100 + i).padStart(4, '0')}`)
  const telefonos = lineas.map(x => [rand(), x] as const).sort((p, q) => p[0] - q[0]).map(p => p[1])
  // Los primeros 30 (entre ellos los que compran seguido) no repiten nombre ni apellido.
  const barajar = (xs: string[]) => xs.map(x => [rand(), x] as const).sort((p, q) => p[0] - q[0]).map(p => p[1])
  const nombres = barajar(NOMBRES)
  const apellidos = barajar(APELLIDOS)
  while (clientes.length < 90) {
    const nombre = n < 30 ? nombres[n] : NOMBRES[randInt(0, NOMBRES.length - 1)]
    const apellido = n < 30 ? apellidos[n] : APELLIDOS[randInt(0, APELLIDOS.length - 1)]
    const name = `${nombre} ${apellido}`
    if (usados.has(name)) continue
    usados.add(name)
    clientes.push({ name, phone: telefonos[n] })
    n++
  }
}

// ── Pedidos ──────────────────────────────────────────────────────────────────
interface Hueco { day: number; hour: number; minute: number }
const huecos: Hueco[] = []
// Pedidos por ventana de 30 dias: el mes en curso crece sobre los dos anteriores.
const VENTANAS: [desde: number, hasta: number, pedidos: number][] = [[0, 29, 48], [31, 59, 38], [61, 89, 31]]
// En celular el grafico del Resumen solo deja ver las columnas que llevan fecha (cada
// 5 dias: hace 29, 24, 19, 14, 9 y 4 dias; las demas quedan con ancho cero). Esos dias
// llevan ventas seguras para que el grafico no salga vacio. Los ultimos 4 dias tambien:
// ahi estan los pedidos en curso y tiene que quedar alguno ya entregado.
const FIJOS: Record<number, number> = { 29: 2, 24: 2, 19: 2, 14: 2, 9: 2, 4: 2, 3: 2, 2: 2, 1: 2, 0: 2 }
for (const [desde, hasta, pedidos] of VENTANAS) {
  const cuenta = new Map<number, number>()
  for (let d = desde; d <= hasta; d++) cuenta.set(d, 0)
  const dias = [...cuenta.keys()]
  let puestos = 0
  for (const d of dias) {
    const fijos = FIJOS[d] || 0
    for (let k = 0; k < fijos; k++) huecos.push({ day: d, hour: randInt(9, 18), minute: randInt(0, 59) })
    cuenta.set(d, fijos)
    puestos += fijos
  }
  for (let k = puestos; k < pedidos; k++) {
    // Fines de semana venden mas; un dia que ya tiene pedidos pesa menos, asi se reparten.
    const d = pickWeighted(dias, x => {
      // "Fin de semana" fijo respecto de hoy (no del calendario real): asi los datos salen
      // iguales cualquier dia que se corra, solo se corren las fechas.
      const finde = x % 7 === 1 || x % 7 === 2
      return (finde ? 1.7 : 1) / (1 + cuenta.get(x)! * 1.6)
    })
    cuenta.set(d, cuenta.get(d)! + 1)
    huecos.push({ day: d, hour: randInt(9, 18), minute: randInt(0, 59) })
  }
}
// del mas viejo al mas nuevo, para numerar en orden
huecos.sort((a, b) => at(a.day, a.hour, a.minute).getTime() - at(b.day, b.hour, b.minute).getTime())

// Clientes recurrentes: cuantos pedidos hace cada uno. El resto son de una sola compra.
const RECURRENTES = [7, 6, 5, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2]
const asignacion: number[] = new Array(huecos.length).fill(-1)
{
  let c = 0
  for (const veces of RECURRENTES) {
    let puestos = 0
    let intentos = 0
    while (puestos < veces && intentos < 500) {
      intentos++
      const i = randInt(0, huecos.length - 1)
      if (asignacion[i] !== -1) continue
      asignacion[i] = c
      puestos++
    }
    c++
  }
  for (let i = 0; i < asignacion.length; i++) if (asignacion[i] === -1) asignacion[i] = c++
}

const PAGOS = ['mercadopago', 'card', 'transfer', 'cash', 'paypal', 'mercadopago', 'card'] as const
const CUPON = { code: 'BIENVENIDA10', type: 'percentage' as const, value: 10 }

function comboDe(p: Prod) {
  const combos = p.combinations as { id: string; options: Record<string, string>; sku: string }[] | undefined
  if (!combos || combos.length === 0) return null
  return combos[randInt(0, combos.length - 1)]
}

const orders = huecos.map((h, i) => {
  const createdAt = at(h.day, h.hour, h.minute)
  const cliente = clientes[asignacion[i] % clientes.length]
  const r = rand()
  // El mes en curso trae canastas un poco mas grandes (la coleccion nueva).
  const nItems = h.day < 30 ? (r < 0.22 ? 1 : r < 0.72 ? 2 : 3) : (r < 0.34 ? 1 : r < 0.82 ? 2 : 3)
  const elegidos = new Set<string>()
  const items = []
  for (let k = 0; k < nItems; k++) {
    const s = pickWeighted(vendibles.filter(x => !elegidos.has(x.id)), x => x.pop)
    elegidos.add(s.id)
    const p = productById.get(s.id)!
    const barato = s.price < 35
    const quantity = barato && rand() < 0.35 ? 2 : 1
    const combo = comboDe(p)
    const item: Record<string, unknown> = {
      productId: s.id,
      productName: s.name,
      productImage: s.img,
      price: s.price,
      quantity,
      itemTotal: s.price * quantity,
    }
    if (combo) {
      item.selectedVariations = Object.entries(combo.options).map(([name, value]) => ({ name, value }))
      item.combinationId = combo.id
      item.combinationSku = combo.sku
    }
    items.push(item)
  }
  const subtotal = items.reduce((s, it) => s + (it.itemTotal as number), 0)
  const canal = rand()
  const channel = canal < 0.68 ? 'online' : canal < 0.84 ? 'whatsapp' : canal < 0.9 ? 'instagram' : 'in_store'
  const pickup = channel === 'in_store' || rand() < 0.2
  const shippingCost = pickup ? 0 : 6
  const conCupon = channel === 'online' && rand() < 0.14
  const discount = conCupon ? { ...CUPON, amount: Math.round(subtotal * 0.1) } : undefined
  const total = round2(subtotal - (discount?.amount || 0) + shippingCost)
  const paymentMethod = channel === 'in_store' ? (rand() < 0.5 ? 'cash' : 'card') : PAGOS[randInt(0, PAGOS.length - 1)]
  const order: Record<string, unknown> = {
    id: `o-${String(i + 1).padStart(3, '0')}`,
    storeId: STORE_ID,
    orderNumber: `ORD-${1287 + i}`,
    items,
    customer: { name: cliente.name, phone: cliente.phone },
    deliveryMethod: pickup ? 'pickup' : 'delivery',
    subtotal,
    shippingCost,
    total,
    status: 'delivered',
    paymentMethod,
    paymentStatus: 'paid',
    paidAt: new Date(createdAt.getTime() + randInt(2, 40) * 60_000),
    channel,
    stockDecremented: true,
    createdAt,
    updatedAt: new Date(Math.min(NOW - 5 * 60_000, createdAt.getTime() + randInt(18, 50) * 3_600_000)),
  }
  if (channel === 'in_store') order.manual = true
  if (discount) order.discount = discount
  if (!pickup) order.deliveryAddress = { street: `Calle ${randInt(2, 98)} #${randInt(100, 999)}`, city: 'Miami' }
  return order
})

// Los ultimos pedidos todavia estan en curso: dos sin pagar y tres pagados en camino.
{
  const recientes = [...orders].sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
  const enCurso: [string, string][] = [['pending', 'pending'], ['pending', 'pending'], ['confirmed', 'paid'], ['preparing', 'paid'], ['ready', 'paid']]
  enCurso.forEach(([status, paymentStatus], k) => {
    const o = recientes[k]
    o.status = status
    o.paymentStatus = paymentStatus
    if (paymentStatus === 'pending') {
      delete o.paidAt
      o.paymentMethod = k === 0 ? 'transfer' : 'whatsapp'
    }
    if (status === 'ready') {
      o.deliveryMethod = 'pickup'
      o.total = round2((o.total as number) - (o.shippingCost as number))
      o.shippingCost = 0
      delete o.deliveryAddress
    }
    o.updatedAt = o.createdAt
  })
  // Un cancelado por mes, como pasa en cualquier tienda.
  for (const [desde, hasta] of [[9, 16], [38, 46], [70, 80]]) {
    const o = orders.find(x => {
      const d = (NOW - (x.createdAt as Date).getTime()) / DAY
      return d >= desde && d <= hasta && x.status === 'delivered'
    })
    if (o) {
      o.status = 'cancelled'
      o.paymentStatus = 'pending'
      delete o.paidAt
      o.stockDecremented = false
    }
  }
}

// ── Gastos, compras, proveedores ─────────────────────────────────────────────
const suppliers = [
  { id: 'sup-textil', name: 'Textil del Valle', contactName: 'Marcos Villalba', phone: '+1 305 555 0181', notes: 'Blusas, joggers y camisetas. Entrega en 10 dias.', active: true, productIds: ['p-blusa-bordada', 'p-jogger-rosa', 'p-top-bordado', 'p-camiseta-original'], createdAt: new Date(NOW - 190 * DAY), updatedAt: new Date(NOW - 20 * DAY) },
  { id: 'sup-calzado', name: 'Paso Firme', contactName: 'Irene Solís', phone: '+1 786 555 0183', notes: 'Calzado y bolsos.', active: true, productIds: ['p-zapatillas-urbanas', 'p-tenis-retro', 'p-rinonera'], createdAt: new Date(NOW - 170 * DAY), updatedAt: new Date(NOW - 45 * DAY) },
  { id: 'sup-bisuteria', name: 'Perla Fina', contactName: 'Tomás Arce', phone: '+1 305 555 0185', notes: 'Bisutería, lentes y relojes.', active: true, productIds: ['p-collar-perlas', 'p-aretes', 'p-pulsera', 'p-lentes-redondos', 'p-gafas-sol', 'p-reloj'], createdAt: new Date(NOW - 160 * DAY), updatedAt: new Date(NOW - 21 * DAY) },
]

function compra(id: string, day: number, supplierId: string, lineas: [string, number][], etiqueta: string) {
  const sup = suppliers.find(s => s.id === supplierId)!
  const items = lineas.map(([pid, quantity]) => {
    const p = productById.get(pid)!
    return { productId: pid, productName: p.name as string, quantity, unitCost: p.cost as number, totalCost: round2((p.cost as number) * quantity) }
  })
  const total = round2(items.reduce((s, it) => s + it.totalCost, 0))
  const date = at(day, 11, 20)
  return {
    id, supplierId, supplierName: sup.name, items, subtotal: total, total,
    status: 'received', warehouseId: W_ALMACEN, warehouseName: 'Almacén',
    date, expenseId: `e-${id}`, createdAt: date, updatedAt: date, etiqueta,
  }
}
// Las compras recientes son reposiciones chicas de productos con stock de sobra; lo
// que se esta agotando (Zapatillas Urbanas, Collar de Perlas, Lentes Redondos) todavia
// no se repuso, que es justo lo que avisa Inventario.
const purchases = [
  compra('pu-005', 6, 'sup-calzado', [['p-tenis-retro', 6], ['p-bolso-mini', 4]], 'Compra calzado'),
  compra('pu-004', 11, 'sup-textil', [['p-blusa-bordada', 20], ['p-jogger-rosa', 15], ['p-top-bordado', 15], ['p-camiseta-original', 28]], 'Compra de ropa'),
  compra('pu-003', 21, 'sup-bisuteria', [['p-aretes', 13], ['p-gafas-sol', 8], ['p-reloj', 4]], 'Compra joyería'),
  compra('pu-002', 42, 'sup-calzado', [['p-zapatillas-urbanas', 12], ['p-tenis-retro', 12], ['p-rinonera', 10]], 'Compra calzado'),
  compra('pu-001', 68, 'sup-bisuteria', [['p-collar-perlas', 20], ['p-aretes', 30], ['p-pulsera', 25], ['p-lentes-redondos', 20], ['p-reloj', 10]], 'Compra joyería'),
]

// Descripciones cortas: en celular la lista de Gastos corta el texto a ~16 letras.
// Ningun gasto grande cae en los dias que el grafico muestra en celular (ver FIJOS);
// solo dos chicos, para que se vea alguna barra de gasto al lado de las de ingreso.
type Gasto = [day: number, description: string, category: string, amount: number, recurrente?: boolean]
const GASTOS: Gasto[] = [
  // Mes en curso
  [27, 'Alquiler', 'Servicios', 450, true],
  [24, 'Luz y agua', 'Servicios', 78, true],
  [22, 'Recarga Meta Ads', 'Publicidad', 220],
  [18, 'Courier de envíos', 'Envios', 145],
  [14, 'Bolsas y cajas', 'Empaque', 138],
  [8, 'Recarga Meta Ads', 'Publicidad', 240],
  [5, 'Apoyo en tienda', 'Personal', 240],
  [3, 'Courier de envíos', 'Envios', 160],
  [1, 'Pasarela de pago', 'Plataforma', 96],
  // Mes anterior
  [57, 'Alquiler', 'Servicios', 450],
  [54, 'Luz y agua', 'Servicios', 74],
  [51, 'Recarga Meta Ads', 'Publicidad', 200],
  [48, 'Courier de envíos', 'Envios', 130],
  [45, 'Sesión de fotos', 'Publicidad', 180],
  [38, 'Recarga Meta Ads', 'Publicidad', 210],
  [35, 'Apoyo en tienda', 'Personal', 240],
  [33, 'Courier de envíos', 'Envios', 140],
  [32, 'Pasarela de pago', 'Plataforma', 82],
  // Hace dos meses
  [87, 'Alquiler', 'Servicios', 450],
  [84, 'Luz y agua', 'Servicios', 76],
  [80, 'Recarga Meta Ads', 'Publicidad', 180],
  [76, 'Courier de envíos', 'Envios', 125],
  [72, 'Bolsas y cajas', 'Empaque', 95],
  [65, 'Apoyo en tienda', 'Personal', 240],
  [63, 'Courier de envíos', 'Envios', 118],
  [62, 'Pasarela de pago', 'Plataforma', 70],
]
const expenses: Record<string, unknown>[] = GASTOS.map(([day, description, category, amount, recurrente], i) => {
  const date = at(day, 12, 0)
  const e: Record<string, unknown> = {
    id: `e-${String(i + 1).padStart(3, '0')}`,
    description, category, amount,
    date,
    isRecurring: !!recurrente,
    createdAt: new Date(date.getTime() + 3_600_000),
  }
  if (recurrente) e.recurringFrequency = 'monthly'
  return e
})
// Las compras de mercaderia tambien se registran como gasto (categoria Inventario),
// igual que hace Purchases.tsx al recibir una compra.
for (const pu of purchases) {
  expenses.push({
    id: pu.expenseId,
    description: pu.etiqueta,
    category: 'Inventario',
    amount: pu.total,
    date: pu.date,
    isRecurring: false,
    createdAt: pu.date,
  })
}

// ── Movimientos de stock (ultimos ~45 dias) ──────────────────────────────────
// Se arman hacia atras desde el stock actual, asi "antes → despues" encadena bien.
interface Mov { [k: string]: unknown; createdAt: Date; productId: string; quantity: number }
const movs: Mov[] = []
/** Para revisar los datos: movimientos cuyo "antes" dio negativo (no deberia haber). */
export const DEMO_DEBUG = { stockRecortado: [] as string[] }
const LIMITE_MOV = 45
for (const o of orders) {
  const d = (NOW - (o.createdAt as Date).getTime()) / DAY
  if (d > LIMITE_MOV || o.status === 'cancelled') continue
  for (const it of o.items as Record<string, unknown>[]) {
    const p = productById.get(it.productId as string)!
    if (!p.trackStock) continue
    const m: Mov = {
      productId: p.id as string, productName: p.name as string, type: 'sale',
      quantity: -(it.quantity as number), referenceType: 'order', referenceId: o.id,
      reason: `Pedido ${o.orderNumber}`, createdBy: 'system', createdAt: new Date((o.createdAt as Date).getTime() + 60_000),
    }
    const sv = it.selectedVariations as { name: string; value: string }[] | undefined
    if (sv) {
      m.variationName = sv.map(v => v.name).join(' / ')
      m.optionValue = sv.map(v => v.value).join(' / ')
    }
    movs.push(m)
  }
}
for (const pu of purchases) {
  const d = (NOW - pu.date.getTime()) / DAY
  if (d > LIMITE_MOV) continue
  for (const it of pu.items) {
    movs.push({
      productId: it.productId, productName: it.productName, type: 'purchase', quantity: it.quantity,
      referenceType: 'purchase', referenceId: pu.id, reason: `Compra a ${pu.supplierName}`,
      warehouseId: W_ALMACEN, warehouseName: 'Almacén', createdBy: OWNER_UID, createdAt: new Date(pu.date.getTime() + 30 * 60_000),
    })
  }
}
movs.push({
  productId: 'p-gafas-sol', productName: 'Gafas de Sol Clásicas', type: 'adjustment', quantity: -1,
  referenceType: 'manual', reason: 'Recuento: una unidad con la patilla rota', warehouseId: W_TIENDA, warehouseName: 'Tienda',
  createdBy: OWNER_UID, createdAt: at(13, 17, 10),
})
// Transferencias Almacén → Tienda (el total del producto no cambia)
const transferencias: [string, number, number][] = [['p-mochila-urbana', 3, 9], ['p-reloj', 2, 6], ['p-aretes', 4, 20]]
const movsTransfer: Mov[] = []
for (const [pid, qty, day] of transferencias) {
  const p = productById.get(pid)!
  const ws = p.warehouseStock as Record<string, number>
  const cuando = at(day, 10, 15)
  movsTransfer.push(
    { productId: pid, productName: p.name as string, type: 'transfer', quantity: -qty, previousStock: ws[W_ALMACEN] + qty, newStock: ws[W_ALMACEN], reason: 'Transferencia a Tienda', warehouseId: W_ALMACEN, warehouseName: 'Almacén', createdBy: OWNER_UID, createdAt: cuando },
    { productId: pid, productName: p.name as string, type: 'transfer', quantity: qty, previousStock: Math.max(0, ws[W_TIENDA] - qty), newStock: ws[W_TIENDA], reason: 'Transferencia desde Almacén', warehouseId: W_TIENDA, warehouseName: 'Tienda', createdBy: OWNER_UID, createdAt: new Date(cuando.getTime() + 1000) },
  )
}
{
  const corriendo = new Map<string, number>()
  for (const p of products) corriendo.set(p.id as string, (p.stock as number) || 0)
  movs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  for (const m of movs) {
    const despues = corriendo.get(m.productId) ?? 0
    const antes = despues - m.quantity
    m.newStock = despues
    m.previousStock = Math.max(0, antes)
    if (antes < 0) DEMO_DEBUG.stockRecortado.push(`${m.productName} (${antes})`)
    corriendo.set(m.productId, Math.max(0, antes))
  }
}
const stockMovements = [...movs, ...movsTransfer]
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  .map((m, i) => ({ id: `mv-${String(i + 1).padStart(4, '0')}`, ...m }))

// ── Colecciones ──────────────────────────────────────────────────────────────
type Doc = { id: string } & Record<string, unknown>
const S = `stores/${STORE_ID}`
export const DEMO_COLLECTIONS: Record<string, Doc[]> = {
  stores: [DEMO_STORE as unknown as Doc],
  users: [DEMO_USER as unknown as Doc],
  [`${S}/products`]: products as Doc[],
  [`${S}/categories`]: categories,
  [`${S}/orders`]: orders as Doc[],
  [`${S}/expenses`]: expenses as Doc[],
  [`${S}/warehouses`]: warehouses,
  [`${S}/branches`]: branches,
  [`${S}/suppliers`]: suppliers,
  [`${S}/purchases`]: purchases as unknown as Doc[],
  [`${S}/stock_movements`]: stockMovements as Doc[],
}
