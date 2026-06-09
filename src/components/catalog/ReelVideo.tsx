import { useEffect, useRef } from 'react'
import { isStreamVideo } from '../../utils/cloudinary'

interface ReelVideoProps {
  hlsUrl: string                     // HLS manifest (Cloudflare Stream). Cloudinary => se usa fallbackUrl.
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
  hlsUrl,
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

    // Cloudflare Stream → HLS adaptativo (hls.js en Chrome/Firefox, nativo en Safari).
    if (isStreamVideo(hlsUrl)) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl
        return
      }
      let cancelled = false
      let hls: { destroy: () => void } | null = null
      import('hls.js').then(({ default: Hls }) => {
        const el = videoRef.current
        if (cancelled || !el) return
        if (Hls.isSupported()) {
          const inst = new Hls({ maxBufferLength: 10 })
          inst.loadSource(hlsUrl)
          inst.attachMedia(el)
          inst.on(Hls.Events.MANIFEST_PARSED, () => { el.play().catch(() => {}) })
          hls = inst
        } else {
          el.src = hlsUrl
        }
      }).catch(() => {})
      return () => { cancelled = true; hls?.destroy() }
    }

    // Cloudinary (videos viejos) → mp4 directo, como antes.
    video.src = fallbackUrl
  }, [isCurrent, hlsUrl, fallbackUrl])

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
