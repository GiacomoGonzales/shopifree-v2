import { Capacitor } from '@capacitor/core'
import { MAIN_DOMAINS } from '../hooks/useSubdomain'

/**
 * PLATFORM-level tracking for shopifree.app's own acquisition funnel:
 * the Meta Pixel + GA4 conversion events that measure "visitor → registered
 * merchant". Completely separate from src/lib/pixels.ts, which fires the
 * MERCHANT's own pixels on their storefront.
 *
 * Guards, in order:
 *  - Never on Capacitor native (App Store tracking rules; web-only funnel).
 *  - Only on MAIN domains (shopifree.app / www / vercel preview / localhost) —
 *    a merchant's storefront must never fire the platform pixel.
 *  - Pixel only when VITE_META_PIXEL_ID is configured; gtag only when GA4 is
 *    loaded (index.html). Every call is optional-chained so nothing breaks
 *    when either script is absent/blocked.
 *
 * Event model (mirrors Meta's standard events so campaigns can optimize):
 *  - Lead / sign_up ............. auth account created (wizard step 1 done)
 *  - CompleteRegistration / store_created ... store actually created (the
 *    real conversion — this is what META campaigns should optimize for).
 */

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined

let pixelReady = false

function isPlatformHost(): boolean {
  return MAIN_DOMAINS.includes(window.location.hostname)
}

function platformTrackingEnabled(): boolean {
  return !Capacitor.isNativePlatform() && isPlatformHost()
}

/** Inject the Meta Pixel base code (official stub, TS-safe) and init it.
 *  Call once at boot from main.tsx. PageView is NOT fired here — the SPA
 *  route tracker in App.tsx owns PageView (fires on mount + every route
 *  change), which avoids a double-count on first load. */
export function initPlatformTracking(): void {
  if (!platformTrackingEnabled() || !PIXEL_ID) return
  if (window.fbq) { pixelReady = true; return } // already present

  type FbqStub = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void
    queue: unknown[]
    push: unknown
    loaded: boolean
    version: string
  }
  const fbq = function (this: unknown, ...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod.apply(this, args)
    else fbq.queue.push(args)
  } as FbqStub
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []

  window.fbq = fbq
  ;(window as unknown as Record<string, unknown>)._fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  window.fbq('init', PIXEL_ID)
  pixelReady = true
}

/** SPA PageView — called by the route tracker on every main-site navigation. */
export function trackPlatformPageView(): void {
  if (!pixelReady) return
  window.fbq?.('track', 'PageView')
}

/** Auth account created (register wizard step 1 — email or OAuth). */
export function trackLead(method: 'email' | 'google' | 'apple'): void {
  if (!platformTrackingEnabled()) return
  window.gtag?.('event', 'sign_up', { method })
  if (pixelReady) window.fbq?.('track', 'Lead', { content_name: `register_${method}` })
}

/** Store created — the real acquisition conversion. */
export function trackStoreCreated(params: { method: string; businessType: string; country: string }): void {
  if (!platformTrackingEnabled()) return
  window.gtag?.('event', 'store_created', {
    method: params.method,
    business_type: params.businessType,
    country: params.country,
  })
  if (pixelReady) {
    window.fbq?.('track', 'CompleteRegistration', {
      content_name: params.businessType,
      status: true,
    })
  }
}
