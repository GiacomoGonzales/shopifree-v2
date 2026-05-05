import { useEffect, useRef } from 'react'

interface ReelVideoProps {
  hlsUrl: string                     // Reserved for future HLS support (currently unused)
  fallbackUrl: string                // Optimized MP4 URL (Cloudinary q_auto:eco,f_auto)
  isCurrent: boolean                 // True only for the active slide
  isMuted: boolean                   // Shared mute state across all reels
  videoRefCallback?: (el: HTMLVideoElement | null) => void
  onPlaying?: () => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Wrapper around <video> for the reels feed. Non-current slides keep an empty
 * element so they don't burn bandwidth, and only mount their source when they
 * become the active slide.
 *
 * HLS adaptive streaming was attempted but rolled back — Cloudinary's
 * predefined streaming profiles (sp_hd, sp_full_hd) cap renditions by their
 * longer dimension, which produces undersized variants for portrait 9:16
 * sources. Re-enabling HLS will require either a custom streaming profile
 * defined in the Cloudinary dashboard or eager transformations specifying
 * vertical-aware rendition sizes. The hlsUrl prop and hls.js dependency are
 * kept so we can swap it back in without an API change.
 *
 * For now the optimized MP4 (q_auto:eco,f_auto) handles delivery, which still
 * gives ~30-40% bandwidth savings over the original q_auto-only URL.
 */
export default function ReelVideo({
  fallbackUrl,
  isCurrent,
  isMuted,
  videoRefCallback,
  onPlaying,
  className,
  style,
}: ReelVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    // Skip non-current slides — no source, no bandwidth.
    if (!video || !isCurrent) return
    video.src = fallbackUrl
  }, [isCurrent, fallbackUrl])

  return (
    <video
      ref={(el) => {
        videoRef.current = el
        videoRefCallback?.(el)
      }}
      autoPlay={isCurrent}
      muted={isMuted}
      loop
      playsInline
      preload={isCurrent ? 'auto' : 'metadata'}
      onPlaying={onPlaying}
      className={className}
      style={style}
    />
  )
}
