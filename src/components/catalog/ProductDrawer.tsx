import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useTheme } from './ThemeContext'
import ProductGallery from '../../themes/shared/ProductGallery'
import { getThemeTranslations } from '../../themes/shared/translations'

interface ProductDrawerProps {
  product: Product
  onClose: () => void
  onAddToCart: (product: Product) => void
}

export default function ProductDrawer({ product, onClose, onAddToCart }: ProductDrawerProps) {
  const { theme, currency, language } = useTheme()
  const t = getThemeTranslations(language)

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.comparePrice!) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-[60] animate-fadeIn" onClick={onClose}>
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      />

      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
        style={{ backgroundColor: theme.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 backdrop-blur flex items-center justify-center transition-colors"
          style={{
            backgroundColor: theme.effects.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
            borderRadius: theme.radius.full,
            boxShadow: theme.shadows.lg
          }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: theme.colors.textMuted }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Image Gallery */}
          <div className="relative">
            <ProductGallery
              images={product.images?.length ? product.images : (product.image ? [product.image] : [])}
              productName={product.name}
              variant={theme.effects.darkMode ? 'dark' : 'light'}
            />

            {hasDiscount && (
              <div
                className="absolute top-4 left-4 z-10 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm shadow-sm"
                style={{
                  backgroundColor: theme.colors.badge,
                  color: theme.colors.badgeText,
                  borderRadius: theme.radius.full
                }}
              >
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <h2
              className="text-2xl font-semibold mb-2"
              style={{ color: theme.colors.text }}
            >
              {product.name}
            </h2>

            {product.description && (
              <p
                className="leading-relaxed mb-6"
                style={{ color: theme.colors.textMuted }}
              >
                {product.description}
              </p>
            )}

            <div className="flex items-baseline gap-3">
              <span
                className="text-3xl font-semibold"
                style={{ color: theme.colors.text }}
              >
                {formatPrice(product.price, currency)}
              </span>
              {hasDiscount && (
                <span
                  className="text-xl line-through"
                  style={{ color: theme.colors.textMuted }}
                >
                  {formatPrice(product.comparePrice!, currency)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Add Button */}
        <div
          className="p-6"
          style={{ borderTop: `1px solid ${theme.colors.border}` }}
        >
          <button
            onClick={() => {
              onAddToCart(product)
              onClose()
            }}
            className="w-full py-4 font-medium transition-all active:scale-[0.98]"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.textInverted,
              borderRadius: theme.radius.lg
            }}
          >
            {t.addToCart}
          </button>
        </div>
      </div>
    </div>
  )
}
