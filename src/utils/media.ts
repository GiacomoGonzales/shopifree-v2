/**
 * Utilidades de optimización de imágenes.
 *
 *  - Imágenes: Cloudflare R2 + Image Transformations → `/cdn-cgi/image/<opts>/<key>`
 *  - Videos:   Cloudflare Stream (HLS + miniaturas)
 *
 * Cualquier URL que no sea de R2/Stream se devuelve intacta.
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
 * Calidad de entrega. Cloudflare no tiene calidad automática, así que va un
 * número fijo. 82 es el punto donde deja de notarse la diferencia
 * a simple vista en fotos de producto.
 */
const CF_QUALITY = 82

/** Modo de recorte de cada preset → `fit` de Cloudflare. */
const CF_FIT: Record<SizeConfig['crop'], string> = {
  fill: 'cover',        // recorta para llenar el marco exacto
  limit: 'scale-down',  // entra en el ancho, nunca agranda
  fit: 'contain',       // entra completa, sin recortar
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
 * Optimiza una imagen de R2 con Cloudflare Image Transformations:
 * formato automático (WebP/AVIF), calidad fija y tamaño según el preset.
 *
 * @param url - URL original (R2)
 * @param size - Preset de tamaño (ver SIZE_CONFIGS)
 * @returns URL transformada, o la original si no es de R2
 */
export function optimizeImage(url: string | undefined, size: ImageSize = 'card'): string {
  if (!url) return ''
  if (!isR2(url)) return url
  const config = SIZE_CONFIGS[size]
  return cfTransform(url, cfOptions(config.crop, config.width, config.height))
}

/**
 * Genera el srcset 1x/2x de una imagen de R2 (vacío si no es de R2).
 */
export function getImageSrcSet(url: string | undefined, size: ImageSize = 'card'): string {
  if (!url || !isR2(url)) return ''
  const config = SIZE_CONFIGS[size]
  const h = config.height
  const at = (w: number, hh?: number) => cfTransform(url, cfOptions(config.crop, w, hh))
  return `${at(config.width, h)} 1x, ${at(config.width * 2, h ? h * 2 : undefined)} 2x`
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
  if (!url || !isR2(url)) return ''
  return HERO_WIDTHS
    .map(w => `${cfTransform(url, cfOptions('limit', w))} ${w}w`)
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
  if (!url || !isR2(url)) return ''
  return GALLERY_WIDTHS
    .map(w => `${cfTransform(url, cfOptions('limit', w))} ${w}w`)
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
 * URL de video para Reels. Cloudflare Stream entrega HLS adaptativo, así que
 * se devuelve tal cual; cualquier otra URL también queda intacta.
 */
export function optimizeReelVideo(videoUrl: string | undefined | null): string {
  return videoUrl || ''
}

/**
 * URL HLS (.m3u8) para streaming adaptativo. Cloudflare Stream ya entrega el
 * manifest HLS, así que se devuelve tal cual.
 *
 * HLS nativo: iOS Safari, macOS Safari (src directo en <video>).
 * En Chrome/Edge/Firefox se usa hls.js para adjuntar el manifest al video.
 */
export function optimizeReelVideoHLS(videoUrl: string | undefined | null): string {
  return videoUrl || ''
}

/**
 * Miniatura de un video. Cloudflare Stream la genera en
 * /thumbnails/thumbnail.jpg; otras URLs se devuelven intactas.
 */
export function getVideoThumbnail(videoUrl: string | undefined | null): string {
  if (!videoUrl) return ''
  if (isStreamVideo(videoUrl)) {
    const uid = streamUid(videoUrl)
    return uid ? `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg` : ''
  }
  return videoUrl
}
