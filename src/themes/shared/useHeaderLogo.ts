import { useLogoOrientation } from './useLogoOrientation'

type SquareStyle = 'circle' | 'rounded'

interface Options {
  /**
   * How opaque square logos should be clipped:
   * - 'circle'  (default) — rounded-full, like the footer
   * - 'rounded'           — rounded-xl, for themes with a squared/industrial aesthetic
   *
   * Transparent squares and landscape logos ignore this setting (rendered as-is).
   */
  squareStyle?: SquareStyle
}

/**
 * Picks the right logo + shape for a theme header.
 *
 * Rules:
 * - `logoLandscape` uploaded → use it as-is, hide the store name (the horizontal
 *   logo already contains the brand).
 * - Square logo, transparent background → render as-is, no clipping (so the
 *   transparent corners stay transparent).
 * - Square logo, opaque background → clip per `squareStyle` (circle by default).
 * - No logo → caller renders its fallback (showName=true).
 *
 * Returns:
 *   - `src`            — URL to render, or undefined
 *   - `showName`       — whether to render the store name beside the logo
 *   - `loaded`         — orientation/transparency probe finished
 *   - `isLandscape`    — horizontal logo
 *   - `logoClassName`  — extra class to apply to the <img> (e.g. 'rounded-full')
 */
export function useHeaderLogo(
  store: { logo?: string; logoLandscape?: string },
  options: Options = {}
) {
  const { squareStyle = 'circle' } = options
  const orient = useLogoOrientation(store.logo)

  if (store.logoLandscape) {
    return {
      src: store.logoLandscape,
      showName: false,
      loaded: true,
      isLandscape: true as const,
      logoClassName: '',
    }
  }

  // Square logos: pick a clip shape, but skip clipping if the logo is transparent.
  let logoClassName = ''
  if (!orient.isHorizontal && !orient.isTransparent) {
    logoClassName = squareStyle === 'rounded' ? 'rounded-xl' : 'rounded-full'
  }

  return {
    src: store.logo,
    showName: orient.showName,
    loaded: orient.loaded,
    isLandscape: false as const,
    logoClassName,
  }
}
