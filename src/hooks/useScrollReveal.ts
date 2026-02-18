import { useRef, useState, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'

interface ScrollRevealResult {
  ref: (node: HTMLElement | null) => void
  style: CSSProperties
}

export function useScrollReveal(enabled: boolean, delay: number = 0): ScrollRevealResult {
  const [isVisible, setIsVisible] = useState(!enabled)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const nodeRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const ref = useCallback((node: HTMLElement | null) => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    if (!enabled || !node) {
      nodeRef.current = null
      return
    }

    nodeRef.current = node

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observerRef.current?.unobserve(entry.target)

          // Delay based on Y position in viewport: items near the top animate
          // first, items near the bottom animate later. This prevents the
          // "out of order" pop-in when scrolling fast.
          const vh = window.innerHeight
          const top = entry.boundingClientRect.top
          const positionRatio = Math.max(0, Math.min(top / vh, 1))
          const verticalDelay = positionRatio * 250
          const totalDelay = verticalDelay + delay

          timerRef.current = setTimeout(() => setIsVisible(true), totalDelay)
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(node)
  }, [enabled, delay])

  if (!enabled) {
    return { ref, style: {} }
  }

  const style: CSSProperties = isVisible
    ? {
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
      }
    : {
        opacity: 0,
        transform: 'translateY(20px)',
      }

  return { ref, style }
}
