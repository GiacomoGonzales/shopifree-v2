import { formatPrice } from '../../lib/currency'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'

interface CartBarProps {
  totalItems: number
  totalPrice: number
  onViewCart: () => void
  onCheckout: () => void
}

export default function CartBar({ totalItems, totalPrice, onViewCart, onCheckout }: CartBarProps) {
  const { theme, currency, language } = useTheme()
  const t = getThemeTranslations(language)

  if (totalItems === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
      <div
        className="max-w-xl mx-auto p-4 flex items-center justify-between gap-4"
        style={{
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.xl,
          boxShadow: theme.shadows.lg
        }}
      >
        <button onClick={onViewCart} className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{
              backgroundColor: theme.effects.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)',
              borderRadius: theme.radius.full
            }}
          >
            <span className="text-sm font-semibold" style={{ color: theme.colors.textInverted }}>
              {totalItems}
            </span>
          </div>
          <div className="text-left">
            <p className="text-xs" style={{ color: theme.effects.darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.7)' }}>
              {t.view}
            </p>
            <p className="font-semibold" style={{ color: theme.colors.textInverted }}>
              {formatPrice(totalPrice, currency)}
            </p>
          </div>
        </button>

        <button
          onClick={onCheckout}
          className="flex items-center gap-2 px-5 py-3 font-medium transition-all active:scale-95"
          style={{
            backgroundColor: theme.effects.darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            color: theme.colors.textInverted,
            borderRadius: theme.radius.lg
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>{t.checkout}</span>
        </button>
      </div>
    </div>
  )
}
