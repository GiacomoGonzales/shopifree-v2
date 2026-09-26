import { collection, addDoc } from 'firebase/firestore'
import { db, auth, productService } from './firebase'
import type { Order } from '../types'
import { apiUrl } from '../utils/apiBase'

/** The subset of an order the stock helpers need — a full Order satisfies it,
 *  and callers that only just created an order can pass `{ id, items }`. */
type OrderStockSource = Pick<Order, 'id' | 'items'>

export interface StockMovementMeta {
  /** uid that triggered it (owner from the dashboard); defaults to 'system'. */
  createdBy?: string
  /** Optional human reason, e.g. "Pedido cancelado". */
  reason?: string
}

interface MovementLine {
  productId: string
  productName: string
  variationName?: string
  optionValue?: string
  quantity: number // signed: negative = sale/out, positive = return/in
  previousStock: number
  newStock: number
}

/** Append one stock_movements doc per affected line. Built dynamically to avoid
 *  undefined (Firestore rejects it). Best-effort — never throws to the caller. */
async function writeStockMovements(
  storeId: string,
  orderId: string | undefined,
  type: 'sale' | 'adjustment',
  lines: MovementLine[],
  meta: StockMovementMeta,
): Promise<void> {
  const col = collection(db, `stores/${storeId}/stock_movements`)
  for (const line of lines) {
    const mv: Record<string, unknown> = {
      productId: line.productId,
      productName: line.productName || '',
      type,
      quantity: line.quantity,
      previousStock: line.previousStock,
      newStock: line.newStock,
      referenceType: 'order',
      createdBy: meta.createdBy || 'system',
      createdAt: new Date(),
    }
    if (orderId) mv.referenceId = orderId
    if (meta.reason) mv.reason = meta.reason
    if (line.variationName) mv.variationName = line.variationName
    if (line.optionValue) mv.optionValue = line.optionValue
    await addDoc(col, mv)
  }
}

interface OrderStockOps {
  simple: { productId: string; quantity: number }[]
  variant: { productId: string; variationName: string; optionValue: string; quantity: number }[]
  combo: { productId: string; combinationId: string; quantity: number }[]
  movements: MovementLine[]
}

/**
 * Map an order's lines to per-model stock ops + audit movement lines, applying
 * the SAME model each product currently uses (combinations[] > legacy
 * option-level stock > simple product.stock); this also handles a product
 * migrated between models after the order was placed. `sign` is -1 (decrement)
 * or +1 (restore) so the movement before/after totals come out right; a running
 * per-product tally keeps them correct when one product spans several lines.
 * Deleted or non-tracked products are skipped.
 */
async function buildOrderStockOps(storeId: string, order: OrderStockSource, sign: number): Promise<OrderStockOps> {
  const ops: OrderStockOps = { simple: [], variant: [], combo: [], movements: [] }
  const running = new Map<string, number>() // productId -> current product.stock total

  for (const item of order.items || []) {
    if (!item.productId || !item.quantity) continue
    const product = await productService.get(storeId, item.productId)
    if (!product || !product.trackStock) continue

    let matched = false

    // (a) Modern: the line maps to a known combination.
    if (item.combinationId && product.combinations?.some(c => c.id === item.combinationId)) {
      ops.combo.push({ productId: item.productId, combinationId: item.combinationId, quantity: item.quantity })
      matched = true
    } else if (item.selectedVariations?.length && product.variations?.length) {
      // (b) Legacy: option-level stock on the selected variations.
      for (const sv of item.selectedVariations) {
        const variation = product.variations.find(v => v.name === sv.name)
        const option = variation?.options.find(o => o.value === sv.value)
        if (option && typeof option.stock === 'number') {
          matched = true
          ops.variant.push({ productId: item.productId, variationName: sv.name, optionValue: sv.value, quantity: item.quantity })
        }
      }
    }

    // (c) Simple product (also the fallback when no variant option tracks stock).
    if (!matched && typeof product.stock === 'number') {
      ops.simple.push({ productId: item.productId, quantity: item.quantity })
      matched = true
    }

    if (!matched) continue

    // Audit line: product-level before/after, running so repeated products add up.
    const before = running.has(item.productId) ? (running.get(item.productId) as number) : (product.stock ?? 0)
    const after = Math.max(0, before + sign * item.quantity)
    running.set(item.productId, after)
    const line: MovementLine = {
      productId: item.productId,
      productName: item.productName,
      quantity: sign * item.quantity,
      previousStock: before,
      newStock: after,
    }
    if (item.selectedVariations?.length) {
      line.variationName = item.selectedVariations.map(s => s.name).join(' / ')
      line.optionValue = item.selectedVariations.map(s => s.value).join(' / ')
    }
    ops.movements.push(line)
  }

  return ops
}

/**
 * Restore the stock an order reserved — the inverse of decrementOrderStock.
 * Atomic; idempotent when callers guard on `order.stockDecremented` and flip it
 * to false afterwards. Pass `meta` to also log a reversal in stock movements.
 */
export async function restoreOrderStock(storeId: string, order: OrderStockSource, meta?: StockMovementMeta): Promise<void> {
  const { simple, variant, combo, movements } = await buildOrderStockOps(storeId, order, +1)
  if (combo.length) await productService.restoreCombinationStock(storeId, combo)
  if (variant.length) await productService.restoreVariantStock(storeId, variant)
  if (simple.length) await productService.restoreStock(storeId, simple)
  if (movements.length && meta) {
    await writeStockMovements(storeId, order.id, 'adjustment', movements, { createdBy: meta.createdBy, reason: meta.reason || 'Pedido cancelado' })
      .catch(err => console.error('[stock] movement log (restore) failed', err))
  }
}

/**
 * Decrement an order's stock from the dashboard / POS (store owner
 * authenticated) when a sale is committed. Clamped / non-strict: confirming an
 * accepted order shouldn't fail. Callers guard on `!order.stockDecremented` and
 * set it true afterwards (idempotent — never collides with the server-side
 * confirmation decrement). Returns true if anything was decremented. Pass `meta`
 * to also log the sale in stock movements.
 */
export async function decrementOrderStock(storeId: string, order: OrderStockSource, meta?: StockMovementMeta): Promise<boolean> {
  const { simple, variant, combo, movements } = await buildOrderStockOps(storeId, order, -1)
  if (combo.length) await productService.decrementCombinationStock(storeId, combo)
  if (variant.length) await productService.decrementVariantStock(storeId, variant)
  if (simple.length) await productService.decrementStock(storeId, simple)
  if (movements.length && meta) {
    await writeStockMovements(storeId, order.id, 'sale', movements, meta)
      .catch(err => console.error('[stock] movement log (sale) failed', err))
  }
  return combo.length > 0 || variant.length > 0 || simple.length > 0
}

/**
 * Líneas del pedido cuyo stock físico actual no alcanza (mismo orden de
 * prioridad que el descuento: combinación → opción legacy → producto). Solo
 * lectura: el dashboard la usa para AVISAR (no bloquear) al confirmar un
 * pedido manual que dejaría el stock en 0 antes de tiempo.
 */
export async function findStockShortages(storeId: string, order: OrderStockSource): Promise<string[]> {
  const need = new Map<string, { label: string; available: number; qty: number }>()
  for (const item of order.items || []) {
    if (!item.productId || !item.quantity) continue
    const product = await productService.get(storeId, item.productId)
    if (!product || !product.trackStock) continue
    const buckets: { key: string; label: string; available: number }[] = []
    const combo = item.combinationId ? product.combinations?.find(c => c.id === item.combinationId) : undefined
    if (combo) {
      buckets.push({ key: `c:${combo.id}`, label: `${item.productName} (${Object.values(combo.options || {}).join(' / ')})`, available: combo.available === false ? 0 : combo.stock || 0 })
    } else if (item.selectedVariations?.length && product.variations?.length) {
      for (const sv of item.selectedVariations) {
        const option = product.variations.find(v => v.name === sv.name)?.options.find(o => o.value === sv.value)
        if (option && typeof option.stock === 'number') {
          buckets.push({ key: `o:${sv.name}=${sv.value}`, label: `${item.productName} (${sv.value})`, available: option.available === false ? 0 : option.stock })
        }
      }
    }
    if (!buckets.length && typeof product.stock === 'number') {
      buckets.push({ key: 'p', label: item.productName, available: product.stock })
    }
    for (const b of buckets) {
      const k = `${item.productId}|${b.key}`
      const prev = need.get(k)
      need.set(k, { label: b.label, available: Math.max(0, b.available), qty: (prev?.qty || 0) + item.quantity })
    }
  }
  return [...need.values()].filter(n => n.available < n.qty).map(n => `${n.label} (${n.available}/${n.qty})`)
}

/**
 * Al cancelar un pedido desde el dashboard: pide al servidor que libere la
 * reserva de stock/cupón de un pago online pendiente y devuelva el uso del
 * cupón si ya se había contado (api/order-reservation.ts). Best-effort: si
 * falla, la reserva vence sola a los 30 min.
 */
export async function releaseOrderReservation(storeId: string, orderId: string): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    await fetch(apiUrl('/api/order-reservation'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'release', storeId, orderId }),
    })
  } catch (err) {
    console.error('[stock] release reservation failed', err)
  }
}
