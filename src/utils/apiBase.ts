import { Capacitor } from '@capacitor/core'

/**
 * Resolve API URLs.
 *
 * The /api/* routes are served by Vercel; Vite's dev server (npm run dev,
 * default :5173) does NOT proxy them, so a relative `/api/foo` hits Vite
 * and 404s. We hit the deployed prod API in two cases:
 *   1. Native Capacitor builds  → no local server inside the WebView.
 *   2. Vite dev (import.meta.env.DEV === true) → no /api on :5173.
 *
 * In a Vercel-served production build the relative path works as-is.
 */
export function apiUrl(path: string): string {
  if (Capacitor.isNativePlatform()) return `https://shopifree.app${path}`
  if (import.meta.env.DEV) return `https://shopifree.app${path}`
  return path
}
