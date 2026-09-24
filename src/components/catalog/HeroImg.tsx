import { forwardRef, type ImgHTMLAttributes } from 'react'
import { optimizeImage, getHeroSrcSet } from '../../utils/media'
import { useLiveEdit } from './liveEditContext'

/**
 * Drop-in replacement for `<img>` when rendering a store hero image.
 *
 * Automatically:
 * - Generates a 5-width srcset (800w → 3840w) so the browser picks the
 *   optimal resolution for the viewport + DPR combo. This is the fix for
 *   blurry hero images on large retina desktops.
 * - Falls back to the `hero` preset (2560w) for the base `src`.
 * - Auto-converts to WebP/AVIF via Cloudflare's `format=auto` (R2 URLs).
 * - Defaults `sizes="100vw"` because heroes nearly always span the viewport
 *   (override via prop if a specific theme differs).
 *
 * Usage (unchanged API from `<img>`):
 *   <HeroImg src={store.heroImage} alt={store.name} className="w-full h-full object-cover" />
 */

interface HeroImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string | undefined
  /** Defaults to `100vw`. Override for heroes that don't span the full viewport. */
  sizes?: string
}

const HeroImg = forwardRef<HTMLImageElement, HeroImgProps>(
  ({ src, sizes = '100vw', alt = '', loading = 'eager', ...rest }, ref) => {
    // En el editor en vivo la portada se marca para cambiarla con un clic.
    const editing = useLiveEdit()
    // Si la URL no es de R2 (ej. externa), optimizeImage la devuelve tal cual
    if (!src) return null

    const optimizedSrc = optimizeImage(src, 'hero')
    const srcSet = getHeroSrcSet(src)

    return (
      <img
        ref={ref}
        src={optimizedSrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={loading}
        // La URL original, para que el editor sepa si es la portada de computadora o la de celular.
        data-sf-hero={editing ? src : undefined}
        // Marca la portada para las secciones (ocultar/ordenar, ver sectionLayout).
        data-sf-hero-img=""
        {...rest}
      />
    )
  }
)

HeroImg.displayName = 'HeroImg'

export default HeroImg
