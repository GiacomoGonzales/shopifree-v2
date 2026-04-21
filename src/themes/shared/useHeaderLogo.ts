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
 * Picks the right logo + final <img> className for a theme header.
 *
 * Rules:
 * - `logoLandscape` uploaded → wide box (h-12 w-auto max-w-[200px]), no clipping,
 *   hide the store name text.
 * - Square logo (opaque or transparent) → forced square box (h-12 w-12) so the
 *   rounded clip is a true circle even if the source image isn't perfectly 1:1.
 *   - Opaque square → `rounded-full` or `rounded-xl` per `squareStyle`.
 *   - Transparent square → no clipping (keeps transparency).
 * - No logo → caller renders its own fallback.
 *
 * Returns:
 *   - `src`            — URL to render, or undefined
 *   - `showName`       — whether to render the store name beside the logo
 *   - `loaded`         — orientation/transparency probe finished
 *   - `isLandscape`    — horizontal logo
 *   - `logoClassName`  — complete className for the <img> (size + shape)
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
      logoClassName: 'h-12 w-auto max-w-[200px] object-contain',
    }
  }

  // Square: forced square box for a true circular clip.
  const base = 'h-12 w-12 object-contain'
  let shape = ''
  if (!orient.isHorizontal && !orient.isTransparent) {
    shape = squareStyle === 'rounded' ? 'rounded-xl' : 'rounded-full'
  }

  return {
    src: store.logo,
    showName: orient.showName,
    loaded: orient.loaded,
    isLandscape: false as const,
    logoClassName: `${base} ${shape}`.trim(),
  }
}
