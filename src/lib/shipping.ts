import type { Store } from '../types'

/**
 * Resolve the shipping cost based on store coverage mode, delivery zone, and subtotal.
 * Returns 0 if free shipping threshold is met.
 */
export function resolveShippingCost(
  store: Store,
  subtotal: number,
  deliveryZone?: string
): number {
  const shipping = store.shipping
  if (!shipping?.enabled) return 0

  // Free shipping above threshold
  if (shipping.freeAbove && subtotal >= shipping.freeAbove) return 0

  const mode = shipping.coverageMode || 'nationwide'
  const storeZone = store.location?.state

  switch (mode) {
    case 'nationwide':
      return shipping.cost || 0

    case 'zones': {
      // If delivery zone matches store zone -> local cost
      if (deliveryZone && storeZone && deliveryZone === storeZone) {
        return shipping.localCost ?? shipping.cost ?? 0
      }
      // Other allowed zone -> national cost
      return shipping.nationalCost ?? shipping.cost ?? 0
    }

    case 'local':
      return shipping.localCost ?? shipping.cost ?? 0

    default:
      return shipping.cost || 0
  }
}

/**
 * Check if a delivery zone is allowed based on store coverage settings.
 * Supports hierarchical zones: department, province (dept|prov), district (dept|prov|dist)
 */
export function isZoneAllowed(
  store: Store,
  zone?: string,
  province?: string,
  district?: string
): boolean {
  const shipping = store.shipping
  if (!shipping) return true

  const mode = shipping.coverageMode || 'nationwide'

  switch (mode) {
    case 'nationwide':
      return true

    case 'zones': {
      if (!zone) return true // no zone selected yet, allow

      // Check if department is allowed
      const deptAllowed = (shipping.allowedZones || []).includes(zone)
      if (deptAllowed) return true

      // Check if specific province is allowed
      if (province) {
        const provKey = `${zone}|${province}`
        const provAllowed = (shipping.allowedProvinces || []).includes(provKey)
        if (provAllowed) return true

        // Check if specific district is allowed
        if (district) {
          const distKey = `${zone}|${province}|${district}`
          const distAllowed = (shipping.allowedDistricts || []).includes(distKey)
          if (distAllowed) return true
        }
      }

      // Not in any allowed zone
      return false
    }

    case 'local':
      if (!zone) return true // no zone selected yet, allow
      return zone === store.location?.state

    default:
      return true
  }
}
