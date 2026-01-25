import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import type { CartItem } from '../../../hooks/useCart'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import { formatPrice } from '../../../lib/currency'

interface Props {
  items: CartItem[]
  totalPrice: number
  currency: string
  t: ThemeTranslations
  collapsible?: boolean
}

export default function OrderSummary({ items, totalPrice, currency, t, collapsible = true }: Props) {
  const { theme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(!collapsible)

  return (
    <div
      className="border overflow-hidden"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: theme.colors.textMuted }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="font-medium" style={{ color: theme.colors.text }}>
            {t.orderSummary}
          </span>
          <span
            className="text-sm px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${theme.colors.primary}15`,
              color: theme.colors.primary
            }}
          >
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: theme.colors.text }}>
            {formatPrice(totalPrice, currency)}
          </span>
          {collapsible && (
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: theme.colors.textMuted }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Items list */}
      {isExpanded && (
        <div
          className="border-t"
          style={{ borderColor: theme.colors.border }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex gap-3 p-4 border-b last:border-b-0"
              style={{ borderColor: theme.colors.border }}
            >
              {/* Product image */}
              {item.product.image && (
                <div
                  className="w-14 h-14 flex-shrink-0 overflow-hidden"
                  style={{ borderRadius: theme.radius.sm }}
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Product details */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-medium text-sm truncate"
                  style={{ color: theme.colors.text }}
                >
                  {item.product.name}
                </p>

                {/* Variants */}
                {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {Object.entries(item.selectedVariants)
                      .map(([name, value]) => `${name}: ${value}`)
                      .join(', ')}
                  </p>
                )}

                {/* Modifiers */}
                {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {item.selectedModifiers
                      .flatMap(mod => mod.options.map(o => o.name))
                      .join(', ')}
                  </p>
                )}

                <div className="flex items-center justify-between mt-1">
                  <span
                    className="text-xs"
                    style={{ color: theme.colors.textMuted }}
                  >
                    x{item.quantity}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: theme.colors.text }}
                  >
                    {formatPrice(item.itemPrice * item.quantity, currency)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div
            className="p-4 border-t"
            style={{
              borderColor: theme.colors.border,
              backgroundColor: `${theme.colors.primary}05`
            }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: theme.colors.textMuted }}>{t.subtotal}</span>
              <span style={{ color: theme.colors.text }}>{formatPrice(totalPrice, currency)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t" style={{ borderColor: theme.colors.border }}>
              <span className="font-semibold" style={{ color: theme.colors.text }}>{t.total}</span>
              <span className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                {formatPrice(totalPrice, currency)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
