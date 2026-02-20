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

  // Scroll to products section after page change renders (classic pagination)
  useEffect(() => {
    if (type === 'classic' && shouldScrollRef.current) {
      shouldScrollRef.current = false
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const offset = 140
          const top = containerRef.current.getBoundingClientRect().top + window.scrollY - offset
          window.scrollTo({ top, behavior: 'smooth' })
        }
      })
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

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalItems))
        }
      },
      { rootMargin: '200px' }
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
