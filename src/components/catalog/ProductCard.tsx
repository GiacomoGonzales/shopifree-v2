import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { optimizeImage } from '../../utils/cloudinary'
import { useTheme } from './ThemeContext'
import { useBusinessType } from '../../hooks/useBusinessType'
import { PrepTimeDisplay, DurationDisplay, AvailabilityBadge } from './business-type'

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
  onQuickAdd: (product: Product) => void
}

export default function ProductCard({ product, onSelect, onQuickAdd }: ProductCardProps) {
  const { theme, currency, language } = useTheme()
  const { features } = useBusinessType()

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.comparePrice!) * 100)
    : 0

  // Determine if product requires selection (hide quick-add)
  const requiresSelection = (features.showModifiers && product.modifierGroups?.length) ||
                            (features.showVariants && product.variations?.length)

  return (
    <article
      className="group cursor-pointer"
      onClick={() => onSelect(product)}
    >
      {/* Image */}
      <div
        className="relative aspect-[4/5] mb-4 overflow-hidden"
        style={{
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceHover
        }}
      >
        {product.image ? (
          <img
            src={optimizeImage(product.image, 'card')}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:${theme.effects.cardHover}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
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
        {features.showLimitedStock && product.availableQuantity !== undefined && product.availableQuantity <= 10 && (
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
}
