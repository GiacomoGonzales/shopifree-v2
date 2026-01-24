import { useTheme } from '../ThemeContext'
import type { ProductVariation } from '../../../types'

interface VariantSelectorProps {
  variations: ProductVariation[]
  selected: Record<string, string>  // { variationName: selectedValue }
  onChange: (selected: Record<string, string>) => void
}

export default function VariantSelector({ variations, selected, onChange }: VariantSelectorProps) {
  const { theme } = useTheme()

  const handleSelect = (variationName: string, value: string) => {
    onChange({
      ...selected,
      [variationName]: selected[variationName] === value ? '' : value,
    })
  }

  return (
    <div className="space-y-4">
      {variations.map(variation => (
        <div key={variation.id} className="space-y-2">
          {/* Variation Label */}
          <div className="flex items-center gap-2">
            <span
              className="font-medium text-sm"
              style={{ color: theme.colors.text }}
            >
              {variation.name}
            </span>
            {selected[variation.name] && (
              <span
                className="text-xs"
                style={{ color: theme.colors.textMuted }}
              >
                : {selected[variation.name]}
              </span>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-2">
            {variation.options.filter(opt => opt.available).map(option => {
              const isSelected = selected[variation.name] === option.value

              // Check if this is a color variation (simple heuristic)
              const isColor = variation.name.toLowerCase().includes('color') ||
                              variation.name.toLowerCase().includes('colour')

              // Try to parse as color if it looks like a color
              const colorValue = isColor ? getColorValue(option.value) : null

              if (colorValue) {
                // Render as color swatch
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(variation.name, option.value)}
                    className="w-10 h-10 transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: colorValue,
                      borderRadius: theme.radius.full,
                      border: isSelected
                        ? `3px solid ${theme.colors.primary}`
                        : `2px solid ${theme.colors.border}`,
                      boxShadow: isSelected ? theme.shadows.md : 'none',
                    }}
                    title={option.value}
                  >
                    {isSelected && (
                      <svg
                        className="w-5 h-5"
                        style={{
                          color: isLightColor(colorValue) ? '#000' : '#fff',
                        }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              }

              // Render as text button
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(variation.name, option.value)}
                  className="px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : 'transparent',
                    color: isSelected
                      ? theme.colors.textInverted
                      : theme.colors.text,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                  }}
                >
                  {option.value}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// Helper functions for color detection
function getColorValue(value: string): string | null {
  const colorMap: Record<string, string> = {
    // Spanish
    negro: '#000000',
    blanco: '#ffffff',
    rojo: '#dc2626',
    azul: '#2563eb',
    verde: '#16a34a',
    amarillo: '#eab308',
    naranja: '#ea580c',
    rosa: '#ec4899',
    morado: '#9333ea',
    gris: '#6b7280',
    cafe: '#78350f',
    marron: '#78350f',
    beige: '#d4b896',
    // English
    black: '#000000',
    white: '#ffffff',
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#eab308',
    orange: '#ea580c',
    pink: '#ec4899',
    purple: '#9333ea',
    gray: '#6b7280',
    grey: '#6b7280',
    brown: '#78350f',
    navy: '#1e3a8a',
    // Portuguese
    preto: '#000000',
    branco: '#ffffff',
    vermelho: '#dc2626',
    azul_pt: '#2563eb',
    verde_pt: '#16a34a',
    amarelo: '#eab308',
    laranja: '#ea580c',
    roxo: '#9333ea',
    cinza: '#6b7280',
    marrom: '#78350f',
  }

  const normalized = value.toLowerCase().trim()
  return colorMap[normalized] || null
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}
