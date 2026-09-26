/**
 * Reservas de stock y de usos de cupón para los pedidos del storefront.
 *
 * Problema que resuelve: antes el stock se descontaba recién al CONFIRMAR el
 * pago (order-stock.ts) y el uso del cupón se sumaba en ese mismo momento
 * (markOrderPaid). Dos compradores podían pagar la última unidad (o el último
 * uso de un cupón con maxUses) y ambos pedidos quedaban confirmados; al segundo
 * solo se le marcaba stockShortage.
 *
 * Modelo (reserva → confirmación):
 *
 *  - Docs server-only stores/{storeId}/reservation_holds/{kind}_{id}
 *    (kind = 'product' | 'coupon'; las reglas los niegan al cliente):
 *
 *      { kind, refId, holds: { [orderId]: { lines?: { [bucket]: qty }, qty?: 1, until: ms } } }
 *
 *    Un "bucket" es la unidad de stock que descuenta order-stock.ts para esa
 *    línea, con la MISMA prioridad (combinations[] → stock por opción legacy →
 *    product.stock):
 *      c:{combinationId}      combinación
 *      o:{variante}={valor}   opción legacy con stock numérico (cada opción)
 *      p                      producto simple
 *    El stock físico del producto (product.stock, combinations[].stock,
 *    warehouseStock) NO se toca al reservar: el editor de productos del
 *    dashboard reescribe combinations[] entero y pisaría un contador guardado
 *    ahí. Por eso la reserva vive aparte y el disponible se calcula como
 *        disponible = stock físico del bucket − Σ reservas VIGENTES de otros pedidos
 *
 *  - reserveOrder() corre al CREAR el cobro (loadPayableOrder: preferencia MP,
 *    PaymentIntent, orden PayPal, checkout Go Cuotas, pago Brick). En UNA
 *    transacción lee productos + holds + cupón, rechaza con OUT_OF_STOCK (con
 *    el ítem) o coupon_max_uses si no alcanza, y escribe la reserva del pedido
 *    con vencimiento RESERVATION_TTL_MS (30 min). Guarda stockReservedUntil en
 *    el pedido (visible para el comerciante) y el detalle (productIds/couponId)
 *    en payment_checkouts/{orderId}.reservation. Llamarlo de nuevo para el mismo
 *    pedido reemplaza su reserva y renueva el vencimiento (idempotente).
 *
 *  - Vencimiento: una reserva con until <= ahora cuenta como LIBRE en todas las
 *    transacciones (no hace falta un cron para liberar). Las transacciones que
 *    tocan un hold además borran las entradas vencidas, y el cron diario
 *    (api/send-email.ts → sweepExpiredHolds) limpia los docs que nadie volvió a
 *    tocar. Un doc sin entradas se borra.
 *
 *  - Confirmación (markOrderPaid): el stock físico se descuenta con
 *    decrementOrderStockAdmin (idempotente vía el flag stockDecremented) y el
 *    cupón suma currentUses (idempotente vía couponCounted); DESPUÉS se libera
 *    la reserva (releaseOrderReservation). Entre ambos pasos el pedido cuenta
 *    doble (conservador: nunca sobrevende, a lo sumo rechaza un instante).
 *
 *  - Pago fallido (markOrderFailed), reembolso y cancelación por el comerciante
 *    (api/order-reservation.ts action=release) liberan la reserva en el acto.
 *
 *  - Pedidos WhatsApp/transferencia (sin pasarela): no reservan. El stock se
 *    sigue descontando cuando el comerciante confirma el pedido en el dashboard;
 *    al crearlo, checkManualOrder() (api/order-reservation.ts) cuenta el uso del
 *    cupón en una transacción (si ya no quedan usos cancela el pedido recién
 *    creado y el checkout muestra el error) y marca stockShortage si el
 *    disponible (descontando reservas vigentes) no alcanza — aviso NO bloqueante
 *    para el comerciante.
 *
 * Límite conocido: si el comprador paga DESPUÉS de que venció su reserva (p. ej.
 * deja la pestaña de Stripe abierta más de 30 min) y otro pedido tomó la unidad,
 * el pago no se puede rechazar: se descuenta clampado en 0 y se marca
 * stockShortage como antes.
 */

import type { Firestore, DocumentReference, DocumentSnapshot, Transaction } from 'firebase-admin/firestore'
import { FieldPath, FieldValue } from 'firebase-admin/firestore'

export const RESERVATION_TTL_MS = 30 * 60 * 1000

const HOLDS_COLLECTION = 'reservation_holds'

// ============================================
// Tipos
// ============================================

interface ItemLike {
  productId?: string
  productName?: string
  quantity?: number
  combinationId?: string
  selectedVariations?: { name: string; value: string }[]
}

interface OrderLike {
  items?: ItemLike[]
  status?: string
  paymentStatus?: string
  paymentMethod?: string
  stockDecremented?: boolean
  couponCounted?: boolean
  manual?: boolean
  createdAt?: unknown
  discount?: { code?: string }
}

interface ProductLike {
  name?: string
  trackStock?: boolean
  stock?: number
  variations?: { name: string; options: { value: string; available?: boolean; stock?: number }[] }[]
  combinations?: { id: string; options?: Record<string, string>; stock?: number; available?: boolean }[]
}

interface CouponLike {
  active?: boolean
  maxUses?: number
  currentUses?: number
  expiresAt?: unknown
}

interface HoldEntry {
  lines?: Record<string, number>
  qty?: number
  until?: number
}

interface HoldDoc {
  holds?: Record<string, HoldEntry>
}

/** Detalle guardado en payment_checkouts/{orderId}.reservation */
interface ReservationInfo {
  productIds?: string[]
  couponId?: string | null
  until?: number
}

export interface OutOfStockItem {
  productId: string
  productName: string
  available: number
  requested: number
}

export type ReserveFail = { ok: false; status: number; code: string; error: string; item?: OutOfStockItem }

// ============================================
// Helpers
// ============================================

const unique = <T>(arr: T[]): T[] => [...new Set(arr)]

function holdRef(db: Firestore, storeId: string, kind: 'product' | 'coupon', id: string): DocumentReference {
  return db.collection('stores').doc(storeId).collection(HOLDS_COLLECTION).doc(`${kind}_${id}`)
}

function checkoutDocRef(db: Firestore, storeId: string, orderId: string): DocumentReference {
  return db.collection('stores').doc(storeId).collection('payment_checkouts').doc(orderId)
}

function toMillis(v: unknown): number | null {
  if (!v) return null
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const t = new Date(v).getTime()
    return isNaN(t) ? null : t
  }
  const maybe = v as { toMillis?: () => number }
  return typeof maybe.toMillis === 'function' ? maybe.toMillis() : null
}

const isLive = (e: HoldEntry | undefined, now: number) => !!e && typeof e.until === 'number' && e.until > now

/** Unidades reservadas de `bucket` por pedidos distintos de `orderId` (solo vigentes). */
function heldUnits(hold: HoldDoc | undefined, bucket: string, now: number, orderId: string): number {
  let sum = 0
  for (const [oid, e] of Object.entries(hold?.holds || {})) {
    if (oid === orderId || !isLive(e, now)) continue
    sum += Number(e.lines?.[bucket]) || 0
  }
  return sum
}

/** Usos de cupón reservados por pedidos distintos de `orderId` (solo vigentes). */
function heldCouponUses(hold: HoldDoc | undefined, now: number, orderId: string): number {
  let sum = 0
  for (const [oid, e] of Object.entries(hold?.holds || {})) {
    if (oid === orderId || !isLive(e, now)) continue
    sum += Number(e.qty) || 1
  }
  return sum
}

interface Bucket {
  key: string
  label: string
  available: number
}

/**
 * Buckets de stock que consume una línea, con la misma prioridad que el
 * descuento real (order-stock.ts applyItemDelta). [] = la línea no controla
 * stock (producto sin trackStock o sin stock numérico).
 */
function stockBuckets(product: ProductLike, item: ItemLike): Bucket[] {
  if (!product.trackStock) return []
  const name = product.name || item.productName || 'Producto'

  const combos = Array.isArray(product.combinations) ? product.combinations : []
  if (item.combinationId) {
    const c = combos.find(x => x && x.id === item.combinationId)
    if (c) {
      const variant = Object.values(c.options || {}).join(' / ')
      return [{
        key: `c:${c.id}`,
        label: variant ? `${name} (${variant})` : name,
        available: c.available === false ? 0 : Math.max(0, Number(c.stock) || 0),
      }]
    }
  }

  if (Array.isArray(item.selectedVariations) && item.selectedVariations.length && Array.isArray(product.variations) && product.variations.length) {
    const out: Bucket[] = []
    for (const sv of item.selectedVariations) {
      if (!sv || typeof sv.name !== 'string') continue
      const variation = product.variations.find(v => v && v.name === sv.name)
      const opt = Array.isArray(variation?.options) ? variation.options.find(o => o && o.value === sv.value) : undefined
      if (opt && typeof opt.stock === 'number') {
        out.push({
          key: `o:${sv.name}=${sv.value}`,
          label: `${name} (${sv.value})`,
          available: opt.available === false ? 0 : Math.max(0, opt.stock),
        })
      }
    }
    if (out.length) return out
  }

  if (typeof product.stock === 'number') {
    return [{ key: 'p', label: name, available: Math.max(0, product.stock) }]
  }
  return []
}

interface BucketNeed extends Bucket {
  productId: string
  qty: number
}

/** Suma lo que pide el pedido por producto y bucket (varias líneas pueden compartir bucket). */
function orderNeeds(items: ItemLike[], products: Map<string, ProductLike>): Map<string, Map<string, BucketNeed>> {
  const needs = new Map<string, Map<string, BucketNeed>>()
  for (const item of items) {
    const qty = Number(item.quantity) || 0
    if (!item.productId || qty <= 0) continue
    const product = products.get(item.productId)
    if (!product) continue
    for (const b of stockBuckets(product, item)) {
      let byBucket = needs.get(item.productId)
      if (!byBucket) needs.set(item.productId, (byBucket = new Map()))
      const prev = byBucket.get(b.key)
      byBucket.set(b.key, { ...b, productId: item.productId, qty: (prev?.qty || 0) + qty })
    }
  }
  return needs
}

/**
 * Escribe (entry != null) o borra (entry == null) la reserva de `orderId` en un
 * hold ya leído en la transacción, borrando también las entradas vencidas. Si
 * el doc queda vacío se elimina.
 */
function writeHold(
  tx: Transaction,
  ref: DocumentReference,
  snap: DocumentSnapshot,
  kind: 'product' | 'coupon',
  refId: string,
  orderId: string,
  entry: HoldEntry | null,
  now: number,
): void {
  const holds = (snap.exists ? (snap.data() as HoldDoc).holds : undefined) || {}
  const remove = Object.entries(holds)
    .filter(([oid, e]) => oid === orderId ? !entry : !isLive(e, now))
    .map(([oid]) => oid)
  const remaining = Object.keys(holds).filter(oid => oid !== orderId && !remove.includes(oid)).length + (entry ? 1 : 0)

  if (remaining === 0) {
    if (snap.exists) tx.delete(ref)
    return
  }
  if (!snap.exists) {
    tx.set(ref, { kind, refId, holds: { [orderId]: entry }, updatedAt: new Date() })
    return
  }
  const pairs: unknown[] = []
  for (const oid of remove) pairs.push(new FieldPath('holds', oid), FieldValue.delete())
  if (entry) pairs.push(new FieldPath('holds', orderId), entry)
  tx.update(ref, 'updatedAt', new Date(), ...pairs)
}

async function getAllSafe(tx: Transaction, refs: DocumentReference[]): Promise<DocumentSnapshot[]> {
  return refs.length ? tx.getAll(...refs) : []
}

// ============================================
// Reservar (al crear el cobro)
// ============================================

/**
 * Reserva atómicamente el stock y el uso del cupón de un pedido de pago online.
 * Idempotente: repetirlo reemplaza la reserva del pedido y renueva el
 * vencimiento. Devuelve OUT_OF_STOCK (con el ítem) o coupon_max_uses si no hay
 * disponible descontando las reservas vigentes de otros pedidos.
 */
export async function reserveOrder(
  db: Firestore,
  storeId: string,
  orderId: string,
  couponId: string | null,
): Promise<{ ok: true; until: Date | null } | ReserveFail> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const cRef = checkoutDocRef(db, storeId, orderId)
  const productsCol = db.collection('stores').doc(storeId).collection('products')

  return db.runTransaction(async (tx) => {
    const now = Date.now()
    const until = now + RESERVATION_TTL_MS

    // ---- Lecturas (todas antes de escribir) ----
    const [orderSnap, cSnap] = await Promise.all([tx.get(orderRef), tx.get(cRef)])
    if (!orderSnap.exists) return { ok: false, status: 404, code: 'order_not_found', error: 'Pedido no encontrado' } as ReserveFail
    const order = orderSnap.data() as OrderLike
    // Carrera con el webhook / el comerciante: loadPayableOrder ya lo validó
    // fuera de la transacción, pero acá se re-verifica para no dejar una
    // reserva colgada 30 min sobre un pedido ya pagado o cancelado.
    if (order.paymentStatus === 'paid') return { ok: false, status: 409, code: 'already_paid', error: 'El pedido ya está pagado' } as ReserveFail
    if (order.paymentStatus === 'refunded') return { ok: false, status: 409, code: 'refunded', error: 'El pedido fue reembolsado' } as ReserveFail
    if (order.status === 'cancelled') return { ok: false, status: 409, code: 'cancelled', error: 'El pedido fue cancelado' } as ReserveFail
    const prev = (cSnap.exists ? (cSnap.data() as { reservation?: ReservationInfo }).reservation : undefined) || {}
    const items = Array.isArray(order.items) ? order.items : []

    // Stock ya aplicado (p. ej. un pedido que el comerciante descontó a mano): no se reserva
    const stockApplied = order.stockDecremented === true
    const productIds = stockApplied ? [] : unique(items.map(i => i.productId).filter((id): id is string => typeof id === 'string' && !!id))
    const holdProductIds = unique([...productIds, ...(prev.productIds || [])])
    const wantCoupon = couponId && !order.couponCounted ? couponId : null
    const holdCouponIds = unique([wantCoupon, prev.couponId].filter((id): id is string => !!id))

    const productSnaps = await getAllSafe(tx, productIds.map(id => productsCol.doc(id)))
    const productHoldSnaps = await getAllSafe(tx, holdProductIds.map(id => holdRef(db, storeId, 'product', id)))
    const couponSnap = wantCoupon ? await tx.get(db.collection('stores').doc(storeId).collection('coupons').doc(wantCoupon)) : null
    const couponHoldSnaps = await getAllSafe(tx, holdCouponIds.map(id => holdRef(db, storeId, 'coupon', id)))

    const products = new Map<string, ProductLike>()
    for (const s of productSnaps) if (s.exists) products.set(s.id, s.data() as ProductLike)
    const productHolds = new Map<string, DocumentSnapshot>()
    holdProductIds.forEach((id, i) => productHolds.set(id, productHoldSnaps[i]))
    const couponHolds = new Map<string, DocumentSnapshot>()
    holdCouponIds.forEach((id, i) => couponHolds.set(id, couponHoldSnaps[i]))

    // ---- Validar stock disponible ----
    const needs = orderNeeds(items, products)
    for (const [productId, byBucket] of needs) {
      const hold = productHolds.get(productId)?.data() as HoldDoc | undefined
      for (const need of byBucket.values()) {
        const free = need.available - heldUnits(hold, need.key, now, orderId)
        if (free < need.qty) {
          const available = Math.max(0, free)
          return {
            ok: false,
            status: 409,
            code: 'OUT_OF_STOCK',
            // Mismo formato que el checkout (CheckoutDrawer getStockErrorMessage)
            error: `stockInsufficient:${need.label}:${available}`,
            item: { productId, productName: need.label, available, requested: need.qty },
          } as ReserveFail
        }
      }
    }

    // ---- Validar usos del cupón ----
    if (wantCoupon && couponSnap?.exists) {
      const c = couponSnap.data() as CouponLike
      if (c.maxUses) {
        const used = (Number(c.currentUses) || 0) + heldCouponUses(couponHolds.get(wantCoupon)?.data() as HoldDoc | undefined, now, orderId)
        if (used >= c.maxUses) {
          return { ok: false, status: 409, code: 'coupon_max_uses', error: 'El cupón ya alcanzó su límite de usos' } as ReserveFail
        }
      }
    }

    // ---- Escrituras ----
    const heldProducts: string[] = []
    for (const id of holdProductIds) {
      const byBucket = needs.get(id)
      let entry: HoldEntry | null = null
      if (byBucket && byBucket.size > 0) {
        const lines: Record<string, number> = {}
        for (const n of byBucket.values()) lines[n.key] = n.qty
        entry = { lines, until }
        heldProducts.push(id)
      }
      writeHold(tx, holdRef(db, storeId, 'product', id), productHolds.get(id)!, 'product', id, orderId, entry, now)
    }

    // El cupón solo se reserva si limita usos (sin maxUses no hay carrera)
    const couponLimited = !!(wantCoupon && couponSnap?.exists && (couponSnap.data() as CouponLike).maxUses)
    let heldCoupon: string | null = null
    for (const id of holdCouponIds) {
      const entry: HoldEntry | null = id === wantCoupon && couponLimited ? { qty: 1, until } : null
      if (entry) heldCoupon = id
      writeHold(tx, holdRef(db, storeId, 'coupon', id), couponHolds.get(id)!, 'coupon', id, orderId, entry, now)
    }

    const reserved = heldProducts.length > 0 || !!heldCoupon
    // Sin nada que reservar ni limpiar (productos sin control de stock y sin
    // cupón limitado, el caso más común) no se escribe el pedido: evita
    // disparar triggers y contención con markOrderPaid.
    const hadReservedUntil = (order as { stockReservedUntil?: unknown }).stockReservedUntil !== undefined
    if (reserved || hadReservedUntil) {
      tx.update(orderRef, {
        stockReservedUntil: reserved ? new Date(until) : FieldValue.delete(),
        updatedAt: new Date(),
      })
    }
    if (reserved || (cSnap.exists && (cSnap.data() as { reservation?: unknown }).reservation !== undefined)) {
      tx.set(cRef, {
        orderId,
        reservation: reserved
          ? { productIds: heldProducts, couponId: heldCoupon, until }
          : FieldValue.delete(),
        updatedAt: new Date(),
      }, { merge: true })
    }

    return { ok: true, until: reserved ? new Date(until) : null } as const
  })
}

// ============================================
// Liberar (confirmado, fallido, cancelado, reembolsado)
// ============================================

/**
 * Borra la reserva del pedido (holds de productos y cupón). Idempotente: sin
 * reserva es un no-op. No toca el stock físico ni currentUses.
 */
export async function releaseOrderReservation(db: Firestore, storeId: string, orderId: string): Promise<boolean> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const cRef = checkoutDocRef(db, storeId, orderId)

  return db.runTransaction(async (tx) => {
    const now = Date.now()
    const [orderSnap, cSnap] = await Promise.all([tx.get(orderRef), tx.get(cRef)])
    const info = cSnap.exists ? (cSnap.data() as { reservation?: ReservationInfo }).reservation : undefined
    if (!info) return false
    const productIds = unique(info.productIds || [])
    const couponIds = info.couponId ? [info.couponId] : []
    const pSnaps = await getAllSafe(tx, productIds.map(id => holdRef(db, storeId, 'product', id)))
    const cpSnaps = await getAllSafe(tx, couponIds.map(id => holdRef(db, storeId, 'coupon', id)))

    productIds.forEach((id, i) => writeHold(tx, holdRef(db, storeId, 'product', id), pSnaps[i], 'product', id, orderId, null, now))
    couponIds.forEach((id, i) => writeHold(tx, holdRef(db, storeId, 'coupon', id), cpSnaps[i], 'coupon', id, orderId, null, now))

    tx.set(cRef, { reservation: FieldValue.delete(), updatedAt: new Date() }, { merge: true })
    if (orderSnap.exists && (orderSnap.data() as { stockReservedUntil?: unknown }).stockReservedUntil !== undefined) {
      tx.update(orderRef, { stockReservedUntil: FieldValue.delete() })
    }
    return true
  })
}

// ============================================
// Limpieza (cron diario)
// ============================================

/** Borra entradas vencidas de los holds (y los docs vacíos). Devuelve cuántos docs tocó. */
export async function sweepExpiredHolds(db: Firestore, max = 1000): Promise<number> {
  const snap = await db.collectionGroup(HOLDS_COLLECTION).limit(max).get()
  let touched = 0
  const now = Date.now()
  for (const doc of snap.docs) {
    const holds = (doc.data() as HoldDoc).holds || {}
    if (Object.values(holds).every(e => isLive(e, now))) continue
    try {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref)
        if (!fresh.exists) return
        const h = (fresh.data() as HoldDoc).holds || {}
        const expired = Object.entries(h).filter(([, e]) => !isLive(e, Date.now())).map(([oid]) => oid)
        if (!expired.length) return
        if (expired.length === Object.keys(h).length) {
          tx.delete(doc.ref)
        } else {
          const pairs: unknown[] = []
          for (const oid of expired) pairs.push(new FieldPath('holds', oid), FieldValue.delete())
          tx.update(doc.ref, 'updatedAt', new Date(), ...pairs)
        }
      })
      touched++
    } catch (err) {
      console.error('[reservations] sweep failed', doc.ref.path, err)
    }
  }
  return touched
}

// ============================================
// Pedidos WhatsApp / transferencia (sin pasarela)
// ============================================

const MANUAL_METHODS = new Set(['whatsapp', 'transfer'])
const MANUAL_MAX_AGE_MS = 30 * 60 * 1000

export type ManualOrderResult =
  | { ok: true; couponCounted: boolean; stockShortage: string[] }
  | { ok: false; status: number; code: string; error: string }

/**
 * Al crear un pedido WhatsApp/transferencia desde el storefront:
 *  - Cuenta el uso del cupón en una transacción (flag couponCounted, una sola
 *    vez) respetando maxUses con las reservas vigentes de pagos online. Si ya no
 *    quedan usos (o el cupón ya no es válido) cancela el pedido recién creado
 *    (cancelReason = el código) y devuelve coupon_max_uses/coupon_invalid para
 *    que el checkout avise.
 *  - Marca stockShortage/stockShortageItems si el disponible (stock físico −
 *    reservas vigentes) no alcanza: aviso no bloqueante para el comerciante,
 *    que es quien descuenta el stock al confirmar.
 * Solo acepta pedidos del storefront (no manual), pendientes y recientes.
 */
export async function checkManualOrder(db: Firestore, storeId: string, orderId: string): Promise<ManualOrderResult> {
  const storeRef = db.collection('stores').doc(storeId)
  const orderRef = storeRef.collection('orders').doc(orderId)

  // ---- 1) Cupón: transacción mínima (pedido + cupón + su hold) ----
  const couponResult = await db.runTransaction(async (tx): Promise<
    { ok: true; couponCounted: boolean; items: ItemLike[]; stockDecremented: boolean } | { ok: false; status: number; code: string; error: string }
  > => {
    const now = Date.now()
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists) return { ok: false, status: 404, code: 'order_not_found', error: 'Pedido no encontrado' }
    const order = orderSnap.data() as OrderLike
    if (!MANUAL_METHODS.has(String(order.paymentMethod)) || order.manual) {
      return { ok: false, status: 400, code: 'not_manual', error: 'El pedido no es de WhatsApp/transferencia' }
    }
    // Antigüedad según la hora del SERVIDOR (createTime): createdAt lo escribe
    // el navegador del comprador y puede venir con el reloj corrido.
    const created = orderSnap.createTime?.toMillis() ?? toMillis(order.createdAt)
    if (order.status !== 'pending' || order.paymentStatus !== 'pending' || !created || now - created > MANUAL_MAX_AGE_MS) {
      return { ok: false, status: 409, code: 'not_pending', error: 'El pedido ya no se puede procesar' }
    }
    const items = Array.isArray(order.items) ? order.items : []
    const code = typeof order.discount?.code === 'string' ? order.discount.code.toUpperCase().trim() : ''
    if (!code || order.couponCounted) {
      return { ok: true, couponCounted: false, items, stockDecremented: order.stockDecremented === true }
    }

    const q = await tx.get(storeRef.collection('coupons').where('code', '==', code).where('active', '==', true).limit(1))
    const couponSnap = q.empty ? null : q.docs[0]
    const couponHoldSnap = couponSnap ? await tx.get(holdRef(db, storeId, 'coupon', couponSnap.id)) : null

    const c = couponSnap?.data() as CouponLike | undefined
    const expires = toMillis(c?.expiresAt)
    const held = heldCouponUses(couponHoldSnap?.data() as HoldDoc | undefined, now, orderId)
    const reject = !c || (expires !== null && expires < now)
      ? { code: 'coupon_invalid', error: 'El cupón no es válido' }
      : c.maxUses && (Number(c.currentUses) || 0) + held >= c.maxUses
        ? { code: 'coupon_max_uses', error: 'El cupón ya alcanzó su límite de usos' }
        : null
    if (reject) {
      // Solo este pedido: storefront, pendiente sin pagar, < 30 min, sin cupón contado.
      tx.update(orderRef, { status: 'cancelled', cancelReason: reject.code, updatedAt: new Date() })
      return { ok: false, status: 409, ...reject }
    }
    tx.update(couponSnap!.ref, { currentUses: FieldValue.increment(1) })
    tx.update(orderRef, { couponCounted: true, updatedAt: new Date() })
    return { ok: true, couponCounted: true, items, stockDecremented: order.stockDecremented === true }
  })
  if (!couponResult.ok) return couponResult

  // ---- 2) Stock: aviso NO bloqueante, fuera de la transacción ----
  // Solo lectura de productos/holds (sin bloquear los holds que usan los pagos
  // online); si algo falla no afecta al pedido ni al cupón ya contado.
  let shortages: string[] = []
  try {
    const items = couponResult.items
    const productIds = couponResult.stockDecremented
      ? []
      : unique(items.map(i => i.productId).filter((id): id is string => typeof id === 'string' && !!id)).slice(0, 200)
    if (productIds.length) {
      const now = Date.now()
      const pSnaps = await db.getAll(...productIds.map(id => storeRef.collection('products').doc(id)))
      const hSnaps = await db.getAll(...productIds.map(id => holdRef(db, storeId, 'product', id)))
      const products = new Map<string, ProductLike>()
      for (const s of pSnaps) if (s.exists) products.set(s.id, s.data() as ProductLike)
      const holds = new Map<string, HoldDoc | undefined>()
      productIds.forEach((id, i) => holds.set(id, hSnaps[i].data() as HoldDoc | undefined))
      for (const [productId, byBucket] of orderNeeds(items, products)) {
        for (const need of byBucket.values()) {
          const free = Math.max(0, need.available - heldUnits(holds.get(productId), need.key, now, orderId))
          if (free < need.qty) shortages.push(`${need.label} (${free}/${need.qty})`)
        }
      }
      if (shortages.length) {
        await orderRef.update({ stockShortage: true, stockShortageItems: shortages, updatedAt: new Date() })
      }
    }
  } catch (err) {
    console.error('[reservations] manual order stock check failed', storeId, orderId, err)
    shortages = []
  }
  return { ok: true, couponCounted: couponResult.couponCounted, stockShortage: shortages }
}

/**
 * Devuelve el uso del cupón de un pedido cancelado que ya lo había contado y
 * que no se cobró (WhatsApp/transferencia cancelados por el comerciante).
 * Idempotente vía couponCounted.
 */
export async function refundCouponUseIfCancelled(db: Firestore, storeId: string, orderId: string): Promise<boolean> {
  const storeRef = db.collection('stores').doc(storeId)
  const orderRef = storeRef.collection('orders').doc(orderId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef)
    if (!snap.exists) return false
    const order = snap.data() as OrderLike
    if (order.status !== 'cancelled' || !order.couponCounted || order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') return false
    const code = typeof order.discount?.code === 'string' ? order.discount.code.toUpperCase().trim() : ''
    let couponSnap: DocumentSnapshot | null = null
    if (code) {
      const q = await tx.get(storeRef.collection('coupons').where('code', '==', code).limit(1))
      if (!q.empty) couponSnap = q.docs[0]
    }
    if (couponSnap) {
      const current = Number((couponSnap.data() as CouponLike).currentUses) || 0
      tx.update(couponSnap.ref, { currentUses: Math.max(0, current - 1) })
    }
    tx.update(orderRef, { couponCounted: false, updatedAt: new Date() })
    return true
  })
}
