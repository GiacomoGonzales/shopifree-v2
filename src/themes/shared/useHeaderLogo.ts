import { useLogoOrientation } from './useLogoOrientation'

/**
 * Picks the right logo for a theme header.
 *
 * - If `logoLandscape` is uploaded, it wins: used as the header logo AND the
 *   store name text beside it is hidden (the horizontal logo already contains
 *   the brand).
 * - Otherwise falls back to the square `logo` and lets `useLogoOrientation`
 *   auto-detect whether the uploaded image is wide enough to stand alone.
 *
 * Returns:
 *   - `src`       — URL to render in the header
 *   - `showName`  — whether to render the store name text beside the logo
 *   - `loaded`    — orientation probe finished (matches useLogoOrientation)
 */
export function useHeaderLogo(store: { logo?: string; logoLandscape?: string }) {
  // Always call the hook so React sees a stable hook order. We detect
  // orientation on the square logo regardless — cheap, cached, and we need
  // `loaded` either way for themes that animate on load.
  const orient = useLogoOrientation(store.logo)

  if (store.logoLandscape) {
    return {
      src: store.logoLandscape,
      showName: false,
      loaded: true,
      isLandscape: true as const,
    }
  }

  return {
    src: store.logo,
    showName: orient.showName,
    loaded: orient.loaded,
    isLandscape: false as const,
  }
}
