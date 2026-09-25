/**
 * Monto de cobro calculado en el SERVIDOR para los pedidos del storefront.
 *
 * Antes cada endpoint de pago (MP, Stripe, PayPal, Go Cuotas) cobraba el
 * monto/ítems que mandaba el navegador del comprador, y las confirmaciones no
 * comparaban lo pagado contra el pedido. Cualquiera podía pagar 1 centavo por
 * un pedido de 1000.
 *
 * Ahora:
 *  - priceOrder() recalcula el total del pedido desde los docs de producto
 *    (precio, combinación de variantes, modificadores), el envío desde la
 *    config de la tienda y el descuento desde el doc del cupón (activo, fecha,
 *    maxUses, monto mínimo).
 *  - loadPayableOrder() lo usan los endpoints que CREAN el cobro: exige un
 *    pedido existente, no pagado, del mismo método de pago, y rechaza si el
 *    total guardado difiere del recalculado (> 0.01).
 *  - stores/{storeId}/payment_checkouts/{orderId} (doc server-only: las reglas
 *    no tienen match para esa ruta, así que el cliente no lo puede leer ni
 *    escribir) guarda el monto que NOSOTROS mandamos a la pasarela, el id del
 *    objeto de la pasarela (PaymentIntent, orden PayPal, preferencia MP…), el
 *    cupón y contadores de intentos.
 *  - getExpectedPayment() lo usan las CONFIRMACIONES (endpoint inline +
 *    webhooks) para comparar monto/moneda de lo que la pasarela dice que se
 *    cobró.
 *  - markOrderPaid/Failed/Refunded aplican solo transiciones válidas:
 *    pending|failed → paid, pending → failed, paid → refunded. Un webhook
 *    viejo nunca pasa un pedido pagado a fallido.
 */

import type { Firestore, DocumentReference } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { decrementOrderStockAdmin, restoreOrderStockAdmin } from './order-stock.js'
import { resolveShippingCost } from '../../src/lib/shipping.js'
import { getDisplayPrice } from '../../src/lib/variants.js'
import { volumeUnitPrice } from '../../src/lib/volumePricing.js'

export type Gateway = 'mercadopago' | 'stripe' | 'paypal' | 'gocuotas'

// ============================================
// Montos
// ============================================

export const round2 = (n: number) => Math.round(n * 100) / 100

// Monedas sin decimales (Stripe/MP/PayPal cobran en unidades enteras)
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF', 'HUF', 'TWD',
])

export function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL.has((currency || '').toUpperCase())
}

/** true si dos montos son "el mismo" (tolerancia de 1 centavo, o 1 unidad en
 *  monedas sin decimales donde la pasarela redondea). */
export function amountsMatch(a: number, b: number, currency: string): boolean {
  if (typeof a !== 'number' || typeof b !== 'number' || !isFinite(a) || !isFinite(b)) return false
  const tolerance = isZeroDecimal(currency) ? 1 : 0.011
  return Math.abs(a - b) <= tolerance
}

export function storeCurrency(store: Record<string, unknown> | undefined | null): string {
  const c = (store as { currency?: string } | undefined)?.currency
  return (typeof c === 'string' && c.trim() ? c : 'USD').toUpperCase()
}

// ============================================
// Tipos (forma de los docs en Firestore)
// ============================================

interface OrderItemDoc {
  productId?: string
  productName?: string
  price?: number
  quantity?: number
  itemTotal?: number
  combinationId?: string
  selectedVariations?: { name: string; value: string }[]
  selectedModifiers?: { groupName: string; options: { name: string; price: number }[] }[]
}

export interface OrderDoc {
  storeId?: string
  orderNumber?: string
  items?: OrderItemDoc[]
  subtotal?: number
  shippingCost?: number
  discount?: { code?: string; type?: string; value?: number; amount?: number }
  total?: number
  status?: string
  paymentMethod?: string
  paymentStatus?: string
  paymentId?: string
  deliveryMethod?: string
  deliveryAddress?: { state?: string }
  customer?: { name?: string; email?: string; phone?: string }
  couponCounted?: boolean
  isTest?: boolean
}

interface ProductDoc {
  name?: string
  price?: number
  active?: boolean
  trackStock?: boolean
  stock?: number
  variations?: { name: string; options: { value: string; available?: boolean; stock?: number }[] }[]
  combinations?: { id: string; options: Record<string, string>; price?: number; stock?: number; available?: boolean }[]
  modifierGroups?: { name: string; options: { name: string; price: number; available?: boolean }[] }[]
  volumePricing?: { minQty: number; price?: number; percentOff?: number }[]
}

export interface PricedLine {
  productId: string
  name: string
  quantity: number
  unitPrice: number   // precio unitario (variante con precio por cantidad + modificadores), redondeado a 2 decimales
}

export interface OrderPricing {
  currency: string
  lines: PricedLine[]
  subtotal: number
  shipping: number
  discount: number
  total: number
  coupon?: { id: string; code: string }
}

export type Fail = { ok: false; status: number; error: string; code: string }
const fail = (status: number, code: string, error: string): Fail => ({ ok: false, status, code, error })

function toDateSafe(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  const maybe = v as { toDate?: () => Date }
  if (typeof maybe.toDate === 'function') return maybe.toDate()
  return null
}

// ============================================
// Recalcular el total del pedido
// ============================================

/**
 * Recalcula subtotal/envío/descuento/total desde Firestore. Nunca usa los
 * precios guardados en el pedido (los escribe el cliente).
 *  - checkCouponUsage: valida maxUses del cupón (al CREAR el cobro sí; al
 *    confirmar un pago ya hecho no, porque no se puede rechazar un pago).
 *  - checkStock: rechaza si no hay stock suficiente (al crear el cobro).
 */
export async function priceOrder(
  db: Firestore,
  storeId: string,
  store: Record<string, unknown>,
  order: OrderDoc,
  opts: { checkCouponUsage?: boolean; checkStock?: boolean } = {},
): Promise<{ ok: true; pricing: OrderPricing } | Fail> {
  const currency = storeCurrency(store)
  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) return fail(400, 'empty_order', 'El pedido no tiene productos')
  if (items.length > 200) return fail(400, 'too_many_items', 'Demasiados productos en el pedido')

  const productsCol = db.collection('stores').doc(storeId).collection('products')
  const productIds = [...new Set(items.map(it => it.productId).filter((id): id is string => typeof id === 'string' && !!id))]
  if (productIds.length !== new Set(items.map(it => it.productId)).size) {
    return fail(400, 'invalid_item', 'Producto inválido en el pedido')
  }
  const snaps = await db.getAll(...productIds.map(id => productsCol.doc(id)))
  const products = new Map<string, ProductDoc>()
  for (const s of snaps) if (s.exists) products.set(s.id, s.data() as ProductDoc)

  // Cantidad pedida por producto/variante, para validar stock sumando líneas
  const lines: PricedLine[] = []
  const stockNeed = new Map<string, { product: ProductDoc; item: OrderItemDoc; qty: number }>()

  // Precio por cantidad: cuenta las unidades del producto sumando sus variantes,
  // igual que el carrito (src/hooks/useCart.ts). Una cantidad inválida la
  // rechaza el loop de abajo.
  const qtyByProduct = new Map<string, number>()
  for (const item of items) {
    const q = Number(item.quantity)
    if (item.productId && Number.isInteger(q) && q > 0) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + q)
    }
  }

  for (const item of items) {
    const product = item.productId ? products.get(item.productId) : undefined
    if (!product) return fail(409, 'product_unavailable', `Producto no disponible: ${item.productName || item.productId}`)
    if (product.active === false) return fail(409, 'product_unavailable', `Producto no disponible: ${product.name || item.productName}`)

    const qty = Number(item.quantity)
    if (!Number.isInteger(qty) || qty <= 0 || qty > 10000) {
      return fail(400, 'invalid_quantity', 'Cantidad inválida en el pedido')
    }

    // Precio base: combinación elegida (si tiene precio) o precio del producto.
    // Misma lógica que el storefront (src/lib/variants.ts getDisplayPrice).
    const selected: Record<string, string> = {}
    for (const sv of item.selectedVariations || []) {
      if (sv && typeof sv.name === 'string') selected[sv.name] = String(sv.value)
    }

    // Validar la seleccion de variantes contra el producto. Antes una variante
    // mal escrita ('XL ', otra mayuscula) o incompleta hacia que
    // findCombination no encontrara nada y se cobrara el precio BASE, mientras
    // el pedido seguia mostrando la variante cara al comerciante.
    const variations = product.variations || []
    const combos = product.combinations || []
    const selectedNames = Object.keys(selected)
    for (const name of selectedNames) {
      const variation = variations.find(v => v.name === name)
      const option = variation?.options?.find(o => o.value === selected[name])
      if (!option) return fail(400, 'invalid_variant', 'Variante inválida en el pedido')
      if (option.available === false) {
        return fail(409, 'product_unavailable', `Producto no disponible: ${product.name || item.productName}`)
      }
    }
    // Con combinaciones, una seleccion (no vacia) tiene que ser completa y
    // corresponder a una combinacion existente y disponible. Sin seleccion se
    // cobra el precio base, como en temas que no muestran variantes.
    let resolvedCombo: NonNullable<ProductDoc['combinations']>[number] | undefined
    if (selectedNames.length > 0 && combos.length > 0 && variations.length > 0) {
      if (variations.some(v => !selected[v.name])) {
        return fail(400, 'invalid_variant', 'Variante inválida en el pedido')
      }
      resolvedCombo = combos.find(c => variations.every(v => (c.options || {})[v.name] === selected[v.name]))
      if (!resolvedCombo) return fail(400, 'invalid_variant', 'Variante inválida en el pedido')
      if (resolvedCombo.available === false) {
        return fail(409, 'product_unavailable', `Producto no disponible: ${product.name || item.productName}`)
      }
    }

    let base: number
    const comboById = item.combinationId
      ? combos.find(c => c.id === item.combinationId)
      : undefined
    if (comboById) {
      // El combinationId del pedido tiene que corresponder a las variantes elegidas
      const matches = Object.entries(comboById.options || {}).every(([k, v]) => selected[k] === v)
      if (!matches) return fail(400, 'invalid_variant', 'Variante inválida en el pedido')
      if (resolvedCombo && resolvedCombo.id !== comboById.id) return fail(400, 'invalid_variant', 'Variante inválida en el pedido')
      if (comboById.available === false) {
        return fail(409, 'product_unavailable', `Producto no disponible: ${product.name || item.productName}`)
      }
      resolvedCombo = comboById
    }
    if (resolvedCombo) {
      base = typeof resolvedCombo.price === 'number' ? resolvedCombo.price : Number(product.price)
    } else {
      base = getDisplayPrice(product as unknown as Parameters<typeof getDisplayPrice>[0], selectedNames.length ? selected : undefined)
    }
    if (typeof base !== 'number' || !isFinite(base) || base < 0) {
      return fail(409, 'invalid_price', `Precio inválido: ${product.name || item.productName}`)
    }

    // Modificadores: el precio sale del producto, buscando grupo y opción por nombre
    // (el pedido guarda solo nombres + precio, y el precio del cliente no vale).
    let extras = 0
    for (const mod of item.selectedModifiers || []) {
      const group = (product.modifierGroups || []).find(g => g.name === mod.groupName)
      if (!group) return fail(409, 'modifier_changed', `Opciones de "${product.name}" cambiaron, vuelve a agregar el producto`)
      for (const opt of mod.options || []) {
        const real = group.options.find(o => o.name === opt.name)
        if (!real || real.available === false) {
          return fail(409, 'modifier_changed', `Opciones de "${product.name}" cambiaron, vuelve a agregar el producto`)
        }
        extras += Number(real.price) || 0
      }
    }

    base = volumeUnitPrice(product, base, qtyByProduct.get(item.productId!) || qty)
    const unitPrice = round2(base + extras)
    lines.push({ productId: item.productId!, name: product.name || item.productName || 'Item', quantity: qty, unitPrice })

    if (product.trackStock) {
      const key = `${item.productId}|${resolvedCombo?.id || JSON.stringify(selected)}`
      const prev = stockNeed.get(key)
      // El stock se mira sobre la combinacion resuelta aunque el pedido no traiga combinationId
      const stockItem = resolvedCombo ? { ...item, combinationId: resolvedCombo.id } : item
      stockNeed.set(key, { product, item: stockItem, qty: (prev?.qty || 0) + qty })
    }
  }

  // Stock (solo lectura; el descuento real lo hace order-stock.ts al confirmar el pago)
  if (opts.checkStock) {
    for (const { product, item, qty } of stockNeed.values()) {
      const available = availableStock(product, item)
      if (available !== null && available < qty) {
        // Mismo formato de error que el checkout (CheckoutDrawer lo traduce)
        return fail(409, 'stock_insufficient', `stockInsufficient:${product.name || item.productName}:${Math.max(0, available)}`)
      }
    }
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))

  // Envío: misma función que usa el checkout (src/lib/shipping.ts)
  // deliveryMethod lo escribe el cliente: un valor desconocido ('Delivery',
  // 'x') con direccion cargada evitaba el envio. Solo pickup/delivery; sin
  // metodo pero con direccion, se cobra como delivery.
  if (order.deliveryMethod != null && order.deliveryMethod !== 'pickup' && order.deliveryMethod !== 'delivery') {
    return fail(400, 'invalid_delivery_method', 'Método de entrega inválido')
  }
  const isDelivery = order.deliveryMethod === 'delivery' || (!order.deliveryMethod && !!order.deliveryAddress)
  const shipping = isDelivery
    ? round2(resolveShippingCost(store as unknown as Parameters<typeof resolveShippingCost>[0], subtotal, order.deliveryAddress?.state) || 0)
    : 0

  // Descuento: solo desde el doc del cupón. Se ignora type/value/amount del cliente.
  let discount = 0
  let coupon: OrderPricing['coupon']
  const code = typeof order.discount?.code === 'string' ? order.discount.code.toUpperCase().trim() : ''
  if (code) {
    const q = await db.collection('stores').doc(storeId).collection('coupons')
      .where('code', '==', code).where('active', '==', true).limit(1).get()
    if (q.empty) return fail(409, 'coupon_invalid', 'El cupón no es válido')
    const cDoc = q.docs[0]
    const c = cDoc.data() as { discountType?: string; discountValue?: number; minOrderAmount?: number; maxUses?: number; currentUses?: number; expiresAt?: unknown }
    const expires = toDateSafe(c.expiresAt)
    if (expires && expires.getTime() < Date.now()) return fail(409, 'coupon_expired', 'El cupón expiró')
    if (opts.checkCouponUsage && c.maxUses && (c.currentUses || 0) >= c.maxUses) {
      return fail(409, 'coupon_max_uses', 'El cupón ya alcanzó su límite de usos')
    }
    if (c.minOrderAmount && subtotal < c.minOrderAmount) return fail(409, 'coupon_min_amount', 'El pedido no alcanza el monto mínimo del cupón')
    const value = Number(c.discountValue) || 0
    discount = c.discountType === 'percentage'
      ? Math.round(subtotal * value) / 100
      : Math.min(value, subtotal)
    discount = round2(Math.max(0, Math.min(discount, subtotal)))
    coupon = { id: cDoc.id, code }
  }

  const total = round2(subtotal - discount + shipping)
  if (!(total > 0)) return fail(400, 'invalid_total', 'El total del pedido no es válido')

  return { ok: true, pricing: { currency, lines, subtotal, shipping, discount, total, coupon } }
}

/** Stock disponible para una línea (null = no se controla). Misma prioridad
 *  que el storefront: combinations[] → stock por opción (legacy) → producto. */
function availableStock(product: ProductDoc, item: OrderItemDoc): number | null {
  if (!product.trackStock) return null
  const combos = product.combinations || []
  if (item.combinationId) {
    const c = combos.find(x => x.id === item.combinationId)
    if (c) return c.available === false ? 0 : (Number(c.stock) || 0)
  }
  if (item.selectedVariations?.length && product.variations?.length) {
    let min: number | null = null
    for (const sv of item.selectedVariations) {
      const opt = product.variations.find(v => v.name === sv.name)?.options.find(o => o.value === sv.value)
      if (opt && opt.available === false) return 0
      if (opt && typeof opt.stock === 'number') min = min === null ? opt.stock : Math.min(min, opt.stock)
    }
    if (min !== null) return min
  }
  return typeof product.stock === 'number' ? product.stock : null
}

// ============================================
// Doc server-only del cobro
// ============================================

export interface CheckoutDoc {
  orderId?: string
  gateway?: Gateway
  amount?: number             // total en moneda de la tienda (recalculado)
  currency?: string
  payAmount?: number          // lo que se mandó a la pasarela (PayPal convierte a USD)
  payCurrency?: string
  couponId?: string | null
  stripePaymentIntentId?: string
  paypalOrderId?: string
  mpPreferenceId?: string
  mpInitPoint?: string
  mpSandboxInitPoint?: string
  gocuotasToken?: string
  gocuotasUrlInit?: string
  gocuotasCheckoutId?: string | null
  attempts?: number
  paymentAttempts?: number
}

export function checkoutRef(db: Firestore, storeId: string, orderId: string): DocumentReference {
  return db.collection('stores').doc(storeId).collection('payment_checkouts').doc(orderId)
}

export async function getCheckout(db: Firestore, storeId: string, orderId: string): Promise<CheckoutDoc | null> {
  const snap = await checkoutRef(db, storeId, orderId).get()
  return snap.exists ? (snap.data() as CheckoutDoc) : null
}

export async function saveCheckout(db: Firestore, storeId: string, orderId: string, data: Partial<CheckoutDoc>): Promise<void> {
  await checkoutRef(db, storeId, orderId).set({ ...data, orderId, updatedAt: new Date() }, { merge: true })
}

// ============================================
// Validación al CREAR el cobro
// ============================================

export interface PayableOrder {
  ok: true
  order: OrderDoc
  orderRef: DocumentReference
  pricing: OrderPricing
  checkout: CheckoutDoc | null
}

/**
 * Carga el pedido y valida que se pueda cobrar con `gateway`:
 * existe, no está pagado/reembolsado/cancelado, es del mismo método de pago,
 * y su total guardado coincide con el recalculado en el servidor.
 */
export async function loadPayableOrder(
  db: Firestore,
  storeId: string,
  orderId: string,
  store: Record<string, unknown>,
  gateway: Gateway,
): Promise<PayableOrder | Fail> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const snap = await orderRef.get()
  if (!snap.exists) return fail(404, 'order_not_found', 'Pedido no encontrado')
  const order = snap.data() as OrderDoc

  if (order.paymentStatus === 'paid') return fail(409, 'already_paid', 'El pedido ya está pagado')
  if (order.paymentStatus === 'refunded') return fail(409, 'refunded', 'El pedido fue reembolsado')
  if (order.status === 'cancelled') return fail(409, 'cancelled', 'El pedido fue cancelado')
  if (order.paymentMethod && order.paymentMethod !== gateway) {
    return fail(409, 'method_mismatch', 'El pedido usa otro método de pago')
  }

  const priced = await priceOrder(db, storeId, store, order, { checkCouponUsage: true, checkStock: true })
  if (!priced.ok) return priced

  if (typeof order.total !== 'number' || !amountsMatch(order.total, priced.pricing.total, priced.pricing.currency)) {
    console.warn('[orderTotal] total mismatch', { storeId, orderId, stored: order.total, computed: priced.pricing.total })
    return fail(409, 'amount_mismatch', 'Los precios cambiaron. Actualiza la página y vuelve a intentar.')
  }

  const checkout = await getCheckout(db, storeId, orderId)
  return { ok: true, order, orderRef, pricing: priced.pricing, checkout }
}

// ============================================
// Validación al CONFIRMAR un pago
// ============================================

export interface ExpectedPayment {
  amount: number          // en moneda de la tienda
  currency: string
  payAmount: number       // lo que se esperaba cobrar en la pasarela
  payCurrency: string
  checkout: CheckoutDoc | null
}

/**
 * Monto esperado de un pedido para verificar lo que dice la pasarela.
 * Usa el doc server-only del cobro; si no existe (pedidos creados antes de
 * este cambio) recalcula desde los productos y exige que coincida con el
 * total guardado. Devuelve null si no se puede verificar.
 */
export async function getExpectedPayment(
  db: Firestore,
  storeId: string,
  orderId: string,
  store: Record<string, unknown>,
  order: OrderDoc,
): Promise<ExpectedPayment | null> {
  const checkout = await getCheckout(db, storeId, orderId)
  if (checkout && typeof checkout.amount === 'number') {
    const currency = checkout.currency || storeCurrency(store)
    return {
      amount: checkout.amount,
      currency,
      payAmount: typeof checkout.payAmount === 'number' ? checkout.payAmount : checkout.amount,
      payCurrency: checkout.payCurrency || currency,
      checkout,
    }
  }
  // Legacy: pedido sin doc de cobro → recalcular (sin exigir usos del cupón)
  const priced = await priceOrder(db, storeId, store, order, { checkCouponUsage: false, checkStock: false })
  if (!priced.ok) {
    console.warn('[orderTotal] no se pudo recalcular pedido legacy', { storeId, orderId, error: priced.error })
    return null
  }
  if (typeof order.total !== 'number' || !amountsMatch(order.total, priced.pricing.total, priced.pricing.currency)) {
    console.warn('[orderTotal] pedido legacy con total alterado', { storeId, orderId, stored: order.total, computed: priced.pricing.total })
    return null
  }
  return {
    amount: priced.pricing.total,
    currency: priced.pricing.currency,
    payAmount: priced.pricing.total,
    payCurrency: priced.pricing.currency,
    checkout,
  }
}

/**
 * Verifica un pago de MP contra el pedido: referencia, moneda y monto.
 * Devuelve null si coincide, o el motivo si no.
 */
export function mpPaymentMismatch(
  payment: { transaction_amount?: number; currency_id?: string; external_reference?: string },
  orderId: string,
  expected: { payAmount: number; payCurrency: string } | null,
  storeCurrencyExplicit: string | undefined,
): string | null {
  if (String(payment.external_reference || '') !== orderId) return 'external_reference'
  if (!expected) return 'unverifiable_order'
  if (storeCurrencyExplicit && payment.currency_id && payment.currency_id.toUpperCase() !== storeCurrencyExplicit.toUpperCase()) {
    return 'currency'
  }
  if (typeof payment.transaction_amount !== 'number' || !amountsMatch(payment.transaction_amount, expected.payAmount, expected.payCurrency)) {
    return 'amount'
  }
  return null
}

/**
 * Verifica una orden/captura de PayPal: custom_id === orderId y monto/moneda
 * iguales a lo que el servidor mandó a PayPal. null si coincide.
 */
export function paypalAmountMismatch(
  customId: string | undefined,
  amount: { value?: string; currency_code?: string } | undefined,
  orderId: string,
  expected: { payAmount: number; payCurrency: string } | null,
): string | null {
  if (customId !== orderId) return 'custom_id'
  if (!expected) return 'unverifiable_order'
  if (!amount?.currency_code || amount.currency_code.toUpperCase() !== expected.payCurrency.toUpperCase()) return 'currency'
  if (!amountsMatch(Number(amount.value), expected.payAmount, expected.payCurrency)) return 'amount'
  return null
}

// ============================================
// Transiciones de estado de pago
// ============================================

type PaidResult = 'paid' | 'already_paid' | 'not_found' | 'refunded'

/**
 * pending|failed → paid (idempotente). Incrementa el uso del cupón una sola
 * vez (flag couponCounted) en la misma transacción, marca faltantes de stock
 * y aplica el stock (idempotente vía stockDecremented).
 */
export async function markOrderPaid(
  db: Firestore,
  storeId: string,
  orderId: string,
  fields: { paymentId?: string; paymentMethod?: Gateway; paymentNote?: string },
): Promise<PaidResult> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const cRef = checkoutRef(db, storeId, orderId)

  const result = await db.runTransaction(async (tx): Promise<PaidResult> => {
    const [snap, cSnap] = await Promise.all([tx.get(orderRef), tx.get(cRef)])
    if (!snap.exists) return 'not_found'
    const order = snap.data() as OrderDoc
    if (order.paymentStatus === 'paid') return 'already_paid'
    if (order.paymentStatus === 'refunded') return 'refunded'

    // Cupón: resolver el doc (id guardado al crear el cobro, o por código)
    let couponRef: DocumentReference | null = null
    const code = typeof order.discount?.code === 'string' ? order.discount.code.toUpperCase().trim() : ''
    if (code && !order.couponCounted) {
      const couponId = cSnap.exists ? (cSnap.data() as CheckoutDoc).couponId : null
      if (couponId) {
        const ref = db.collection('stores').doc(storeId).collection('coupons').doc(couponId)
        if ((await tx.get(ref)).exists) couponRef = ref
      } else {
        const q = await tx.get(db.collection('stores').doc(storeId).collection('coupons').where('code', '==', code).limit(1))
        if (!q.empty) couponRef = q.docs[0].ref
      }
    }

    const update: Record<string, unknown> = {
      paymentStatus: 'paid',
      paidAt: new Date(),
      updatedAt: new Date(),
    }
    // Solo se confirma un pedido que seguía pendiente; no se pisa un estado
    // que el comerciante ya movió (preparing, cancelled, etc.)
    if (!order.status || order.status === 'pending') update.status = 'confirmed'
    if (fields.paymentId) update.paymentId = fields.paymentId
    if (fields.paymentMethod) update.paymentMethod = fields.paymentMethod
    if (fields.paymentNote) update.paymentNote = fields.paymentNote
    if (couponRef) update.couponCounted = true

    tx.update(orderRef, update)
    if (couponRef) tx.update(couponRef, { currentUses: FieldValue.increment(1) })
    return 'paid'
  })

  if (result === 'paid' || result === 'already_paid') {
    // Faltante de stock: el pago no se puede rechazar, así que se marca el
    // pedido para que el comerciante lo vea (el descuento clampa en 0).
    if (result === 'paid') {
      try {
        await flagStockShortage(db, storeId, orderId)
      } catch (err) {
        console.error('[orderTotal] stock shortage check failed:', err)
      }
    }
    // Aplicar stock (idempotente vía stockDecremented)
    try {
      await decrementOrderStockAdmin(db, storeId, orderId)
    } catch (err) {
      console.error('[orderTotal] stock decrement failed:', err)
    }
  }
  return result
}

/** Marca stockShortage en el pedido si algún producto no alcanza (antes de descontar). */
async function flagStockShortage(db: Firestore, storeId: string, orderId: string): Promise<void> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const snap = await orderRef.get()
  if (!snap.exists) return
  const order = snap.data() as OrderDoc & { stockDecremented?: boolean }
  if (order.stockDecremented || order.isTest) return
  const shortages: string[] = []
  for (const item of order.items || []) {
    if (!item.productId) continue
    const p = await db.collection('stores').doc(storeId).collection('products').doc(item.productId).get()
    if (!p.exists) continue
    const available = availableStock(p.data() as ProductDoc, item)
    if (available !== null && available < (item.quantity || 0)) {
      shortages.push(`${item.productName || item.productId} (${Math.max(0, available)}/${item.quantity})`)
    }
  }
  if (shortages.length) {
    await orderRef.update({ stockShortage: true, stockShortageItems: shortages, updatedAt: new Date() })
    console.warn('[orderTotal] pedido pagado con stock insuficiente', { storeId, orderId, shortages })
  }
}

/** pending → failed. Nunca toca un pedido pagado/reembolsado. */
export async function markOrderFailed(
  db: Firestore,
  storeId: string,
  orderId: string,
  fields: { paymentId?: string; paymentMethod?: Gateway } = {},
): Promise<boolean> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef)
    if (!snap.exists) return false
    const order = snap.data() as OrderDoc
    if (order.paymentStatus && order.paymentStatus !== 'pending') return false
    const update: Record<string, unknown> = { paymentStatus: 'failed', updatedAt: new Date() }
    if (fields.paymentId) update.paymentId = fields.paymentId
    if (fields.paymentMethod) update.paymentMethod = fields.paymentMethod
    tx.update(orderRef, update)
    return true
  })
}

/** paid → refunded (y devuelve el stock, idempotente). */
export async function markOrderRefunded(db: Firestore, storeId: string, orderId: string): Promise<boolean> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const changed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef)
    if (!snap.exists) return false
    const order = snap.data() as OrderDoc
    if (order.paymentStatus !== 'paid') return false
    tx.update(orderRef, { paymentStatus: 'refunded', updatedAt: new Date() })
    return true
  })
  if (changed) {
    try {
      await restoreOrderStockAdmin(db, storeId, orderId)
    } catch (err) {
      console.error('[orderTotal] stock restore failed:', err)
    }
  }
  return changed
}

// ============================================
// Rate limit simple (anti card-testing)
// ============================================

function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ''
  const xff = pick(headers['x-forwarded-for']).split(',')[0].trim()
  return pick(headers['x-real-ip']).trim() || xff || 'unknown'
}

// Fallback en memoria (por instancia) cuando Firestore falla: antes el limite
// se abria del todo ante cualquier error del contador.
const memoryBuckets = new Map<string, { window: number; count: number }>()

function checkMemoryRateLimit(id: string, window: number, limit: number): boolean {
  const cur = memoryBuckets.get(id)
  const count = cur && cur.window === window ? cur.count : 0
  if (count >= limit) return false
  memoryBuckets.set(id, { window, count: count + 1 })
  if (memoryBuckets.size > 5000) {
    for (const [k, v] of memoryBuckets) if (v.window !== window) memoryBuckets.delete(k)
  }
  return true
}

/**
 * Contador por ventana fija en Firestore (colección server-only rate_limits).
 * Devuelve false si se superó el límite. Si Firestore falla, usa un contador
 * en memoria de la instancia (no bloquea ventas, pero tampoco queda abierto).
 */
export async function checkRateLimit(
  db: Firestore,
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const window = Math.floor(Date.now() / (windowSeconds * 1000))
  const id = createHash('sha256').update(`${bucket}:${key}:${window}`).digest('hex').slice(0, 40)
  try {
    const ref = db.collection('rate_limits').doc(id)
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const count = snap.exists ? Number((snap.data() as { count?: number }).count) || 0 : 0
      if (count >= limit) return false
      tx.set(ref, {
        bucket,
        count: count + 1,
        expiresAt: new Date((window + 1) * windowSeconds * 1000 + 60_000),
      }, { merge: true })
      return true
    })
  } catch (err) {
    console.error('[orderTotal] rate limit error:', err)
    return checkMemoryRateLimit(id, window, limit)
  }
}

/**
 * Límite por TIENDA de intentos de cobro con tarjeta (por hora). El límite por
 * IP se esquiva rotando IPs y el de por pedido creando pedidos nuevos; este
 * corta el card-testing contra una misma tienda aunque cambie todo lo demás.
 */
export async function checkStoreRateLimit(
  db: Firestore,
  storeId: string,
  bucket: string,
  limit = 120,
): Promise<boolean> {
  return checkRateLimit(db, `store:${bucket}`, storeId, limit, 3600)
}

/** Límite por IP para los endpoints que crean cobros (30 cada 10 min). */
export async function checkIpRateLimit(
  db: Firestore,
  req: { headers: Record<string, string | string[] | undefined> },
  bucket: string,
  limit = 30,
): Promise<boolean> {
  return checkRateLimit(db, bucket, clientIp(req.headers), limit, 600)
}

/** Suma un intento en el doc del cobro; false si pasó `max`. */
export async function bumpCheckoutAttempts(
  db: Firestore,
  storeId: string,
  orderId: string,
  field: 'attempts' | 'paymentAttempts',
  max: number,
): Promise<boolean> {
  const ref = checkoutRef(db, storeId, orderId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const current = snap.exists ? Number((snap.data() as CheckoutDoc)[field]) || 0 : 0
    if (current >= max) return false
    tx.set(ref, { orderId, [field]: current + 1, updatedAt: new Date() }, { merge: true })
    return true
  })
}
