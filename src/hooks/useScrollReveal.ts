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

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
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
          setIsVisible(true)
          observerRef.current?.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(node)
  }, [enabled])

  if (!enabled) {
    return { ref, style: {} }
  }

  const style: CSSProperties = isVisible
    ? {
        opacity: 1,
        transform: 'translateY(0)',
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }
    : {
        opacity: 0,
        transform: 'translateY(20px)',
      }

  return { ref, style }
}
