import { useState, useEffect } from 'react'

// Cached probe results — keyed by URL so we don't rescan the same image.
interface ProbeResult {
  isHorizontal: boolean
  isTransparent: boolean
}
const cache = new Map<string, ProbeResult>()

/**
 * Detects whether a logo image is:
 *   - horizontal (width > height * 1.4) — the logo already contains the brand name
 *   - square/vertical with an opaque background (e.g. photo-style logo)
 *   - square/vertical with a transparent background (icon-style logo)
 *
 * Transparency is probed by reading the alpha of the 4 corner pixels. If all
 * corners have alpha < 10, the logo is treated as transparent (no frame clip
 * should be applied).
 *
 * Returns:
 *   - `isHorizontal` — whether the image is landscape
 *   - `isTransparent` — whether the corners are transparent (only meaningful for squares)
 *   - `showName`     — whether to render the store name beside the logo (false for landscape)
 *   - `loaded`       — probe finished
 */
export function useLogoOrientation(logoUrl?: string) {
  const [state, setState] = useState<ProbeResult>(() => {
    if (logoUrl && cache.has(logoUrl)) return cache.get(logoUrl)!
    return { isHorizontal: false, isTransparent: false }
  })
  const [loaded, setLoaded] = useState(() => !!logoUrl && cache.has(logoUrl))

  useEffect(() => {
    if (!logoUrl) {
      setState({ isHorizontal: false, isTransparent: false })
      setLoaded(true)
      return
    }

    const cached = cache.get(logoUrl)
    if (cached) {
      setState(cached)
      setLoaded(true)
      return
    }

    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return

      const isHorizontal = img.naturalWidth > img.naturalHeight * 1.4

      // Probe corner alpha via canvas. Requires CORS-enabled image source.
      let isTransparent = false
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const w = canvas.width
          const h = canvas.height
          // Sample a small block at each corner (1x1 is too noisy with JPEG artifacts,
          // but inset by a few pixels handles faint edge gradients).
          const inset = Math.min(2, Math.floor(Math.min(w, h) * 0.02))
          const samples = [
            ctx.getImageData(inset, inset, 1, 1).data[3],
            ctx.getImageData(w - 1 - inset, inset, 1, 1).data[3],
            ctx.getImageData(inset, h - 1 - inset, 1, 1).data[3],
            ctx.getImageData(w - 1 - inset, h - 1 - inset, 1, 1).data[3],
          ]
          isTransparent = samples.every(a => a < 10)
        }
      } catch {
        // Tainted canvas (CORS) or other error — fall back to opaque. Logos hosted
        // on the same origin as the app, or on CORS-enabled Firebase Storage, work.
      }

      const result: ProbeResult = { isHorizontal, isTransparent }
      cache.set(logoUrl, result)
      setState(result)
      setLoaded(true)
    }

    img.onerror = () => {
      if (cancelled) return
      const result: ProbeResult = { isHorizontal: false, isTransparent: false }
      cache.set(logoUrl, result)
      setState(result)
      setLoaded(true)
    }

    img.src = logoUrl

    return () => { cancelled = true }
  }, [logoUrl])

  return {
    isHorizontal: state.isHorizontal,
    isTransparent: state.isTransparent,
    loaded,
    showName: !state.isHorizontal,
  }
}
