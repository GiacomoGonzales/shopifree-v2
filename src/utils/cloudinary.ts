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
  hero: { width: 1600, crop: 'limit' },
}

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
 * Optimizes a Cloudinary video URL for Reels (9:16 vertical format)
 * - Crops to 9:16 using c_fill with auto gravity (focuses on content)
 * - Compresses with auto quality
 * - Converts square/horizontal videos to vertical fullscreen
 */
export function optimizeReelVideo(videoUrl: string | undefined | null): string {
  if (!videoUrl) return ''
  if (!videoUrl.includes('res.cloudinary.com')) return videoUrl
  const transforms = 'c_fill,w_720,h_1280,g_center,q_auto'
  return videoUrl.replace('/upload/', `/upload/${transforms}/`)
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
