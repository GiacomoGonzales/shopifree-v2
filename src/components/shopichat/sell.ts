/**
 * Vender desde el chat — utilidades sin componentes: precios y stock de un
 * producto, textos que caen en el cuadro de escribir (tarjeta de producto,
 * cupón, resumen del pedido) y el link de pago público.
 *
 * Los montos de un pedido con pago online se calculan IGUAL que el servidor
 * (api/_shared/orderTotal.ts priceOrder): precio de la combinación o del
 * producto con precio por cantidad, envío de src/lib/shipping.ts y descuento
 * solo desde el cupón. Si no coinciden, la pasarela rechaza el cobro
 * ('amount_mismatch'), así que acá no se permite editar precios ni envío en
 * esos pedidos.
 */
import type { TFunction } from 'i18next'
import { formatPrice } from '../../lib/currency'
import type { Coupon, Order, Product, Store, VariantCombination } from '../../types'
import { storeUrlOf } from './utils'

export const ONLINE_METHODS = ['mercadopago', 'stripe', 'paypal', 'gocuotas'] as const
export type OnlineMethod = typeof ONLINE_METHODS[number]
export const OFFLINE_METHODS = ['cash', 'transfer', 'whatsapp'] as const
export type ChatPaymentMethod = OnlineMethod | typeof OFFLINE_METHODS[number]

export const isOnlineMethod = (m?: string | null): m is OnlineMethod =>
  Boolean(m) && (ONLINE_METHODS as readonly string[]).includes(m as string)

/** Pasarelas online que la tienda tiene activas. */
export function enabledOnlineMethods(store: Store): OnlineMethod[] {
  const p = store.payments || {}
  return ONLINE_METHODS.filter(m => Boolean(p[m]?.enabled))
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Combinaciones que se pueden vender (disponibles). */
export const sellableCombos = (p: Product): VariantCombination[] =>
  (p.combinations || []).filter(c => c.available !== false)

export const comboLabel = (c: VariantCombination) => Object.values(c.options || {}).join(' / ')

/** Precio mínimo y máximo (con variantes). */
export function priceRange(p: Product): { min: number; max: number } {
  const combos = sellableCombos(p)
  if (!combos.length) return { min: Number(p.price) || 0, max: Number(p.price) || 0 }
  const prices = combos.map(c => (typeof c.price === 'number' ? c.price : Number(p.price) || 0))
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export function priceRangeText(p: Product, currency: string): string {
  const { min, max } = priceRange(p)
  return min === max ? formatPrice(min, currency) : `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`
}

/** Stock disponible (null = no se controla). Con variantes, la suma de las disponibles. */
export function productStock(p: Product, combo?: VariantCombination | null): number | null {
  if (!p.trackStock) return null
  if (combo) return combo.available === false ? 0 : Number(combo.stock) || 0
  const combos = p.combinations || []
  if (combos.length) return sellableCombos(p).reduce((s, c) => s + (Number(c.stock) || 0), 0)
  return typeof p.stock === 'number' ? p.stock : null
}

export const productUrl = (store: Store, p: Pick<Product, 'slug'>) => `${storeUrlOf(store)}/p/${p.slug}`

/** La foto para la tarjeta: la de la variante elegida, o la principal. */
export const productImage = (p: Product, combo?: VariantCombination | null): string | null =>
  combo?.image || p.image || p.images?.[0] || null

/** "*Nombre*\nPrecio\nlink" — el pie de la tarjeta de producto. */
export function productCaption(store: Store, p: Product, combo?: VariantCombination | null): string {
  const currency = store.currency || 'USD'
  const name = combo ? `${p.name} (${comboLabel(combo)})` : p.name
  const price = combo
    ? formatPrice(typeof combo.price === 'number' ? combo.price : Number(p.price) || 0, currency)
    : priceRangeText(p, currency)
  return `*${name.replace(/\*/g, '')}*\n${price}\n${productUrl(store, p)}`
}

/** Descuento de un cupón sobre un subtotal: mismo cálculo que el servidor. */
export function couponDiscount(c: Pick<Coupon, 'discountType' | 'discountValue'>, subtotal: number): number {
  const value = Number(c.discountValue) || 0
  const d = c.discountType === 'percentage' ? Math.round(subtotal * value) / 100 : Math.min(value, subtotal)
  return round2(Math.max(0, Math.min(d, subtotal)))
}

/** "Usa el cupón *CODE* para 10% de descuento" */
export function couponText(t: TFunction, c: Coupon, currency: string): string {
  const amount = c.discountType === 'percentage' ? `${c.discountValue}%` : formatPrice(c.discountValue, currency)
  const base = t('shopichat.sell.couponText', { code: c.code, amount })
  return c.minOrderAmount ? `${base} ${t('shopichat.sell.couponMin', { amount: formatPrice(c.minOrderAmount, currency) })}` : base
}

/**
 * Link público para pagar un pedido: /pay/{storeId}/{orderId} en el dominio de
 * la tienda. En desarrollo (localhost) se usa el origen local para poder
 * probar la página sin desplegar.
 */
export function payLinkFor(store: Store, orderId: string): string {
  const local = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  const origin = local ? window.location.origin : storeUrlOf(store)
  return `${origin}/pay/${encodeURIComponent(store.id)}/${encodeURIComponent(orderId)}`
}

export const canPayOnline = (o: Order) =>
  isOnlineMethod(o.paymentMethod) && o.paymentStatus !== 'paid' && o.paymentStatus !== 'refunded' && o.status !== 'cancelled'

export const methodLabel = (t: TFunction, m: string) =>
  t(`shopichat.sell.methods.${m}`, { defaultValue: t(`shopichat.customer.payment.${m}`, { defaultValue: m }) })

/** Resumen del pedido para mandarlo por el chat (formato de WhatsApp). */
export function orderSummaryText(t: TFunction, store: Store, o: Order, payLink?: string | null): string {
  const currency = store.currency || 'USD'
  const money = (n: number) => formatPrice(n, currency)
  const lines: string[] = [t('shopichat.sell.summaryTitle', { number: o.orderNumber })]
  for (const it of o.items || []) {
    const vars = (it.selectedVariations || []).map(v => v.value).filter(Boolean).join(' / ')
    lines.push(`• ${it.quantity} × ${it.productName}${vars ? ` (${vars})` : ''} — ${money(Number(it.itemTotal) || 0)}`)
  }
  lines.push('')
  lines.push(`${t('shopichat.sell.subtotal')}: ${money(Number(o.subtotal) || 0)}`)
  if (o.discount?.amount) lines.push(`${t('shopichat.sell.discount')}${o.discount.code ? ` (${o.discount.code})` : ''}: -${money(o.discount.amount)}`)
  if (o.deliveryMethod === 'delivery') lines.push(`${t('shopichat.sell.shipping')}: ${o.shippingCost ? money(o.shippingCost) : t('shopichat.sell.free')}`)
  lines.push(`*${t('shopichat.sell.total')}: ${money(Number(o.total) || 0)}*`)
  lines.push('')
  if (o.deliveryMethod === 'delivery') {
    const a = o.deliveryAddress
    const addr = [a?.street, a?.district, a?.city, a?.state].filter(Boolean).join(', ')
    lines.push(`${t('shopichat.sell.deliveryTo')}: ${addr || '-'}${a?.reference ? ` (${a.reference})` : ''}`)
  } else {
    lines.push(t('shopichat.sell.pickupAt'))
  }
  if (o.paymentMethod) lines.push(`${t('shopichat.sell.paymentLabel')}: ${methodLabel(t, o.paymentMethod)}`)
  if (payLink) lines.push('', t('shopichat.sell.payHere', { url: payLink }))
  return lines.join('\n')
}
