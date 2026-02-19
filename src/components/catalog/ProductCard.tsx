import { useCallback, useRef } from 'react'
import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { optimizeImage } from '../../utils/cloudinary'
import { useTheme } from './ThemeContext'
import { useBusinessType } from '../../hooks/useBusinessType'
import { PrepTimeDisplay, DurationDisplay, AvailabilityBadge } from './business-type'

export type ProductCardVariant = 'default' | 'masonry' | 'horizontal' | 'featured'

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
  onQuickAdd: (product: Product) => void
  variant?: ProductCardVariant
}

export default function ProductCard({ product, onSelect, onQuickAdd, variant = 'default' }: ProductCardProps) {
  const { theme, currency, language, store } = useTheme()
  const { features } = useBusinessType()

  // Preload gallery image on hover/touch for faster modal opening
  const preloadGalleryImages = useCallback(() => {
    if (product.image) {
      const img = new Image()
      img.src = optimizeImage(product.image, 'gallery')
    }
    if (product.images?.length) {
      product.images.forEach(imgUrl => {
        const img = new Image()
        img.src = optimizeImage(imgUrl, 'gallery')
      })
    }
  }, [product.image, product.images])

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.comparePrice!) * 100)
    : 0

  // Determine if product requires selection (hide quick-add)
  const requiresSelection = (features.showModifiers && product.modifierGroups?.length) ||
                            (features.showVariants && product.variations?.length)

  // Horizontal variant: image left, info right
  if (variant === 'horizontal') {
    return (
      <article
        className="group cursor-pointer flex gap-4"
        onClick={() => onSelect(product)}
        onMouseEnter={preloadGalleryImages}
        onTouchStart={preloadGalleryImages}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadows.sm,
        }}
      >
        {/* Image */}
        <div
          className="relative w-[140px] sm:w-[180px] flex-shrink-0 overflow-hidden"
          style={{
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surfaceHover,
          }}
        >
          {product.image ? (
            <img
              src={optimizeImage(product.image, 'card')}
              alt={product.name}
              className={`w-full h-full object-cover aspect-square transition-transform duration-700 ease-out group-hover:${theme.effects.cardHover}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center">
              <svg className="w-10 h-10" style={{ color: theme.colors.border }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {hasDiscount && (
            <div
              className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm shadow-sm"
              style={{
                backgroundColor: theme.colors.badge,
                color: theme.colors.badgeText,
                borderRadius: theme.radius.full,
              }}
            >
              -{discountPercent}%
            </div>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 py-3 pr-3 flex flex-col justify-center min-w-0">
          <h3 className="font-medium line-clamp-2 leading-snug mb-1" style={{ color: theme.colors.text }}>
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="text-sm line-clamp-2 mb-2" style={{ color: theme.colors.textMuted }}>
              {product.shortDescription}
            </p>
          )}
          <div className="flex items-baseline gap-2">
            <span className="font-semibold" style={{ color: theme.colors.text }}>
              {formatPrice(product.price, currency)}
            </span>
            {hasDiscount && (
              <span className="text-sm line-through" style={{ color: theme.colors.textMuted }}>
                {formatPrice(product.comparePrice!, currency)}
              </span>
            )}
          </div>
          {features.showPrepTime && product.prepTime && (
            <div className="mt-1.5"><PrepTimeDisplay prepTime={product.prepTime} language={language} /></div>
          )}
        </div>
      </article>
    )
  }

  const aspectClass = variant === 'masonry' ? '' : variant === 'featured' ? 'aspect-[3/4]' : 'aspect-[4/5]'

  // Premium effects - use refs for direct DOM manipulation (no React re-renders)
  const hasTilt = theme.effects.tilt3D ?? false
  const hasGlass = theme.effects.glassMorphism ?? false
  const hasBorder = theme.effects.animatedBorder ?? false
  const cardRef = useRef<HTMLElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!hasTilt || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    cardRef.current.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) scale(1.02)`
    cardRef.current.style.transition = 'transform 0.15s ease-out'
  }, [hasTilt])

  const handleMouseLeave = useCallback(() => {
    if (!hasTilt || !cardRef.current) return
    cardRef.current.style.transform = ''
    cardRef.current.style.transition = 'transform 0.4s ease-out'
    preloadGalleryImages()
  }, [hasTilt, preloadGalleryImages])

  // Glass effect: lightweight semi-transparent bg, NO backdrop-blur on cards (too expensive per-card)
  const glassStyle: React.CSSProperties = hasGlass ? {
    backgroundColor: theme.effects.darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
    border: `1px solid ${theme.effects.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)'}`,
    borderRadius: theme.radius.lg,
    padding: '6px',
  } : {}

  const card = (
    <article
      ref={cardRef}
      className="group cursor-pointer"
      onClick={() => onSelect(product)}
      onMouseEnter={hasTilt ? undefined : preloadGalleryImages}
      onTouchStart={preloadGalleryImages}
      onMouseMove={hasTilt ? handleMouseMove : undefined}
      onMouseLeave={hasTilt ? handleMouseLeave : undefined}
      style={{
        ...(hasGlass ? glassStyle : {}),
        willChange: hasTilt ? 'transform' : undefined,
      }}
    >
      {/* Image */}
      <div
        className={`relative ${aspectClass} mb-4 overflow-hidden`}
        style={{
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceHover
        }}
      >
        {product.image ? (
          variant === 'masonry' ? (
            <img
              src={optimizeImage(product.image, 'card')}
              alt={product.name}
              className={`w-full object-cover transition-transform duration-700 ease-out group-hover:${theme.effects.cardHover}`}
              loading="lazy"
            />
          ) : theme.effects.imageSwapOnHover && product.images?.[0] ? (
            <>
              <img
                src={optimizeImage(product.image, 'card')}
                alt={product.name}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out group-hover:opacity-0 group-hover:${theme.effects.cardHover}`}
                loading="lazy"
              />
              <img
                src={optimizeImage(product.images[0], 'card')}
                alt={`${product.name} - 2`}
                className={`absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:${theme.effects.cardHover}`}
                loading="lazy"
              />
            </>
          ) : (
            <img
              src={optimizeImage(product.image, 'card')}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:${theme.effects.cardHover}`}
              loading="lazy"
            />
          )
        ) : (
          <div className={`w-full ${variant === 'masonry' ? 'aspect-[4/5]' : 'h-full'} flex items-center justify-center`}>
            <svg
              className="w-12 h-12"
              style={{ color: theme.colors.border }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
          {/* Discount Badge */}
          {hasDiscount && (
            <div
              className="px-2.5 py-1 text-xs font-semibold backdrop-blur-sm shadow-sm"
              style={{
                backgroundColor: theme.colors.badge,
                color: theme.colors.badgeText,
                borderRadius: theme.radius.full
              }}
            >
              -{discountPercent}%
            </div>
          )}

          {/* Prep Time Badge (Food) */}
          {features.showPrepTime && product.prepTime && (
            <PrepTimeDisplay prepTime={product.prepTime} language={language} />
          )}

          {/* Duration Badge (Beauty) */}
          {features.showServiceDuration && product.duration && (
            <DurationDisplay duration={product.duration} language={language} />
          )}
        </div>

        {/* Bottom Left Badge - Limited Stock */}
        {(features.showLimitedStock || store.plan !== 'free') && product.availableQuantity !== undefined && product.availableQuantity <= 10 && (
          <div className="absolute bottom-3 left-3">
            <AvailabilityBadge quantity={product.availableQuantity} language={language} />
          </div>
        )}

        {/* Quick Add Button - Hidden when requires selection */}
        {!requiresSelection && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickAdd(product)
            }}
            className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.full,
              boxShadow: theme.shadows.lg
            }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: theme.colors.text }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {/* "Select Options" indicator when requires selection */}
        {requiresSelection && (
          <div
            className="absolute bottom-3 right-3 px-2.5 py-1 text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
            style={{
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderRadius: theme.radius.full,
              boxShadow: theme.shadows.md
            }}
          >
            {language === 'en' ? 'Options' : language === 'pt' ? 'Opcoes' : 'Opciones'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h3
          className="font-medium line-clamp-2 leading-snug transition-colors"
          style={{ color: theme.colors.text }}
        >
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span
            className="font-semibold"
            style={{ color: theme.colors.text }}
          >
            {formatPrice(product.price, currency)}
          </span>
          {hasDiscount && (
            <span
              className="text-sm line-through"
              style={{ color: theme.colors.textMuted }}
            >
              {formatPrice(product.comparePrice!, currency)}
            </span>
          )}
        </div>
      </div>
    </article>
  )

  // Wrap with animated border if enabled (hover-only animation for performance)
  if (hasBorder) {
    return (
      <div
        className="group/border"
        style={{
          background: `linear-gradient(90deg, ${theme.colors.primary}40, ${theme.colors.accent}40)`,
          padding: '1px',
          borderRadius: theme.radius.lg,
          transition: 'padding 0.3s ease',
        }}
      >
        <style>{`
          .group\\/border:hover { padding: 2px; background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent}, ${theme.colors.primary}) !important; background-size: 200% 100% !important; animation: premiumBorderShift 3s ease infinite !important; }
        `}</style>
        <div style={{ borderRadius: theme.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.background }}>
          {card}
        </div>
      </div>
    )
  }

  return card
}
