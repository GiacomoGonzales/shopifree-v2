import { useTheme } from '../ThemeContext'

interface Spec {
  key: string
  value: string
}

interface SpecsDisplayProps {
  specs: Spec[]
  model?: string
  language?: string
}

export default function SpecsDisplay({
  specs,
  model,
  language = 'es',
}: SpecsDisplayProps) {
  const { theme } = useTheme()

  const labels = {
    es: { title: 'Especificaciones', model: 'Modelo' },
    en: { title: 'Specifications', model: 'Model' },
    pt: { title: 'Especificacoes', model: 'Modelo' },
  }

  const t = labels[language as keyof typeof labels] || labels.es

  if (specs.length === 0 && !model) {
    return null
  }

  return (
    <div className="space-y-3">
      <h4
        className="text-sm font-medium"
        style={{ color: theme.colors.text }}
      >
        {t.title}
      </h4>

      <div
        className="overflow-hidden"
        style={{
          backgroundColor: theme.effects.darkMode
            ? 'rgba(255,255,255,0.05)'
            : theme.colors.surfaceHover,
          borderRadius: theme.radius.lg,
        }}
      >
        <table className="w-full text-sm">
          <tbody>
            {model && (
              <tr
                style={{
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}
              >
                <td
                  className="py-2.5 px-4 font-medium"
                  style={{ color: theme.colors.textMuted }}
                >
                  {t.model}
                </td>
                <td
                  className="py-2.5 px-4 text-right"
                  style={{ color: theme.colors.text }}
                >
                  {model}
                </td>
              </tr>
            )}
            {specs.map((spec, index) => (
              <tr
                key={index}
                style={{
                  borderBottom: index < specs.length - 1
                    ? `1px solid ${theme.colors.border}`
                    : 'none',
                }}
              >
                <td
                  className="py-2.5 px-4 font-medium"
                  style={{ color: theme.colors.textMuted }}
                >
                  {spec.key}
                </td>
                <td
                  className="py-2.5 px-4 text-right"
                  style={{ color: theme.colors.text }}
                >
                  {spec.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
