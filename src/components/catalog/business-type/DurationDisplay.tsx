import { useTheme } from '../ThemeContext'

interface DurationDisplayProps {
  duration: {
    value: number
    unit: 'min' | 'hr'
  }
  variant?: 'badge' | 'inline'
  language?: string
}

export default function DurationDisplay({
  duration,
  variant = 'badge',
  language = 'es',
}: DurationDisplayProps) {
  const { theme } = useTheme()

  const labels = {
    es: { min: 'min', hr: 'hora', hrs: 'horas' },
    en: { min: 'min', hr: 'hour', hrs: 'hours' },
    pt: { min: 'min', hr: 'hora', hrs: 'horas' },
  }

  const t = labels[language as keyof typeof labels] || labels.es

  let unitLabel: string
  if (duration.unit === 'hr') {
    unitLabel = duration.value === 1 ? t.hr : t.hrs
  } else {
    unitLabel = t.min
  }

  const timeText = `${duration.value} ${unitLabel}`

  if (variant === 'inline') {
    return (
      <span
        className="text-sm flex items-center gap-1"
        style={{ color: theme.colors.textMuted }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {timeText}
      </span>
    )
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1"
      style={{
        backgroundColor: theme.effects.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        borderRadius: theme.radius.full,
      }}
    >
      <svg
        className="w-3.5 h-3.5"
        style={{ color: theme.colors.textMuted }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span
        className="text-xs font-medium"
        style={{ color: theme.colors.text }}
      >
        {timeText}
      </span>
    </div>
  )
}
