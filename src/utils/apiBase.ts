import { Capacitor } from '@capacitor/core'

/**
 * Resolve API URLs for Capacitor native apps.
 * On native platforms, `/api/push` won't work because there's no local server,
 * so we prepend the production domain. On web, returns the same relative path.
 */
export function apiUrl(path: string): string {
  return Capacitor.isNativePlatform() ? `https://shopifree.app${path}` : path
}
