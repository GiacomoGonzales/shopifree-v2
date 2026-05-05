/**
 * Cloudinary image optimization utilities
 * Transforms Cloudinary URLs to include optimization parameters
 */

type ImageSize = 'thumbnail' | 'card' | 'gallery' | 'hero'

interface SizeConfig {
  width: number
  height?: number
  crop: 'fill' | 'limit' | 'fit'
}

const SIZE_CONFIGS: Record<ImageSize, SizeConfig> = {
  thumbnail: { width: 160, height: 160, crop: 'fill' },  // 2x for retina
  card: { width: 600, crop: 'limit' },  // Only limit width, preserve aspect ratio
  gallery: { width: 1000, crop: 'limit' },  // Higher quality for detail view
  // Hero: bumped from 1600 to 2560 to cover modern retina desktops.
  // 1440 CSS px × 2 DPR = 2880; 2560 is a good balance (most common "large desktop" viewport).
  // Pair with <HeroImg> + srcset to let the browser pick the right width per viewport.
  hero: { width: 2560, crop: 'limit' },
}

// Widths used for responsive hero images (srcset). Each gets its own Cloudinary transform.
// Browser picks closest width based on viewport + DPR.
const HERO_WIDTHS = [800, 1280, 1920, 2560, 3840]

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

  // Only transform Cloudinary URLs
  if (!url.includes('res.cloudinary.com')) {
    return url
  }

  const config = SIZE_CONFIGS[size]

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
  if (!url || !url.includes('res.cloudinary.com')) {
    return ''
  }

  const config = SIZE_CONFIGS[size]
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
  if (!url || !url.includes('res.cloudinary.com')) return ''
  return HERO_WIDTHS
    .map(w => {
      const transforms = `c_limit,w_${w},q_auto,f_auto`
      const transformedUrl = url.replace('/upload/', `/upload/${transforms}/`)
      return `${transformedUrl} ${w}w`
    })
    .join(', ')
}

/**
 * Optimizes a Cloudinary video URL for Reels (9:16 vertical format)
 * - Crops to 9:16 using c_fill with auto gravity (focuses on content)
 * - Compresses with auto quality
 * - Converts square/horizontal videos to vertical fullscreen
 *
 * This is the fallback for browsers without HLS support. Prefer
 * optimizeReelVideoHLS when you can use adaptive bitrate streaming.
 */
export function optimizeReelVideo(videoUrl: string | undefined | null): string {
  if (!videoUrl) return ''
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
  if (!videoUrl.includes('res.cloudinary.com')) return videoUrl
  const transforms = 'c_fill,w_600,h_600,q_auto,f_jpg,so_0'
  return videoUrl.replace('/upload/', `/upload/${transforms}/`).replace(/\.(mp4|webm|mov)$/i, '.jpg')
}
