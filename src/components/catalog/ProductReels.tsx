import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
}

export default function ProductReels({ initialProduct, onClose, onAddToCart, onOpenDrawer }: ProductReelsProps) {
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

  // Direct DOM refs for 60fps drag (bypass React rendering)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const dragOffsetY = useRef(0)     // current drag offset in px
  const isSwiping = useRef(false)
  const isAnimatingRef = useRef(false)
  const pendingIndex = useRef<number | null>(null)
  const [, forceRender] = useState(0) // only to re-render after index change

  const currentProduct = products[currentIndex]
  const prevProduct = currentIndex > 0 ? products[currentIndex - 1] : null
  const nextProduct = currentIndex < products.length - 1 ? products[currentIndex + 1] : null

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

  // Preload adjacent images
  useEffect(() => {
    const toPreload = [nextProduct, prevProduct].filter(Boolean) as Product[]
    toPreload.forEach(p => {
      const url = p.image || p.images?.[0]
      if (url) {
        const img = new Image()
        img.src = optimizeImage(url, 'gallery')
      }
    })
  }, [nextProduct, prevProduct])

  // After CSS transition ends, commit the index change
  const handleTransitionEnd = useCallback(() => {
    if (pendingIndex.current !== null) {
      setCurrentIndex(pendingIndex.current)
      pendingIndex.current = null
    }
    dragOffsetY.current = 0
    isAnimatingRef.current = false
    applyTransform(0, false)
    forceRender(n => n + 1)
  }, [applyTransform])

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

  // Touch handlers — direct DOM manipulation, zero re-renders during drag
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimatingRef.current) return
    isSwiping.current = true
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    dragOffsetY.current = 0
    applyTransform(0, false)
  }, [applyTransform])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return
    const dy = e.touches[0].clientY - touchStartY.current

    // Rubber band at boundaries
    if ((currentIndex === 0 && dy > 0) || (currentIndex === products.length - 1 && dy < 0)) {
      dragOffsetY.current = dy * 0.25
    } else {
      dragOffsetY.current = dy
    }
    applyTransform(dragOffsetY.current, false)
  }, [currentIndex, products.length, applyTransform])

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) return
    isSwiping.current = false

    const dy = dragOffsetY.current
    const elapsed = Date.now() - touchStartTime.current
    const velocity = Math.abs(dy) / Math.max(elapsed, 1)
    const threshold = window.innerHeight * 0.15

    if (Math.abs(dy) > threshold || velocity > 0.4) {
      if (dy < 0 && currentIndex < products.length - 1) {
        animateTo(currentIndex + 1)
        return
      }
      if (dy > 0 && currentIndex > 0) {
        animateTo(currentIndex - 1)
        return
      }
    }
    // Snap back
    isAnimatingRef.current = true
    applyTransform(0, true)
  }, [currentIndex, products.length, animateTo, applyTransform])

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
        {/* Full-screen image */}
        <div className="relative w-full h-full overflow-hidden bg-black">
          {imageUrl ? (
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
            }}
          />

          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute top-16 left-4 px-3 py-1.5 text-sm font-bold rounded-full bg-red-500 text-white shadow-lg">
              -{discountPercent}%
            </div>
          )}

          {/* Product info */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-7">
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
    <div className="fixed inset-0 z-[70]" style={{ backgroundColor: '#000' }}>
      {/* Swipeable area */}
      <div
        className="relative w-full h-full mx-auto overflow-hidden"
        style={{ maxWidth: '480px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
      <div className="fixed top-0 left-0 right-0 z-[71] flex items-center justify-between p-4 pointer-events-none" style={{ maxWidth: '480px', margin: '0 auto' }}>
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
        <div className="fixed right-2 top-1/2 -translate-y-1/2 z-[71] flex flex-col gap-1 pointer-events-none" style={{ maxWidth: '480px' }}>
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
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-6 z-[71] flex-col gap-2">
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
