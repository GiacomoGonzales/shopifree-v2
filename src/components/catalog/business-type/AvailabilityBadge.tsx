import { useTheme } from '../ThemeContext'

interface AvailabilityBadgeProps {
  quantity: number
  threshold?: number  // Show badge only if quantity <= threshold
  language?: string
}

export default function AvailabilityBadge({
  quantity,
  threshold = 10,
  language = 'es',
}: AvailabilityBadgeProps) {
  const { theme } = useTheme()

  // Don't show if quantity is above threshold
  if (quantity > threshold) {
    return null
  }

  // Don't show for 0 (should be handled as out of stock elsewhere)
  if (quantity <= 0) {
    return null
  }

  const labels = {
    es: { only: 'Solo quedan', unit: '' },
    en: { only: 'Only', unit: 'left' },
    pt: { only: 'So restam', unit: '' },
  }

  const t = labels[language as keyof typeof labels] || labels.es

  const text = t.unit
    ? `${t.only} ${quantity} ${t.unit}`
    : `${t.only} ${quantity}`

  // Urgency colors based on quantity
  const isVeryLow = quantity <= 3
  const backgroundColor = isVeryLow ? '#fef2f2' : '#fffbeb'
  const textColor = isVeryLow ? '#dc2626' : '#d97706'

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1"
      style={{
        backgroundColor: theme.effects.darkMode
          ? (isVeryLow ? 'rgba(220, 38, 38, 0.2)' : 'rgba(217, 119, 6, 0.2)')
          : backgroundColor,
        color: textColor,
        borderRadius: theme.radius.full,
      }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className="text-xs font-medium">
        {text}
      </span>
    </div>
  )
}
