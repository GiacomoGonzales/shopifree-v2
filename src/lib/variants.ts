import type { Product, VariantCombination } from '../types'

/**
 * Variant utilities — bridge between the modern `combinations[]` model
 * (the source of truth in the dashboard / inventory / purchases) and the
 * storefront UI. Always prefer combinations when available, with a graceful
 * fallback to the legacy `variation.options[].stock` model so existing
 * products keep working while merchants migrate.
 */

/**
 * Returns the exact combination matching ALL current variant selections.
 * Returns undefined if any required dimension is unselected, or if no
 * matching combination exists (or product has no combinations[]).
 */
export function findCombination(
  product: Product,
  selectedVariants: Record<string, string> | undefined,
): VariantCombination | undefined {
  if (!product.combinations?.length) return undefined
  if (!product.variations?.length) return undefined
  if (!selectedVariants) return undefined

  // All declared variations must be present in the selection
  const variationNames = product.variations.map(v => v.name)
  for (const name of variationNames) {
    if (!selectedVariants[name]) return undefined
  }

  return product.combinations.find(c =>
    variationNames.every(name => c.options[name] === selectedVariants[name])
  )
}

/**
 * Whether a single option (e.g. "Color: Rojo") is selectable given the user's
 * other current selections. Looks across `combinations[]` to determine if any
 * remaining combination would still be reachable and in-stock if the user
 * picked this option.
 *
 * Falls back to legacy option-level stock when the product has no
 * combinations[] (older products from before the variant combinations model).
 */
export function isOptionAvailable(
  product: Product,
  currentSelections: Record<string, string>,
  varName: string,
  optionValue: string,
  trackStock?: boolean,
): boolean {
  // Modern path: derive availability from combinations[]
  if (product.combinations?.length) {
    const candidate = { ...currentSelections, [varName]: optionValue }
    const matching = product.combinations.filter(c =>
      Object.entries(candidate).every(([k, v]) => c.options[k] === v)
    )
    if (matching.length === 0) return false
    return matching.some(c => {
      if (!c.available) return false
      if (trackStock && c.stock <= 0) return false
      return true
    })
  }

  // Legacy fallback: read from variation.options[]
  const variation = product.variations?.find(v => v.name === varName)
  const option = variation?.options.find(o => o.value === optionValue)
  if (!option) return false
  if (!option.available) return false
  if (trackStock && typeof option.stock === 'number' && option.stock <= 0) return false
  return true
}

/**
 * Returns the available stock for a given variant selection, used for
 * cart-quantity caps. Modern combinations win when present; otherwise we fall
 * back to the minimum legacy option.stock across selected dimensions, then to
 * product.stock for simple products.
 *
 * Returns undefined when the product is not stock-tracked or stock is unknown
 * (callers should treat that as "no cap").
 */
export function getStockForSelection(
  product: Product,
  selectedVariants: Record<string, string> | undefined,
): number | undefined {
  if (!product.trackStock) return undefined

  // With variant selection
  if (selectedVariants && Object.keys(selectedVariants).length > 0) {
    const combo = findCombination(product, selectedVariants)
    if (combo) return combo.stock

    // Legacy fallback: minimum of selected options' stock
    if (product.variations?.length) {
      let min: number | undefined
      for (const [varName, varValue] of Object.entries(selectedVariants)) {
        const variation = product.variations.find(v => v.name === varName)
        const option = variation?.options.find(o => o.value === varValue)
        if (option && typeof option.stock === 'number') {
          min = min === undefined ? option.stock : Math.min(min, option.stock)
        }
      }
      if (min !== undefined) return min
    }
  }

  // Simple product fallback
  return typeof product.stock === 'number' ? product.stock : undefined
}

/**
 * Returns the displayable image for a product+selection pair: the variant's
 * own image when configured, otherwise the product image. Used by the drawer,
 * cart line, and any other surface that should reflect the selected variant.
 */
export function getDisplayImage(
  product: Product,
  selectedVariants: Record<string, string> | undefined,
): string | undefined {
  const combo = findCombination(product, selectedVariants)
  if (combo?.image) return combo.image
  return product.image || product.images?.[0]
}

/**
 * Returns the displayable price for a product+selection pair: the
 * combination's price when defined, otherwise the product's base price.
 */
export function getDisplayPrice(
  product: Product,
  selectedVariants: Record<string, string> | undefined,
): number {
  const combo = findCombination(product, selectedVariants)
  if (combo && typeof combo.price === 'number') return combo.price
  return product.price
}
