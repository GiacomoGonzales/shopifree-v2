import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import type { CartItem } from '../../../hooks/useCart'
import type { Coupon } from '../../../types'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import { formatPrice } from '../../../lib/currency'

interface Props {
  items: CartItem[]
  totalPrice: number
  shippingCost?: number
  discountAmount?: number
  finalTotal?: number
  currency: string
  t: ThemeTranslations
  collapsible?: boolean
  deliveryMethod?: 'pickup' | 'delivery'
  shippingEnabled?: boolean
  appliedCoupon?: Coupon | null
  couponError?: string | null
  couponLoading?: boolean
  onApplyCoupon?: (code: string) => void
  onRemoveCoupon?: () => void
}

export default function OrderSummary({ items, totalPrice, shippingCost = 0, discountAmount = 0, finalTotal, currency, t, collapsible = true, deliveryMethod, shippingEnabled, appliedCoupon, couponError, couponLoading, onApplyCoupon, onRemoveCoupon }: Props) {
  const displayTotal = finalTotal ?? totalPrice
  const { theme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(!collapsible)
  const [couponCode, setCouponCode] = useState('')

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
            {formatPrice(displayTotal, currency)}
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

          {/* Coupon input */}
          {onApplyCoupon && (
            <div className="p-4 border-t" style={{ borderColor: theme.colors.border }}>
              {appliedCoupon ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: `${theme.colors.accent}15` }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.colors.accent }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: theme.colors.accent }}>
                      {t.couponApplied}: <strong>{appliedCoupon.code}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onRemoveCoupon?.(); setCouponCode('') }}
                    className="text-xs underline"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {t.couponRemove}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={t.couponCode}
                      className="flex-1 px-3 py-2 text-sm border outline-none"
                      style={{
                        borderColor: couponError ? '#ef4444' : theme.colors.border,
                        borderRadius: theme.radius.sm,
                        color: theme.colors.text,
                        backgroundColor: theme.colors.background
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => couponCode.trim() && onApplyCoupon(couponCode.trim())}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.textInverted,
                        borderRadius: theme.radius.sm
                      }}
                    >
                      {couponLoading ? '...' : t.couponApply}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                      {couponError === 'couponInvalid' ? t.couponInvalid
                        : couponError === 'couponExpired' ? t.couponExpired
                        : couponError === 'couponMinAmount' ? t.couponMinAmount
                        : t.couponInvalid}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

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
            {/* Discount line */}
            {discountAmount > 0 && appliedCoupon && (
              <div className="flex justify-between items-center mt-1">
                <span style={{ color: theme.colors.accent }}>{t.discount} ({appliedCoupon.code})</span>
                <span style={{ color: theme.colors.accent }}>-{formatPrice(discountAmount, currency)}</span>
              </div>
            )}
            {/* Only show shipping line when delivery is selected */}
            {deliveryMethod === 'delivery' && shippingEnabled && (
              <div className="flex justify-between items-center mt-1">
                <span style={{ color: theme.colors.textMuted }}>{t.shipping}</span>
                <span style={{ color: shippingCost > 0 ? theme.colors.text : theme.colors.accent }}>
                  {shippingCost > 0 ? formatPrice(shippingCost, currency) : t.freeShipping}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center mt-2 pt-2 border-t" style={{ borderColor: theme.colors.border }}>
              <span className="font-semibold" style={{ color: theme.colors.text }}>{t.total}</span>
              <span className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                {formatPrice(displayTotal, currency)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
