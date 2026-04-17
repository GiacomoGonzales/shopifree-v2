/**
 * Pixel + GA4 event helpers.
 *
 * These functions fire standard ecommerce events on whichever pixels are
 * configured (Meta Pixel, TikTok Pixel, Google Analytics 4). The underlying
 * scripts are injected in `src/components/seo/StoreSEO.tsx` — we just call
 * the globals they create (`fbq`, `ttq`, `gtag`) if present.
 *
 * All functions are defensive: if a pixel isn't loaded, its branch is a no-op.
 * They never throw — errors are swallowed silently to avoid breaking checkout
 * if a pixel misbehaves.
 */

interface PixelItem {
  id: string
  name: string
  price: number
  quantity: number
  category?: string
}

interface PixelContext {
  currency: string
  value: number
  items: PixelItem[]
}

// ─── Global declarations ──────────────────────────────────────────────────
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void }
    gtag?: (...args: unknown[]) => void
  }
}

// Module-level default currency. Set once by ThemeContext so call sites that
// don't carry currency (like useCart.addItem) can still produce good events.
let _defaultCurrency = 'USD'
export function setPixelDefaultCurrency(currency: string): void {
  if (currency) _defaultCurrency = currency
}
export function getPixelDefaultCurrency(): string {
  return _defaultCurrency
}

// ─── Safety wrapper ───────────────────────────────────────────────────────
function safe(fn: () => void): void {
  try {
    if (typeof window === 'undefined') return
    fn()
  } catch (err) {
    // Pixel errors should never break checkout or catalog flow.
    if (import.meta.env.DEV) console.warn('[pixels] event failed:', err)
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────
function fbContents(items: PixelItem[]) {
  return items.map(it => ({ id: it.id, quantity: it.quantity, item_price: it.price }))
}

function ttqContents(items: PixelItem[]) {
  return items.map(it => ({
    content_id: it.id,
    content_name: it.name,
    quantity: it.quantity,
    price: it.price,
    content_type: 'product',
  }))
}

function gaItems(items: PixelItem[]) {
  return items.map(it => ({
    item_id: it.id,
    item_name: it.name,
    price: it.price,
    quantity: it.quantity,
    ...(it.category ? { item_category: it.category } : {}),
  }))
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Product detail viewed. Fires Meta `ViewContent`, TikTok `ViewContent`, GA4 `view_item`.
 */
export function trackViewContent(ctx: PixelContext): void {
  safe(() => {
    const content_ids = ctx.items.map(it => it.id)
    // Meta
    window.fbq?.('track', 'ViewContent', {
      content_ids,
      content_type: 'product',
      contents: fbContents(ctx.items),
      value: ctx.value,
      currency: ctx.currency,
    })
    // TikTok
    window.ttq?.track('ViewContent', {
      value: ctx.value,
      currency: ctx.currency,
      contents: ttqContents(ctx.items),
    })
    // GA4
    window.gtag?.('event', 'view_item', {
      currency: ctx.currency,
      value: ctx.value,
      items: gaItems(ctx.items),
    })
  })
}

/**
 * Product added to cart. Fires Meta `AddToCart`, TikTok `AddToCart`, GA4 `add_to_cart`.
 */
export function trackAddToCart(ctx: PixelContext): void {
  safe(() => {
    const content_ids = ctx.items.map(it => it.id)
    window.fbq?.('track', 'AddToCart', {
      content_ids,
      content_type: 'product',
      contents: fbContents(ctx.items),
      value: ctx.value,
      currency: ctx.currency,
    })
    window.ttq?.track('AddToCart', {
      value: ctx.value,
      currency: ctx.currency,
      contents: ttqContents(ctx.items),
    })
    window.gtag?.('event', 'add_to_cart', {
      currency: ctx.currency,
      value: ctx.value,
      items: gaItems(ctx.items),
    })
  })
}

/**
 * Customer started checkout. Fires Meta `InitiateCheckout`, TikTok `InitiateCheckout`, GA4 `begin_checkout`.
 */
export function trackInitiateCheckout(ctx: PixelContext): void {
  safe(() => {
    const content_ids = ctx.items.map(it => it.id)
    const num_items = ctx.items.reduce((s, it) => s + it.quantity, 0)
    window.fbq?.('track', 'InitiateCheckout', {
      content_ids,
      content_type: 'product',
      contents: fbContents(ctx.items),
      value: ctx.value,
      currency: ctx.currency,
      num_items,
    })
    window.ttq?.track('InitiateCheckout', {
      value: ctx.value,
      currency: ctx.currency,
      contents: ttqContents(ctx.items),
    })
    window.gtag?.('event', 'begin_checkout', {
      currency: ctx.currency,
      value: ctx.value,
      items: gaItems(ctx.items),
    })
  })
}

/**
 * Order confirmed / purchase completed. Most important event — used by
 * Facebook/TikTok to optimize ad campaigns and calculate ROAS.
 * Fires Meta `Purchase`, TikTok `CompletePayment`, GA4 `purchase`.
 */
export function trackPurchase(ctx: PixelContext & { transactionId: string }): void {
  safe(() => {
    const content_ids = ctx.items.map(it => it.id)
    window.fbq?.('track', 'Purchase', {
      content_ids,
      content_type: 'product',
      contents: fbContents(ctx.items),
      value: ctx.value,
      currency: ctx.currency,
    })
    // TikTok's standard purchase event is called CompletePayment
    window.ttq?.track('CompletePayment', {
      value: ctx.value,
      currency: ctx.currency,
      contents: ttqContents(ctx.items),
    })
    window.gtag?.('event', 'purchase', {
      transaction_id: ctx.transactionId,
      currency: ctx.currency,
      value: ctx.value,
      items: gaItems(ctx.items),
    })
  })
}
