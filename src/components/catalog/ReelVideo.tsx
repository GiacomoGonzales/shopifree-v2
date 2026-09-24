import { useEffect, useRef } from 'react'
import { isStreamVideo } from '../../utils/media'

interface ReelVideoProps {
  hlsUrl: string                     // HLS manifest (Cloudflare Stream). Si no es Stream se usa fallbackUrl.
  fallbackUrl: string                // URL directa del video (mp4) para lo que no es Stream
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
 * Videos de Cloudflare Stream se reproducen por HLS adaptativo; cualquier otra
 * URL se asigna directo al <video>.
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

    // Cualquier otra URL → mp4 directo.
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
