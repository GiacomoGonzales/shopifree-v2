import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { optimizeImage } from '../../utils/cloudinary'
import { useTheme } from './ThemeContext'
import { useBusinessType } from '../../hooks/useBusinessType'
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
  const { features } = useBusinessType()
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

  // Swipe state
  const [deltaY, setDeltaY] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentProduct = products[currentIndex]
  const prevProduct = currentIndex > 0 ? products[currentIndex - 1] : null
  const nextProduct = currentIndex < products.length - 1 ? products[currentIndex + 1] : null

  // Check if product requires selection (variants/modifiers)
  const requiresSelection = (product: Product) => {
    return (features.showModifiers && (product.modifierGroups?.length ?? 0) > 0) ||
           (features.showVariants && (product.variations?.length ?? 0) > 0)
  }

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

  // Preload next image
  useEffect(() => {
    if (nextProduct?.image) {
      const img = new Image()
      img.src = optimizeImage(nextProduct.image, 'gallery')
    }
  }, [nextProduct])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrev()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        goToNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, products.length])

  const goToNext = useCallback(() => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, products.length])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    setIsSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return
    const currentY = e.touches[0].clientY
    const dy = currentY - touchStartY.current

    // Limit overscroll at boundaries
    if ((currentIndex === 0 && dy > 0) || (currentIndex === products.length - 1 && dy < 0)) {
      setDeltaY(dy * 0.3) // Rubber band effect
    } else {
      setDeltaY(dy)
    }
  }, [isSwiping, currentIndex, products.length])

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false)
    const elapsed = Date.now() - touchStartTime.current
    const velocity = Math.abs(deltaY) / elapsed

    if (Math.abs(deltaY) > 80 || velocity > 0.5) {
      if (deltaY < 0) {
        goToNext()
      } else {
        goToPrev()
      }
    }
    setDeltaY(0)
  }, [deltaY, goToNext, goToPrev])

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

  const handleViewDetails = (product: Product) => {
    if (onOpenDrawer) {
      onOpenDrawer(product)
    }
  }

  const getProductImage = (product: Product) => {
    return product.image || (product.images?.length ? product.images[0] : '')
  }

  const renderSlide = (product: Product, offset: number) => {
    const hasDiscount = product.comparePrice && product.comparePrice > product.price
    const discountPercent = hasDiscount
      ? Math.round((1 - product.price / product.comparePrice!) * 100)
      : 0
    const imageUrl = getProductImage(product)

    return (
      <div
        key={product.id}
        className="absolute inset-0 flex flex-col"
        style={{
          transform: `translateY(${offset * 100}%)`,
          willChange: 'transform',
        }}
      >
        {/* Image area */}
        <div className="relative flex-1 overflow-hidden bg-black">
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

          {/* Gradient overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '55%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
            }}
          />

          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute top-16 left-4 px-3 py-1.5 text-sm font-bold rounded-full bg-red-500 text-white">
              -{discountPercent}%
            </div>
          )}

          {/* Product info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
            <h2 className="text-xl font-bold text-white mb-1 drop-shadow-lg leading-tight">
              {product.name}
            </h2>

            {/* Price */}
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

            {/* Short description */}
            {(product.shortDescription || product.description) && (
              <p className="text-sm text-white/80 line-clamp-2 mb-4 drop-shadow">
                {product.shortDescription || product.description}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {!requiresSelection(product) ? (
                <button
                  onClick={() => handleAddToCart(product)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.textInverted,
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {t.addToCart}
                </button>
              ) : (
                <button
                  onClick={() => handleAddToCart(product)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.textInverted,
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {t.addToCart}
                </button>
              )}
              <button
                onClick={() => handleViewDetails(product)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all active:scale-[0.97] backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
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
    <div className="fixed inset-0 z-[70] animate-fadeIn" style={{ backgroundColor: '#000' }}>
      {/* Container for swipe */}
      <div
        ref={containerRef}
        className="relative w-full h-full mx-auto overflow-hidden"
        style={{ maxWidth: '480px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides wrapper */}
        <div
          className="relative w-full h-full"
          style={{
            transform: `translateY(${deltaY}px)`,
            transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
            willChange: 'transform',
          }}
        >
          {prevProduct && renderSlide(prevProduct, -1)}
          {renderSlide(currentProduct, 0)}
          {nextProduct && renderSlide(nextProduct, 1)}
        </div>
      </div>

      {/* Header overlay */}
      <div className="fixed top-0 left-0 right-0 z-[71] flex items-center justify-between p-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-colors"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Counter */}
        <div className="px-3 py-1.5 rounded-full text-sm font-medium text-white backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          {t.productCounter.replace('{{current}}', String(currentIndex + 1)).replace('{{total}}', String(products.length))}
        </div>
      </div>

      {/* Desktop arrows */}
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-4 z-[71] flex-col gap-3" style={{ maxWidth: '480px' }}>
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-all disabled:opacity-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === products.length - 1}
          className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-all disabled:opacity-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[72] px-5 py-2.5 rounded-full text-sm font-medium text-white backdrop-blur-md animate-slideUp"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
