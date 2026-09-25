import type { VolumePriceTier } from '../types'

/**
 * Precios por cantidad (mayoreo): el precio por unidad baja según cuántas
 * unidades del MISMO producto lleva el cliente, sumando todas sus variantes
 * (3 rojas + 3 azules = 6 unidades).
 *
 * Lo usan el carrito, el checkout, la venta manual y api/_shared/orderTotal.ts
 * (que recalcula el cobro en el servidor): tienen que dar exactamente lo mismo,
 * por eso toda la regla vive acá.
 *
 * Cada escalón aplica "desde minQty unidades" y trae:
 *  - price: precio fijo por unidad. Está pensado sobre el precio del producto;
 *    si la variante elegida tiene otro precio, se le aplica el mismo % que ese
 *    precio representa (producto 100 → 95 = -5%, variante 200 → 190).
 *  - percentOff: % de descuento sobre el precio de la variante/producto.
 * Un escalón nunca sube el precio, y los modificadores (extras) no se tocan.
 */

export interface VolumePricedProduct {
  price?: number
  volumePricing?: VolumePriceTier[] | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Escalones válidos, ordenados por cantidad. Descarta los mal cargados. */
export function getVolumeTiers(product: VolumePricedProduct): VolumePriceTier[] {
  const raw = Array.isArray(product.volumePricing) ? product.volumePricing : []
  const byQty = new Map<number, VolumePriceTier>()
  for (const t of raw) {
    const minQty = Number(t?.minQty)
    if (!Number.isInteger(minQty) || minQty < 2) continue
    const pct = Number(t?.percentOff)
    const price = Number(t?.price)
    if (t?.percentOff != null && isFinite(pct) && pct > 0 && pct < 100) {
      byQty.set(minQty, { minQty, percentOff: pct })
    } else if (t?.price != null && isFinite(price) && price >= 0) {
      byQty.set(minQty, { minQty, price })
    }
  }
  return [...byQty.values()].sort((a, b) => a.minQty - b.minQty)
}

export function hasVolumePricing(product: VolumePricedProduct): boolean {
  return getVolumeTiers(product).length > 0
}

/**
 * Precio por unidad para `quantity` unidades del producto, partiendo de
 * `basePrice` (precio de la variante elegida, o del producto).
 */
export function volumeUnitPrice(product: VolumePricedProduct, basePrice: number, quantity: number): number {
  if (!(basePrice > 0)) return basePrice
  const tiers = getVolumeTiers(product)
  let tier: VolumePriceTier | undefined
  for (const t of tiers) if (quantity >= t.minQty) tier = t
  if (!tier) return basePrice

  let unit: number
  if (tier.percentOff != null) {
    unit = basePrice * (1 - tier.percentOff / 100)
  } else {
    const ref = Number(product.price)
    if (!(ref > 0)) return basePrice
    unit = Math.abs(basePrice - ref) < 0.005 ? tier.price! : basePrice * (tier.price! / ref)
  }
  return round2(Math.min(basePrice, Math.max(0, unit)))
}

export interface VolumePriceRow {
  from: number
  to: number | null   // null = "o más"
  unitPrice: number
}

/**
 * Tabla para mostrar en la ficha: 1–(primer escalón - 1) al precio normal y
 * después un renglón por escalón. Omite escalones que no bajan el precio.
 */
export function getVolumePriceTable(product: VolumePricedProduct, basePrice: number): VolumePriceRow[] {
  const tiers = getVolumeTiers(product)
  if (tiers.length === 0) return []
  const rows: VolumePriceRow[] = [{ from: 1, to: null, unitPrice: basePrice }]
  for (const t of tiers) {
    const unitPrice = volumeUnitPrice(product, basePrice, t.minQty)
    const last = rows[rows.length - 1]
    if (unitPrice >= last.unitPrice) continue
    last.to = t.minQty - 1
    rows.push({ from: t.minQty, to: null, unitPrice })
  }
  return rows.length > 1 ? rows : []
}

/** Próximo escalón que baja el precio respecto de `quantity` (para "lleva N más"). */
export function getNextVolumeTier(
  product: VolumePricedProduct,
  basePrice: number,
  quantity: number,
): { minQty: number; unitPrice: number } | null {
  const current = volumeUnitPrice(product, basePrice, quantity)
  for (const t of getVolumeTiers(product)) {
    if (t.minQty <= quantity) continue
    const unitPrice = volumeUnitPrice(product, basePrice, t.minQty)
    if (unitPrice < current) return { minQty: t.minQty, unitPrice }
  }
  return null
}
