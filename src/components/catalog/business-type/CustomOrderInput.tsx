import { useTheme } from '../ThemeContext'

interface CustomOrderInputProps {
  value: string
  instructions?: string
  onChange: (value: string) => void
  language?: string
}

export default function CustomOrderInput({
  value,
  instructions,
  onChange,
  language = 'es',
}: CustomOrderInputProps) {
  const { theme } = useTheme()

  const labels = {
    es: {
      title: 'Personalizacion',
      placeholder: 'Describe como quieres tu pedido...',
      hint: 'Opcional',
    },
    en: {
      title: 'Customization',
      placeholder: 'Describe how you want your order...',
      hint: 'Optional',
    },
    pt: {
      title: 'Personalizacao',
      placeholder: 'Descreva como voce quer seu pedido...',
      hint: 'Opcional',
    },
  }

  const t = labels[language as keyof typeof labels] || labels.es

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          className="text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {t.title}
        </label>
        <span
          className="text-xs"
          style={{ color: theme.colors.textMuted }}
        >
          {t.hint}
        </span>
      </div>

      {instructions && (
        <p
          className="text-sm"
          style={{ color: theme.colors.textMuted }}
        >
          {instructions}
        </p>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.placeholder}
        rows={3}
        className="w-full px-4 py-3 text-sm resize-none transition-all focus:outline-none"
        style={{
          backgroundColor: theme.effects.darkMode
            ? 'rgba(255,255,255,0.05)'
            : theme.colors.surfaceHover,
          color: theme.colors.text,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.border}`,
        }}
      />
    </div>
  )
}
