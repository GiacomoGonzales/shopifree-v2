import { useTheme } from '../ThemeContext'

interface WarrantyBadgeProps {
  warranty: {
    months: number
    description?: string
  }
  variant?: 'badge' | 'inline'
  language?: string
}

export default function WarrantyBadge({
  warranty,
  variant = 'badge',
  language = 'es',
}: WarrantyBadgeProps) {
  const { theme } = useTheme()

  const labels = {
    es: {
      warranty: 'Garantia',
      months: 'meses',
      year: 'ano',
      years: 'anos',
    },
    en: {
      warranty: 'Warranty',
      months: 'months',
      year: 'year',
      years: 'years',
    },
    pt: {
      warranty: 'Garantia',
      months: 'meses',
      year: 'ano',
      years: 'anos',
    },
  }

  const t = labels[language as keyof typeof labels] || labels.es

  // Convert months to years if applicable
  let timeText: string
  if (warranty.months >= 12 && warranty.months % 12 === 0) {
    const years = warranty.months / 12
    timeText = `${years} ${years === 1 ? t.year : t.years}`
  } else {
    timeText = `${warranty.months} ${t.months}`
  }

  if (variant === 'inline') {
    return (
      <span
        className="text-sm flex items-center gap-1"
        style={{ color: theme.colors.textMuted }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        {timeText} {t.warranty.toLowerCase()}
      </span>
    )
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1"
      style={{
        backgroundColor: theme.effects.darkMode
          ? 'rgba(34, 197, 94, 0.2)'
          : '#f0fdf4',
        borderRadius: theme.radius.full,
      }}
    >
      <svg
        className="w-3.5 h-3.5"
        style={{ color: '#16a34a' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span
        className="text-xs font-medium"
        style={{ color: '#16a34a' }}
      >
        {timeText} {t.warranty.toLowerCase()}
      </span>
    </div>
  )
}
