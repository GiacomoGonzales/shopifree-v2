import { useState, useEffect, useRef, useCallback } from 'react'

type PaginationType = 'none' | 'load-more' | 'infinite-scroll' | 'classic'

const PAGE_SIZE = 12

interface UsePaginationOptions<T> {
  items: T[]
  type: PaginationType
}

interface UsePaginationResult<T> {
  displayedItems: T[]
  currentPage: number
  totalPages: number
  hasMore: boolean
  totalItems: number
  goToPage: (page: number) => void
  loadMore: () => void
  sentinelRef: (node: HTMLDivElement | null) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function usePagination<T>({ items, type }: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Reset when items change (category switch)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setCurrentPage(1)
  }, [items])

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

  // Compute displayed items based on type
  let displayedItems: T[]
  let hasMore: boolean

  if (type === 'none') {
    displayedItems = items
    hasMore = false
  } else if (type === 'load-more' || type === 'infinite-scroll') {
    displayedItems = items.slice(0, visibleCount)
    hasMore = visibleCount < totalItems
  } else {
    // classic
    const start = (currentPage - 1) * PAGE_SIZE
    displayedItems = items.slice(start, start + PAGE_SIZE)
    hasMore = currentPage < totalPages
  }

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalItems))
  }, [totalItems])

  const shouldScrollRef = useRef(false)

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(clamped)
    shouldScrollRef.current = true
  }, [totalPages])

  // Scroll to products section after page change renders (classic pagination).
  // We walk up the DOM from the products container to find the *actual* scroll
  // parent — a plain window.scrollTo doesn't help when the catalog renders
  // inside a fullscreen ThemePreviewModal (its own overflow:auto wrapper) or
  // inside the native app's #root container. Double rAF lets the new page lay
  // out before we measure.
  useEffect(() => {
    if (type !== 'classic' || !shouldScrollRef.current) return
    shouldScrollRef.current = false

    const findScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let parent: HTMLElement | null = node?.parentElement ?? null
      while (parent && parent !== document.body && parent !== document.documentElement) {
        const style = window.getComputedStyle(parent)
        const overflowY = style.overflowY
        if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
          return parent
        }
        parent = parent.parentElement
      }
      return window
    }

    const doScroll = () => {
      const offset = 100 // clearance for sticky header + category nav
      const node = containerRef.current
      if (!node) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      const scrollParent = findScrollParent(node)
      const rect = node.getBoundingClientRect()

      if (scrollParent === window) {
        const top = rect.top + window.scrollY - offset
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      } else {
        const el = scrollParent as HTMLElement
        const elRect = el.getBoundingClientRect()
        const top = rect.top - elRect.top + el.scrollTop - offset
        el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }
    }

    // Wait two frames so the new page's items have rendered and the layout
    // is stable before we measure container position.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(doScroll)
      ;(window as unknown as { __pgRaf2?: number }).__pgRaf2 = raf2
    })
    return () => {
      cancelAnimationFrame(raf1)
      const raf2 = (window as unknown as { __pgRaf2?: number }).__pgRaf2
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [currentPage, type])

  // IntersectionObserver for infinite-scroll
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    sentinelNodeRef.current = node

    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (type !== 'infinite-scroll' || !node) return

    // In native app, #root is the scroll container, so use it as observer root
    const nativeRoot = document.body.classList.contains('native-app')
      ? document.getElementById('root')
      : null

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalItems))
        }
      },
      { root: nativeRoot, rootMargin: '200px' }
    )
    observerRef.current.observe(node)
  }, [type, totalItems])

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return {
    displayedItems,
    currentPage,
    totalPages,
    hasMore,
    totalItems,
    goToPage,
    loadMore,
    sentinelRef,
    containerRef,
  }
}
