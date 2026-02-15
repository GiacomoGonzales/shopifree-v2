import { useTheme } from './ThemeContext'
import { formatPrice } from '../../lib/currency'
import { getThemeTranslations } from '../../themes/shared/translations'

interface FreeShippingProgressProps {
  subtotal: number
}

export default function FreeShippingProgress({ subtotal }: FreeShippingProgressProps) {
  const { store, theme, currency, language } = useTheme()
  const t = getThemeTranslations(language)

  const freeAbove = store.shipping?.freeAbove
  if (store.plan === 'free' || !freeAbove || freeAbove <= 0) return null

  const progress = Math.min(100, (subtotal / freeAbove) * 100)
  const remaining = freeAbove - subtotal
  const unlocked = remaining <= 0

  return (
    <div className="mb-4">
      {/* Progress bar */}
      <div
        className="h-2 w-full overflow-hidden"
        style={{
          backgroundColor: theme.colors.border,
          borderRadius: theme.radius.full,
        }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: unlocked ? '#22c55e' : theme.colors.primary,
            borderRadius: theme.radius.full,
          }}
        />
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 mt-2">
        {unlocked ? (
          <>
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-600">
              {t.freeShippingUnlocked}
            </span>
          </>
        ) : (
          <span className="text-xs" style={{ color: theme.colors.textMuted }}>
            {t.freeShippingProgress.replace('{{amount}}', formatPrice(remaining, currency))}
          </span>
        )}
      </div>
    </div>
  )
}
