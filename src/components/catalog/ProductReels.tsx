import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { optimizeImage } from '../../utils/cloudinary'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import { getCatalogProducts } from './catalogProducts'
import type { CartItemExtras } from './ProductDrawer'

interface ProductReelsProps {
  initialProduct: Product
  onClose: () => void
  onAddToCart: (product: Product, extras?: CartItemExtras) => void
  onOpenDrawer?: (product: Product) => void
  onProductChange?: (product: Product) => void
}

export default function ProductReels({ initialProduct, onClose, onAddToCart, onOpenDrawer, onProductChange }: ProductReelsProps) {
  const { theme, currency, language } = useTheme()
  const t = getThemeTranslations(language)

  const products = useMemo(() => {
    const catalog = getCatalogProducts()
    return catalog.length > 0 ? catalog : [initialProduct]
  }, [initialProduct])

  const initialIndex = useMemo(() => {
    const idx = products.findIndex(p => p.id === initialProduct.id)
    return idx >= 0 ? idx : 0
  }, [products, initialProduct.id])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [toast, setToast] = useState<string | null>(null)
  const [holding, setHolding] = useState(false)

  // Video refs
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  // Long-press refs
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdTriggeredRef = useRef(false)

  // Direct DOM refs for 60fps drag (bypass React rendering)
  const rootRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const dragOffsetX = useRef(0)     // horizontal drag offset in px
  const dragOffsetY = useRef(0)     // vertical drag offset in px
  const swipeAxis = useRef<'x' | 'y' | null>(null)
  const isSwiping = useRef(false)
  const isAnimatingRef = useRef(false)
  const isDismissing = useRef(false)
  const pendingIndex = useRef<number | null>(null)
  const currentProduct = products[currentIndex]
  const prevProduct = currentIndex > 0 ? products[currentIndex - 1] : null
  const nextProduct = currentIndex < products.length - 1 ? products[currentIndex + 1] : null

  // Notify parent of current product (for position tracking)
  useEffect(() => {
    onProductChange?.(currentProduct)
  }, [currentIndex])

  // Apply transform directly to DOM (no React re-render)
  const applyTransform = useCallback((y: number, withTransition: boolean) => {
    const el = wrapperRef.current
    if (!el) return
    el.style.transition = withTransition ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
    el.style.transform = `translateY(${y}px)`
  }, [])

  // Lock body scroll
  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Preload adjacent images (skip products with video — browser handles video buffering)
  useEffect(() => {
    const toPreload = [nextProduct, prevProduct].filter(Boolean) as Product[]
    toPreload.forEach(p => {
      if (p.video) return
      const url = p.image || p.images?.[0]
      if (url) {
        const img = new Image()
        img.src = optimizeImage(url, 'gallery')
      }
    })
  }, [nextProduct, prevProduct])

  // Play/pause videos on slide change
  useEffect(() => {
    videoRefs.current.forEach((v, key) => {
      if (!key.endsWith('-current')) {
        v.pause()
      }
    })
    const currentVideo = videoRefs.current.get(`${currentProduct.id}-current`)
    if (currentVideo) {
      currentVideo.currentTime = 0
      currentVideo.play().catch(() => {})
    }
  }, [currentIndex, currentProduct.id])

  // After CSS transition ends, commit the index change (but don't reset transform yet)
  const needsTransformReset = useRef(false)

  const handleTransitionEnd = useCallback(() => {
    if (pendingIndex.current !== null) {
      needsTransformReset.current = true
      setCurrentIndex(pendingIndex.current)
      pendingIndex.current = null
    } else {
      // Snap-back case (no index change), safe to reset immediately
      dragOffsetY.current = 0
      isAnimatingRef.current = false
      applyTransform(0, false)
    }
  }, [applyTransform])

  // Reset transform AFTER React re-renders with new slides (before browser paint)
  useLayoutEffect(() => {
    if (needsTransformReset.current) {
      needsTransformReset.current = false
      dragOffsetY.current = 0
      isAnimatingRef.current = false
      applyTransform(0, false)
    }
  }, [currentIndex, applyTransform])

  // Animate to a target slide
  const animateTo = useCallback((targetIndex: number) => {
    isAnimatingRef.current = true
    if (targetIndex === currentIndex) {
      applyTransform(0, true)
      return
    }
    const direction = targetIndex > currentIndex ? -1 : 1
    pendingIndex.current = targetIndex
    applyTransform(direction * window.innerHeight, true)
  }, [currentIndex, applyTransform])

  // Navigation helpers
  const goToNext = useCallback(() => {
    if (isAnimatingRef.current) return
    if (currentIndex < products.length - 1) {
      animateTo(currentIndex + 1)
    }
  }, [currentIndex, products.length, animateTo])

  const goToPrev = useCallback(() => {
    if (isAnimatingRef.current) return
    if (currentIndex > 0) {
      animateTo(currentIndex - 1)
    }
  }, [currentIndex, animateTo])

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowUp') { e.preventDefault(); goToPrev() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); goToNext() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNext, goToPrev, onClose])

  // Refs for values needed in native touch handlers (avoid stale closures)
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex
  const productsLengthRef = useRef(products.length)
  productsLengthRef.current = products.length
  const animateToRef = useRef(animateTo)
  animateToRef.current = animateTo
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Container ref for native event listeners
  const containerRef = useRef<HTMLDivElement>(null)

  // Native touch handlers — { passive: false } allows preventDefault to block pull-to-refresh
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const clearHoldTimer = () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
    }

    // Apply horizontal dismiss transform directly to root DOM element
    const applyDismissTransform = (dx: number, withTransition: boolean) => {
      const root = rootRef.current
      if (!root) return
      const progress = Math.min(Math.abs(dx) / window.innerWidth, 1)
      const scale = 1 - progress * 0.08
      const opacity = 1 - progress * 0.5
      const radius = progress * 24
      root.style.transition = withTransition
        ? 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease, border-radius 0.35s ease'
        : 'none'
      root.style.transform = dx === 0 && !withTransition ? '' : `translateX(${dx}px) scale(${scale})`
      root.style.opacity = String(opacity)
      root.style.borderRadius = `${radius}px`
    }

    const resetDismissTransform = (withTransition: boolean) => {
      const root = rootRef.current
      if (!root) return
      if (withTransition) {
        root.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease, border-radius 0.35s ease'
      } else {
        root.style.transition = 'none'
      }
      root.style.transform = ''
      root.style.opacity = '1'
      root.style.borderRadius = '0px'
    }

    const onTouchStart = (e: TouchEvent) => {
      if (isAnimatingRef.current || isDismissing.current) return
      isSwiping.current = true
      holdTriggeredRef.current = false
      swipeAxis.current = null
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      touchStartTime.current = Date.now()
      dragOffsetX.current = 0
      dragOffsetY.current = 0
      applyTransform(0, false)

      // Start long-press timer (400ms)
      clearHoldTimer()
      holdTimerRef.current = setTimeout(() => {
        holdTriggeredRef.current = true
        setHolding(true)
      }, 400)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current) return
      e.preventDefault() // Block browser pull-to-refresh / overscroll

      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current

      // Cancel long-press if finger moved
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearHoldTimer()
      }

      // If holding (long-press active), don't process swipe
      if (holdTriggeredRef.current) return

      // Lock axis after 10px of movement
      if (!swipeAxis.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        swipeAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }

      if (swipeAxis.current === 'x') {
        // Horizontal dismiss drag
        dragOffsetX.current = dx
        applyDismissTransform(dx, false)
        return
      }

      if (swipeAxis.current !== 'y') return

      // Vertical swipe (existing logic)
      const idx = currentIndexRef.current
      const len = productsLengthRef.current

      // Rubber band at boundaries
      if ((idx === 0 && dy > 0) || (idx === len - 1 && dy < 0)) {
        dragOffsetY.current = dy * 0.25
      } else {
        dragOffsetY.current = dy
      }
      applyTransform(dragOffsetY.current, false)
    }

    const onTouchEnd = () => {
      clearHoldTimer()

      // If was holding, just release — don't process as swipe
      if (holdTriggeredRef.current) {
        holdTriggeredRef.current = false
        isSwiping.current = false
        swipeAxis.current = null
        setHolding(false)
        return
      }

      if (!isSwiping.current) return
      isSwiping.current = false

      const axis = swipeAxis.current
      swipeAxis.current = null

      // --- Horizontal dismiss ---
      if (axis === 'x') {
        const dx = dragOffsetX.current
        const elapsed = Date.now() - touchStartTime.current
        const velocity = Math.abs(dx) / Math.max(elapsed, 1)
        const threshold = window.innerWidth * 0.25

        if (Math.abs(dx) > threshold || velocity > 0.5) {
          // Dismiss — animate off screen
          isDismissing.current = true
          const direction = dx > 0 ? 1 : -1
          const root = rootRef.current
          if (root) {
            root.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease'
            root.style.transform = `translateX(${direction * window.innerWidth}px) scale(0.85)`
            root.style.opacity = '0'
          }
          setTimeout(() => onCloseRef.current(), 300)
        } else if (Math.abs(dx) < 1) {
          resetDismissTransform(false)
        } else {
          // Snap back
          resetDismissTransform(true)
        }
        return
      }

      // --- Vertical swipe ---
      const dy = dragOffsetY.current
      const elapsed = Date.now() - touchStartTime.current
      const velocity = Math.abs(dy) / Math.max(elapsed, 1)
      const threshold = window.innerHeight * 0.15
      const idx = currentIndexRef.current
      const len = productsLengthRef.current

      if (Math.abs(dy) > threshold || velocity > 0.4) {
        if (dy < 0 && idx < len - 1) {
          animateToRef.current(idx + 1)
          return
        }
        if (dy > 0 && idx > 0) {
          animateToRef.current(idx - 1)
          return
        }
      }
      // Snap back
      if (Math.abs(dy) < 1) {
        // No meaningful drag (tap) — skip animation since transitionend won't fire
        dragOffsetY.current = 0
        isAnimatingRef.current = false
        applyTransform(0, false)
      } else {
        isAnimatingRef.current = true
        applyTransform(0, true)
      }
    }

    // Block native context menu (long-press "save image" popup)
    const onContextMenu = (e: Event) => e.preventDefault()

    // touchcancel fires if browser intercepts the touch — reset holding
    const onTouchCancel = () => {
      clearHoldTimer()
      if (holdTriggeredRef.current) {
        holdTriggeredRef.current = false
        setHolding(false)
      }
      isSwiping.current = false
      if (swipeAxis.current === 'x') {
        resetDismissTransform(true)
      }
      swipeAxis.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })
    el.addEventListener('contextmenu', onContextMenu)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
      el.removeEventListener('contextmenu', onContextMenu)
    }
  }, [applyTransform])

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 1500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleAddToCart = (product: Product) => {
    const extras: CartItemExtras = { itemPrice: product.price }
    onAddToCart(product, extras)
    setToast(t.addedToCart)
  }

  const getProductImage = (product: Product) => {
    return product.image || (product.images?.length ? product.images[0] : '')
  }

  const renderSlide = (product: Product, position: 'prev' | 'current' | 'next') => {
    const hasDiscount = product.comparePrice && product.comparePrice > product.price
    const discountPercent = hasDiscount
      ? Math.round((1 - product.price / product.comparePrice!) * 100)
      : 0
    const imageUrl = getProductImage(product)
    const yOffset = position === 'prev' ? '-100%' : position === 'next' ? '100%' : '0%'

    return (
      <div
        key={`${product.id}-${position}`}
        className="absolute inset-0"
        style={{
          transform: `translateY(${yOffset})`,
        }}
      >
        {/* Full-screen media */}
        <div className="relative w-full h-full overflow-hidden bg-black">
          {product.video ? (
            <video
              ref={(el) => {
                const key = `${product.id}-${position}`
                if (el) {
                  videoRefs.current.set(key, el)
                } else {
                  videoRefs.current.delete(key)
                }
              }}
              src={product.video}
              autoPlay={position === 'current'}
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              poster={imageUrl ? optimizeImage(imageUrl, 'gallery') : undefined}
            />
          ) : imageUrl ? (
            <img
              src={optimizeImage(imageUrl, 'gallery')}
              alt={product.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Bottom gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '50%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
              opacity: holding ? 0 : 1,
              transition: 'opacity 0.25s ease',
            }}
          />

          {/* Discount badge */}
          {hasDiscount && (
            <div
              className="absolute top-16 left-4 px-3 py-1.5 text-sm font-bold rounded-full bg-red-500 text-white shadow-lg"
              style={{ opacity: holding ? 0 : 1, transition: 'opacity 0.25s ease' }}
            >
              -{discountPercent}%
            </div>
          )}

          {/* Product info */}
          <div
            className="absolute bottom-0 left-0 right-0 p-5 pb-7"
            style={{ opacity: holding ? 0 : 1, transition: 'opacity 0.25s ease' }}
          >
            <h2 className="text-xl font-bold text-white mb-1.5 drop-shadow-lg leading-tight">
              {product.name}
            </h2>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-white drop-shadow-lg">
                {formatPrice(product.price, currency)}
              </span>
              {hasDiscount && (
                <span className="text-base line-through text-white/60">
                  {formatPrice(product.comparePrice!, currency)}
                </span>
              )}
            </div>

            {(product.shortDescription || product.description) && (
              <p className="text-sm text-white/75 line-clamp-2 mb-4 leading-relaxed">
                {product.shortDescription || product.description}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleAddToCart(product)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm transition-all active:scale-[0.96]"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.textInverted,
                }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t.addToCart}
              </button>
              <button
                onClick={() => onOpenDrawer?.(product)}
                className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold text-sm transition-all active:scale-[0.96]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {t.viewDetails}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="fixed inset-0 z-[70] overflow-hidden" style={{ backgroundColor: '#000' }}>
      {/* Swipeable area */}
      <div
        ref={containerRef}
        className="relative w-full h-full mx-auto overflow-hidden"
        style={{
          maxWidth: '480px',
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        } as React.CSSProperties}
      >
        {/* All slides move together — transform set via ref for 60fps */}
        <div
          ref={wrapperRef}
          className="relative w-full h-full"
          style={{ willChange: 'transform' }}
          onTransitionEnd={handleTransitionEnd}
        >
          {prevProduct && renderSlide(prevProduct, 'prev')}
          {renderSlide(currentProduct, 'current')}
          {nextProduct && renderSlide(nextProduct, 'next')}
        </div>
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-[71] flex items-center justify-between p-4 pointer-events-none" style={{ maxWidth: '480px', margin: '0 auto', opacity: holding ? 0 : 1, transition: 'opacity 0.25s ease' }}>
        <button
          onClick={onClose}
          className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="pointer-events-none px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 tracking-wide"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          {t.productCounter.replace('{{current}}', String(currentIndex + 1)).replace('{{total}}', String(products.length))}
        </div>
      </div>

      {/* Progress dots (right side, vertical) */}
      {products.length > 1 && products.length <= 20 && (
        <div className="fixed right-2 top-1/2 -translate-y-1/2 z-[71] flex flex-col gap-1 pointer-events-none" style={{ maxWidth: '480px', opacity: holding ? 0 : 1, transition: 'opacity 0.25s ease' }}>
          {products.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? '3px' : '3px',
                height: i === currentIndex ? '16px' : '6px',
                backgroundColor: i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      )}

      {/* Desktop arrows */}
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-6 z-[71] flex-col gap-2" style={{ opacity: holding ? 0 : 1, transition: 'opacity 0.25s ease' }}>
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-20"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === products.length - 1}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-20"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[72] px-5 py-2.5 rounded-full text-sm font-medium text-white animate-slideUp"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
