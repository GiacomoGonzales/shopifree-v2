import type { VolumePriceTier } from '../../../types'
import { getVolumeTiers } from '../../../lib/volumePricing'

// Estado del formulario de "Precios por cantidad" (VolumePricingSection) y su
// conversión a/desde lo que se guarda en el producto.

export type VolumeMode = 'price' | 'percent'

export interface VolumeRow {
  minQty: string
  value: string   // precio por unidad o % según el modo
}

/** Filas del formulario → escalones a guardar (descarta las incompletas). */
export function rowsToTiers(rows: VolumeRow[], mode: VolumeMode): VolumePriceTier[] {
  const tiers = rows
    .map(r => ({ minQty: parseInt(r.minQty, 10), value: parseFloat(r.value) }))
    .filter(r => Number.isInteger(r.minQty) && r.minQty >= 2 && isFinite(r.value) && r.value > 0)
    .map(r => (mode === 'percent' ? { minQty: r.minQty, percentOff: r.value } : { minQty: r.minQty, price: r.value }))
  return getVolumeTiers({ volumePricing: tiers })
}

/** Escalones guardados → filas + modo del formulario. */
export function tiersToRows(tiers: VolumePriceTier[] | null | undefined): { rows: VolumeRow[]; mode: VolumeMode } {
  const valid = getVolumeTiers({ volumePricing: tiers })
  const mode: VolumeMode = valid.some(t => t.percentOff != null) ? 'percent' : 'price'
  return {
    mode,
    rows: valid.map(t => ({
      minQty: String(t.minQty),
      value: String(mode === 'percent' ? (t.percentOff ?? '') : (t.price ?? '')),
    })),
  }
}
