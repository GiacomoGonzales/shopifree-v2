/**
 * Platform acquisition attribution — captures which ad/campaign brought a
 * visitor to shopifree.app so we can stamp it on the store they create.
 *
 * First-touch model: the FIRST visit that carries any ad signal (utm_*,
 * fbclid, gclid, ...) or an external referrer wins and is kept in
 * localStorage; later visits never overwrite it. Read it back with
 * getAttribution() at registration time and persist it to the store doc
 * (store.acquisition), so campaigns can be joined against real signups.
 *
 * This is about the PLATFORM's own funnel — completely separate from the
 * merchant-storefront pixels in src/lib/pixels.ts.
 */

const STORAGE_KEY = 'sf_attribution'

export interface Attribution {
  source?: string        // utm_source
  medium?: string        // utm_medium
  campaign?: string      // utm_campaign
  content?: string       // utm_content
  term?: string          // utm_term
  fbclid?: string        // Meta click id
  gclid?: string         // Google Ads click id
  ttclid?: string        // TikTok click id
  referrer?: string      // document.referrer host (external only)
  landingPage?: string   // pathname the visitor first hit
  capturedAt: string     // ISO timestamp
}

/** Capture first-touch attribution from the current URL. Call once at boot,
 *  BEFORE the router mounts (redirects may rewrite the URL). Safe everywhere:
 *  no-ops when there's nothing to record or storage is unavailable. */
export function captureAttribution(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return // first touch already recorded

    const params = new URLSearchParams(window.location.search)
    const attribution: Attribution = { capturedAt: new Date().toISOString() }

    const pick = (key: string): string | undefined => {
      const v = params.get(key)?.trim()
      return v ? v.slice(0, 200) : undefined
    }

    attribution.source = pick('utm_source')
    attribution.medium = pick('utm_medium')
    attribution.campaign = pick('utm_campaign')
    attribution.content = pick('utm_content')
    attribution.term = pick('utm_term')
    attribution.fbclid = pick('fbclid')
    attribution.gclid = pick('gclid')
    attribution.ttclid = pick('ttclid')

    // External referrer (ignore self-navigation)
    if (document.referrer) {
      try {
        const refHost = new URL(document.referrer).hostname
        if (refHost && refHost !== window.location.hostname) {
          attribution.referrer = refHost
        }
      } catch { /* malformed referrer — skip */ }
    }

    // Only persist when there's an actual signal — a plain direct visit with
    // no params/referrer records nothing, leaving the slot open for a later
    // ad-tagged visit.
    const hasSignal = Boolean(
      attribution.source || attribution.medium || attribution.campaign ||
      attribution.fbclid || attribution.gclid || attribution.ttclid ||
      attribution.referrer
    )
    if (!hasSignal) return

    attribution.landingPage = window.location.pathname
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch { /* private mode / storage blocked — attribution is best-effort */ }
}

/** The recorded first-touch attribution, with empty fields stripped (ready to
 *  write to Firestore, which rejects undefined). Null when nothing recorded. */
export function getAttribution(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Attribution
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v) clean[k] = v
    }
    return Object.keys(clean).length > 0 ? clean : null
  } catch {
    return null
  }
}
