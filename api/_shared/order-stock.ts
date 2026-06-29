import type { Firestore } from 'firebase-admin/firestore'

/**
 * Server-side (firebase-admin) stock application for orders. The storefront
 * customer is unauthenticated and cannot write products under firestore.rules,
 * so online stock is applied here — when payment is confirmed (decrement) or
 * refunded/reversed (restore).
 *
 * The single source of truth for "has this order's stock been applied?" is the
 * order's `stockDecremented` flag. Both functions CLAIM the flag atomically in
 * a transaction before touching products, so concurrent confirmations (an
 * inline payment endpoint + its webhook + webhook retries) apply stock exactly
 * once. Per-product writes are clamped at 0 and warehouse-aware, mirroring
 * src/lib/firebase.ts, and each line appends a stock_movements audit row. A
 * confirmation can't be rejected (the buyer already paid), so decrement clamps
 * instead of throwing — the rare oversell from two orders confirming the last
 * unit shows as stock 0 for the merchant to handle.
 */

interface OrderItemLike {
  productId?: string
  productName?: string
  quantity?: number
  combinationId?: string
  selectedVariations?: { name: string; value: string }[]
}

interface OrderLike {
  stockDecremented?: boolean
  items?: OrderItemLike[]
}

const sumValues = (m: Record<string, number>): number =>
  Object.values(m).reduce((s, n) => s + (n || 0), 0)

/** Apply `sign * quantity` to one order line's product (sign -1 decrement, +1
 *  restore), clamped at 0, keeping product.stock and warehouseStock in sync.
 *  Returns the product-level stock before/after, or null if nothing changed. */
async function applyItemDelta(
  db: Firestore,
  storeId: string,
  item: OrderItemLike,
  sign: number,
): Promise<{ before: number; after: number } | null> {
  const qty = item.quantity || 0
  if (!item.productId || qty <= 0) return null
  const delta = sign * qty
  const ref = db.collection('stores').doc(storeId).collection('products').doc(item.productId)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const data = snap.data() as Record<string, unknown>
    if (!data.trackStock) return null
    const before = typeof data.stock === 'number' ? data.stock : 0

    // (a) Modern combinations[] — the line maps to a known combination.
    const combos = (data.combinations || []) as Array<{ id: string; stock: number; warehouseStock?: Record<string, number> }>
    if (item.combinationId && combos.some(c => c.id === item.combinationId)) {
      for (const c of combos) {
        if (c.id !== item.combinationId) continue
        c.stock = Math.max(0, (c.stock || 0) + delta)
        if (c.warehouseStock && Object.keys(c.warehouseStock).length > 0) {
          const wid = Object.keys(c.warehouseStock)[0]
          c.warehouseStock[wid] = Math.max(0, (c.warehouseStock[wid] || 0) + delta)
        }
      }
      const after = combos.reduce((s, c) => s + (c.stock || 0), 0)
      const patch: Record<string, unknown> = { combinations: combos, stock: after, updatedAt: new Date() }
      const ws: Record<string, number> = {}
      let hasWs = false
      for (const c of combos) {
        if (c.warehouseStock) {
          hasWs = true
          for (const [k, v] of Object.entries(c.warehouseStock)) ws[k] = (ws[k] || 0) + (v || 0)
        }
      }
      if (hasWs) patch.warehouseStock = ws
      tx.update(ref, patch)
      return { before, after }
    }

    // (b) Legacy variant option-level stock.
    const variations = data.variations as Array<{ name: string; options: Array<{ value: string; stock?: number }> }> | undefined
    if (item.selectedVariations?.length && variations?.length) {
      let total = 0
      let matched = false
      for (const sv of item.selectedVariations) {
        const option = variations.find(v => v.name === sv.name)?.options.find(o => o.value === sv.value)
        if (option && typeof option.stock === 'number') {
          option.stock = Math.max(0, option.stock + delta)
          total += delta
          matched = true
        }
      }
      if (matched) {
        const patch: Record<string, unknown> = { variations, updatedAt: new Date() }
        let after = Math.max(0, before + total)
        const ws = data.warehouseStock as Record<string, number> | undefined
        if (ws && Object.keys(ws).length > 0) {
          const k = Object.keys(ws)[0]
          ws[k] = Math.max(0, (ws[k] || 0) + total)
          after = sumValues(ws)
          patch.warehouseStock = ws
          patch.stock = after
        } else if (typeof data.stock === 'number') {
          patch.stock = after
        }
        tx.update(ref, patch)
        return { before, after }
      }
    }

    // (c) Simple product.
    if (typeof data.stock === 'number') {
      const ws = data.warehouseStock as Record<string, number> | undefined
      if (ws && Object.keys(ws).length > 0) {
        const k = Object.keys(ws)[0]
        ws[k] = Math.max(0, (ws[k] || 0) + delta)
        const after = sumValues(ws)
        tx.update(ref, { warehouseStock: ws, stock: after, updatedAt: new Date() })
        return { before, after }
      }
      const after = Math.max(0, data.stock + delta)
      tx.update(ref, { stock: after, updatedAt: new Date() })
      return { before, after }
    }

    return null
  })
}

/** Append a stock_movements audit row for one applied line (best-effort). */
async function writeMovement(
  db: Firestore,
  storeId: string,
  orderId: string,
  item: OrderItemLike,
  type: 'sale' | 'adjustment',
  signedQty: number,
  totals: { before: number; after: number },
  reason?: string,
): Promise<void> {
  const mv: Record<string, unknown> = {
    productId: item.productId,
    productName: item.productName || '',
    type,
    quantity: signedQty,
    previousStock: totals.before,
    newStock: totals.after,
    referenceType: 'order',
    referenceId: orderId,
    createdBy: 'system',
    createdAt: new Date(),
  }
  if (reason) mv.reason = reason
  if (item.selectedVariations?.length) {
    mv.variationName = item.selectedVariations.map(s => s.name).join(' / ')
    mv.optionValue = item.selectedVariations.map(s => s.value).join(' / ')
  }
  await db.collection('stores').doc(storeId).collection('stock_movements').add(mv)
}

/** Atomically claim the order's stock flag, returning its items if WE won the
 *  claim (so the caller should apply stock), or null if it was already in the
 *  target state (idempotent no-op). */
async function claimOrderStock(db: Firestore, storeId: string, orderId: string, want: boolean): Promise<OrderItemLike[] | null> {
  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef)
    if (!snap.exists) return null
    const data = snap.data() as OrderLike
    if (Boolean(data.stockDecremented) === want) return null // already in target state
    tx.update(orderRef, { stockDecremented: want, updatedAt: new Date() })
    return (data.items || []) as OrderItemLike[]
  })
}

/** Decrement an order's stock once, when payment is confirmed. Idempotent:
 *  repeat calls (inline endpoint + webhook + retries) are no-ops. */
export async function decrementOrderStockAdmin(db: Firestore, storeId: string, orderId: string): Promise<boolean> {
  const items = await claimOrderStock(db, storeId, orderId, true)
  if (!items) return false
  for (const item of items) {
    try {
      const totals = await applyItemDelta(db, storeId, item, -1)
      if (totals) await writeMovement(db, storeId, orderId, item, 'sale', -(item.quantity || 0), totals)
    } catch (err) {
      console.error('[order-stock] decrement item failed', item.productId, err)
    }
  }
  return true
}

/** Restore an order's stock once, on refund/reversal. Idempotent. */
export async function restoreOrderStockAdmin(db: Firestore, storeId: string, orderId: string): Promise<boolean> {
  const items = await claimOrderStock(db, storeId, orderId, false)
  if (!items) return false
  for (const item of items) {
    try {
      const totals = await applyItemDelta(db, storeId, item, +1)
      if (totals) await writeMovement(db, storeId, orderId, item, 'adjustment', (item.quantity || 0), totals, 'Reembolso')
    } catch (err) {
      console.error('[order-stock] restore item failed', item.productId, err)
    }
  }
  return true
}
