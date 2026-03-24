import { useState, useEffect } from 'react'

// Cache results globally so we don't re-load the same image across renders/themes
const cache = new Map<string, boolean>()

/**
 * Detects if a logo image is horizontal (wide) or square/vertical.
 * - Horizontal: width > height * 1.4
 * - Returns { isHorizontal, showName }
 *   - showName = false when logo is horizontal (the logo already contains the brand)
 *   - showName = true when logo is square/vertical or while loading
 */
export function useLogoOrientation(logoUrl?: string) {
  const [isHorizontal, setIsHorizontal] = useState(() => {
    if (logoUrl && cache.has(logoUrl)) return cache.get(logoUrl)!
    return false
  })
  const [loaded, setLoaded] = useState(() => {
    return !!logoUrl && cache.has(logoUrl)
  })

  useEffect(() => {
    if (!logoUrl) {
      setIsHorizontal(false)
      setLoaded(true)
      return
    }

    if (cache.has(logoUrl)) {
      setIsHorizontal(cache.get(logoUrl)!)
      setLoaded(true)
      return
    }

    const img = new Image()
    img.onload = () => {
      const horizontal = img.naturalWidth > img.naturalHeight * 1.4
      cache.set(logoUrl, horizontal)
      setIsHorizontal(horizontal)
      setLoaded(true)
    }
    img.onerror = () => {
      cache.set(logoUrl, false)
      setIsHorizontal(false)
      setLoaded(true)
    }
    img.src = logoUrl
  }, [logoUrl])

  return {
    isHorizontal,
    loaded,
    showName: !isHorizontal,
  }
}
