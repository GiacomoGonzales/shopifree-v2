import type { CartItem } from '../../hooks/useCart'
import { formatPrice } from '../../lib/currency'
import { optimizeImage } from '../../utils/cloudinary'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'

interface CartDrawerProps {
  items: CartItem[]
  totalPrice: number
  onClose: () => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  onCheckout: () => void
}

export default function CartDrawer({
  items,
  totalPrice,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}: CartDrawerProps) {
  const { theme, currency, language } = useTheme()
  const t = getThemeTranslations(language)

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
        {/* Header */}
        <div
          className="flex items-center justify-between p-6"
          style={{ borderBottom: `1px solid ${theme.colors.border}` }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: theme.colors.text }}
          >
            {t.cart}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-colors"
            style={{ borderRadius: theme.radius.full }}
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
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div
                className="w-20 h-20 mb-6 flex items-center justify-center"
                style={{
                  backgroundColor: theme.colors.surfaceHover,
                  borderRadius: theme.radius.full
                }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: theme.colors.border }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-lg" style={{ color: theme.colors.textMuted }}>{t.noItems}</p>
              <p className="text-sm mt-1" style={{ color: theme.colors.border }}>{t.checkBackSoon}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map(item => (
                <div key={item.product.id} className="flex gap-4">
                  <div
                    className="w-20 h-20 overflow-hidden flex-shrink-0"
                    style={{
                      borderRadius: theme.radius.lg,
                      backgroundColor: theme.colors.surfaceHover
                    }}
                  >
                    {item.product.image ? (
                      <img
                        src={optimizeImage(item.product.image, 'thumbnail')}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6"
                          style={{ color: theme.colors.border }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-medium truncate"
                      style={{ color: theme.colors.text }}
                    >
                      {item.product.name}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: theme.colors.textMuted }}
                    >
                      {formatPrice(item.product.price, currency)}
                    </p>

                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: theme.colors.surfaceHover,
                          borderRadius: theme.radius.full
                        }}
                      >
                        <svg className="w-4 h-4" style={{ color: theme.colors.textMuted }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-8 text-center font-semibold" style={{ color: theme.colors.text }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: theme.colors.surfaceHover,
                          borderRadius: theme.radius.full
                        }}
                      >
                        <svg className="w-4 h-4" style={{ color: theme.colors.textMuted }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>

                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="ml-auto p-2 transition-colors hover:text-red-500"
                        style={{ color: theme.colors.border }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout */}
        {items.length > 0 && (
          <div
            className="p-6"
            style={{
              borderTop: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surfaceHover
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <span style={{ color: theme.colors.textMuted }}>{t.total}</span>
              <span className="text-2xl font-semibold" style={{ color: theme.colors.text }}>
                {formatPrice(totalPrice, currency)}
              </span>
            </div>
            <button
              onClick={() => {
                onClose()
                onCheckout()
              }}
              className="w-full flex items-center justify-center gap-2 py-4 font-medium transition-all active:scale-[0.98]"
              style={{
                backgroundColor: '#25D366',
                color: '#ffffff',
                borderRadius: theme.radius.lg
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {t.orderViaWhatsApp}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
