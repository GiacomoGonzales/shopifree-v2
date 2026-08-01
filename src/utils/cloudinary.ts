/**
 * Utilidades de optimización de imágenes.
 *
 * Soporta DOS proveedores en paralelo durante la migración:
 *  - Cloudflare (R2 + Image Transformations) → `/cdn-cgi/image/<opts>/<key>`
 *  - Cloudinary (legacy)                     → `/upload/<transforms>/<id>`
 *
 * Cualquier URL que no sea de ninguno de los dos se devuelve intacta.
 */

type ImageSize = 'thumbnail' | 'category' | 'logo' | 'card' | 'gallery' | 'hero'

interface SizeConfig {
  width: number
  height?: number
  crop: 'fill' | 'limit' | 'fit'
}

const SIZE_CONFIGS: Record<ImageSize, SizeConfig> = {
  thumbnail: { width: 160, height: 160, crop: 'fill' },  // 2x for retina
  // `category`: square cover crop used by CategoryCarousel variants in the
  // storefront. 320px covers the largest CSS render (~160px for circle/square)
  // at 2x DPR. Pair with getImageSrcSet(url, 'category') so the browser can
  // serve a 640px file on retina screens without us hardcoding HTML width.
  category: { width: 320, height: 320, crop: 'fill' },
  // `logo`: cabecera de tienda en los 87 temas (useHeaderLogo). Cubre los dos
  // casos: cuadrado a 48px CSS (400 alcanza hasta 8x DPR) y apaisado a 200px
  // CSS (400 = 2x retina). Va con `limit` y NO con `fill`: recortar un logo le
  // comería contenido, y el <img> ya usa object-contain.
  logo: { width: 400, crop: 'limit' },
  card: { width: 600, crop: 'limit' },  // Only limit width, preserve aspect ratio
  gallery: { width: 1000, crop: 'limit' },  // Higher quality for detail view
  // Hero: bumped from 1600 to 2560 to cover modern retina desktops.
  // 1440 CSS px × 2 DPR = 2880; 2560 is a good balance (most common "large desktop" viewport).
  // Pair with <HeroImg> + srcset to let the browser pick the right width per viewport.
  hero: { width: 2560, crop: 'limit' },
}

// ============================================
// CLOUDFLARE IMAGE TRANSFORMATIONS (R2)
// ============================================

/**
 * Feature flag. ACTIVO desde el 31/07/2026.
 *
 * Requiere Transformations habilitado en la zona de Cloudflare (dashboard →
 * Images → Transformations → enable for zone). Si se apaga allá, `/cdn-cgi/
 * image/...` devuelve 404 y NINGUNA imagen de R2 se ve: en ese caso poner esto
 * en `false` y las URLs vuelven a servirse sin transformar.
 *
 * Nota para el futuro: al habilitarlo en Cloudflare, el endpoint tardó ~9 horas
 * en responder 200. Un 404 recién activado NO significa que no funcione — hay
 * que darle tiempo antes de descartar la configuración.
 *
 * Para verificar el estado de la zona sin desplegar nada:
 *   curl -sSI "https://shopifreemedia.site/cdn-cgi/image/width=200,format=auto/<key>"
 */
const CF_TRANSFORMS_ENABLED = true

/**
 * Hosts que sirven el bucket R2. El valor por defecto es el dominio público
 * actual (`R2_PUBLIC_URL` en Vercel); se puede sobrescribir con una lista
 * separada por comas si algún día cambia o convive con otro.
 */
const R2_HOSTS = (
  (import.meta.env.VITE_R2_PUBLIC_HOSTS as string | undefined) || 'shopifreemedia.site'
)
  .split(',')
  .map(h => h.trim().toLowerCase())
  .filter(Boolean)

/**
 * Calidad de entrega. Cloudflare no tiene equivalente a `q_auto` de Cloudinary,
 * así que va un número fijo. 82 es el punto donde deja de notarse la diferencia
 * a simple vista en fotos de producto.
 */
const CF_QUALITY = 82

/** Equivalencias de recorte Cloudinary → Cloudflare. */
const CF_FIT: Record<SizeConfig['crop'], string> = {
  fill: 'cover',        // c_fill: recorta para llenar el marco exacto
  limit: 'scale-down',  // c_limit: entra en el ancho, nunca agranda
  fit: 'contain',       // c_fit: entra completa, sin recortar
}

/** ¿La URL la sirve nuestro bucket R2 y podemos transformarla? */
function isR2(url: string): boolean {
  if (!CF_TRANSFORMS_ENABLED) return false
  try {
    return R2_HOSTS.includes(new URL(url).hostname.toLowerCase())
  } catch {
    return false
  }
}

/** Lista de opciones de Cloudflare para un ancho/alto/recorte dados. */
function cfOptions(crop: SizeConfig['crop'], width: number, height?: number): string {
  const opts = [`format=auto`, `fit=${CF_FIT[crop]}`, `width=${width}`]
  if (height) opts.push(`height=${height}`)
  opts.push(`quality=${CF_QUALITY}`)
  return opts.join(',')
}

/**
 * Inserta `/cdn-cgi/image/<opts>/` entre el host y la key.
 *
 *   https://shopifreemedia.site/shopifree/products/foo.jpg
 *   → https://shopifreemedia.site/cdn-cgi/image/format=auto,width=600/shopifree/products/foo.jpg
 */
function cfTransform(url: string, options: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\//, '')
    // Idempotente: si ya está transformada, no la envolvemos de nuevo.
    if (path.startsWith('cdn-cgi/')) return url
    return `${u.origin}/cdn-cgi/image/${options}/${path}${u.search}`
  } catch {
    return url
  }
}

/**
 * Escape hatch para casos que no encajan en los presets de SIZE_CONFIGS:
 * recibe las opciones de Cloudflare tal cual (ej. `fit=pad` con `background`,
 * que solo usa la generación de assets para Play Console).
 *
 * Devuelve `null` cuando la URL no es de R2 o el flag está apagado, para que
 * el llamador decida el respaldo en vez de recibir una URL intacta que parece
 * transformada.
 */
export function transformR2(url: string | undefined, options: string): string | null {
  if (!url || !isR2(url)) return null
  return cfTransform(url, options)
}

// ============================================

// Widths used for responsive hero images (srcset). Each gets its own transform.
// Browser picks closest width based on viewport + DPR.
const HERO_WIDTHS = [800, 1280, 1920, 2560, 3840]

// Widths for the product gallery on the detail page. Smaller than hero widths
// because the gallery is constrained on desktop (typically 50-60% of viewport)
// and full-width on mobile.
const GALLERY_WIDTHS = [400, 700, 1000, 1500]

/**
 * Optimizes a Cloudinary URL by adding transformation parameters
 * - Converts to WebP/AVIF automatically based on browser support
 * - Compresses with auto quality
 * - Resizes based on the specified size preset
 *
 * @param url - Original Cloudinary URL
 * @param size - Size preset: 'thumbnail' | 'card' | 'gallery' | 'hero'
 * @returns Optimized URL with transformations, or original URL if not Cloudinary
 */
export function optimizeImage(url: string | undefined, size: ImageSize = 'card'): string {
  if (!url) return ''

  const config = SIZE_CONFIGS[size]

  if (isR2(url)) {
    return cfTransform(url, cfOptions(config.crop, config.width, config.height))
  }

  // Only transform Cloudinary URLs
  if (!url.includes('res.cloudinary.com')) {
    return url
  }

  // Build transformation string
  const transforms = [
    `c_${config.crop}`,
    `w_${config.width}`,
    config.height ? `h_${config.height}` : null,
    'q_auto',
    'f_auto',
  ].filter(Boolean).join(',')

  // Insert transformations after /upload/
  // URL format: https://res.cloudinary.com/xxx/image/upload/v123/folder/file.jpg
  // Result:     https://res.cloudinary.com/xxx/image/upload/c_fill,w_400,h_500,q_auto,f_auto/v123/folder/file.jpg
  return url.replace('/upload/', `/upload/${transforms}/`)
}

/**
 * Generates srcset for responsive images
 * Returns srcset string for 1x, 2x pixel densities
 */
export function getImageSrcSet(url: string | undefined, size: ImageSize = 'card'): string {
  if (!url) return ''

  const config = SIZE_CONFIGS[size]

  if (isR2(url)) {
    const h = config.height
    const at = (w: number, hh?: number) => cfTransform(url, cfOptions(config.crop, w, hh))
    return `${at(config.width, h)} 1x, ${at(config.width * 2, h ? h * 2 : undefined)} 2x`
  }

  if (!url.includes('res.cloudinary.com')) return ''

  const width1x = config.width
  const width2x = config.width * 2

  const transforms1x = [
    `c_${config.crop}`,
    `w_${width1x}`,
    config.height ? `h_${config.height}` : null,
    'q_auto',
    'f_auto',
  ].filter(Boolean).join(',')

  const transforms2x = [
    `c_${config.crop}`,
    `w_${width2x}`,
    config.height ? `h_${Math.round(config.height * 2)}` : null,
    'q_auto',
    'f_auto',
  ].filter(Boolean).join(',')

  const url1x = url.replace('/upload/', `/upload/${transforms1x}/`)
  const url2x = url.replace('/upload/', `/upload/${transforms2x}/`)

  return `${url1x} 1x, ${url2x} 2x`
}

/**
 * Generates a srcset specifically tuned for hero images (5 widths, 800w → 3840w).
 * The browser picks the best width based on the viewport width and device DPR,
 * which is crucial for hero images that span the full viewport.
 *
 * Usage:
 *   <img
 *     src={optimizeImage(url, 'hero')}
 *     srcSet={getHeroSrcSet(url)}
 *     sizes="100vw"
 *   />
 */
export function getHeroSrcSet(url: string | undefined): string {
  if (!url) return ''
  if (isR2(url)) {
    return HERO_WIDTHS
      .map(w => `${cfTransform(url, cfOptions('limit', w))} ${w}w`)
      .join(', ')
  }
  if (!url.includes('res.cloudinary.com')) return ''
  return HERO_WIDTHS
    .map(w => {
      const transforms = `c_limit,w_${w},q_auto,f_auto`
      const transformedUrl = url.replace('/upload/', `/upload/${transforms}/`)
      return `${transformedUrl} ${w}w`
    })
    .join(', ')
}

/**
 * Generates a srcset for the product gallery (4 widths, 400w → 1500w).
 * Pair with sizes="(max-width: 768px) 100vw, 600px" so the browser picks
 * roughly 400-700w on phones, 1000w on tablets, and 1500w on retina desktops.
 *
 * Without this, every viewport loads the same 1000px image, which is
 * wasteful on small phones and slightly undersized on retina desktops.
 */
export function getGallerySrcSet(url: string | undefined): string {
  if (!url) return ''
  if (isR2(url)) {
    return GALLERY_WIDTHS
      .map(w => `${cfTransform(url, cfOptions('limit', w))} ${w}w`)
      .join(', ')
  }
  if (!url.includes('res.cloudinary.com')) return ''
  return GALLERY_WIDTHS
    .map(w => {
      const transforms = `c_limit,w_${w},q_auto,f_auto`
      const transformedUrl = url.replace('/upload/', `/upload/${transforms}/`)
      return `${transformedUrl} ${w}w`
    })
    .join(', ')
}

// ============================================
// CLOUDFLARE STREAM (videos)
// ============================================
const STREAM_HOSTS = ['videodelivery.net', 'cloudflarestream.com']

/** ¿La URL es un video servido por Cloudflare Stream? */
export function isStreamVideo(url: string | undefined | null): boolean {
  return !!url && STREAM_HOSTS.some(h => url.includes(h))
}

/** Extrae el uid de un video de Cloudflare Stream a partir de su URL. */
function streamUid(url: string): string | null {
  const m = url.match(/(?:videodelivery\.net|cloudflarestream\.com)\/([^/?#]+)/)
  return m ? m[1] : null
}

/**
 * Optimizes a video URL for Reels (9:16 vertical format).
 * - Cloudflare Stream: devuelve la URL tal cual (el player usa HLS adaptativo).
 * - Cloudinary: recorta a 9:16 + comprime (fallback mp4 para sin-HLS).
 */
export function optimizeReelVideo(videoUrl: string | undefined | null): string {
  if (!videoUrl) return ''
  if (isStreamVideo(videoUrl)) return videoUrl
  if (!videoUrl.includes('res.cloudinary.com')) return videoUrl
  const transforms = 'c_fill,w_720,h_1280,g_center,q_auto:eco,f_auto'
  return videoUrl.replace('/upload/', `/upload/${transforms}/`)
}

/**
 * Returns an HLS (.m3u8) Cloudinary URL for adaptive bitrate streaming.
 * The player downloads only the chunks it needs for the current playback
 * position, instead of the full mp4. Combined with `sp_hd` we cap renditions
 * at 720p, which matches our 9:16 crop and prevents wasted bandwidth on big
 * displays.
 *
 * Cost note: the FIRST request to this URL triggers a one-time HLS conversion
 * on Cloudinary's side (uses transformation credits). Subsequent requests are
 * served from cache. With ~120 videos in the platform, the one-time cost is
 * trivial (<1 credit total).
 *
 * Native HLS support: iOS Safari, macOS Safari (set src on <video> directly).
 * For Chrome/Edge/Firefox, use hls.js to attach the manifest to the video.
 */
export function optimizeReelVideoHLS(videoUrl: string | undefined | null): string {
  if (!videoUrl) return ''
  // Cloudflare Stream ya entrega el manifest HLS — devolverlo tal cual.
  if (isStreamVideo(videoUrl)) return videoUrl
  if (!videoUrl.includes('res.cloudinary.com')) return videoUrl
  // Crop first, then sp_full_hd generates renditions up to 1080p tall.
  // For our 720x1280 source the max rendition is ~608x1080 (capped to 1080
  // in the longer dimension while preserving aspect), which is sharper than
  // sp_hd's max of ~405x720. Custom profiles tuned for portrait video would
  // be ideal but require creating one in the Cloudinary dashboard; sp_full_hd
  // is the best built-in profile for 9:16 reels.
  const transforms = 'c_fill,w_720,h_1280,g_center/sp_full_hd'
  const withTransforms = videoUrl.replace('/upload/', `/upload/${transforms}/`)
  // Replace source extension with .m3u8 — Cloudinary uses the URL extension
  // to decide the output container.
  return withTransforms.replace(/\.(mp4|webm|mov|avi|m4v)$/i, '.m3u8')
}

/**
 * Generates a thumbnail from a Cloudinary video URL (first frame)
 * Uses Cloudinary transformations to extract a JPG from frame 0
 */
export function getVideoThumbnail(videoUrl: string | undefined | null): string {
  if (!videoUrl) return ''
  // Cloudflare Stream genera la miniatura en /thumbnails/thumbnail.jpg
  if (isStreamVideo(videoUrl)) {
    const uid = streamUid(videoUrl)
    return uid ? `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg` : ''
  }
  if (!videoUrl.includes('res.cloudinary.com')) return videoUrl
  const transforms = 'c_fill,w_600,h_600,q_auto,f_jpg,so_0'
  return videoUrl.replace('/upload/', `/upload/${transforms}/`).replace(/\.(mp4|webm|mov)$/i, '.jpg')
}
