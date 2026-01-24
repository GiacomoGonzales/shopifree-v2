import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProductVariation, VariationOption } from '../../../types'

interface VariationsSectionProps {
  variations: ProductVariation[]
  onChange: (variations: ProductVariation[]) => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export default function VariationsSection({ variations, onChange }: VariationsSectionProps) {
  const { t } = useTranslation('dashboard')
  const [expandedVariation, setExpandedVariation] = useState<string | null>(null)

  const addVariation = () => {
    const newVariation: ProductVariation = {
      id: generateId(),
      name: '',
      options: [],
    }
    onChange([...variations, newVariation])
    setExpandedVariation(newVariation.id)
  }

  const updateVariation = (variationId: string, updates: Partial<ProductVariation>) => {
    onChange(
      variations.map((v) => (v.id === variationId ? { ...v, ...updates } : v))
    )
  }

  const removeVariation = (variationId: string) => {
    onChange(variations.filter((v) => v.id !== variationId))
  }

  const addOption = (variationId: string) => {
    const newOption: VariationOption = {
      id: generateId(),
      value: '',
      available: true,
    }
    onChange(
      variations.map((v) =>
        v.id === variationId ? { ...v, options: [...v.options, newOption] } : v
      )
    )
  }

  const updateOption = (variationId: string, optionId: string, updates: Partial<VariationOption>) => {
    onChange(
      variations.map((v) =>
        v.id === variationId
          ? {
              ...v,
              options: v.options.map((o) =>
                o.id === optionId ? { ...o, ...updates } : o
              ),
            }
          : v
      )
    )
  }

  const removeOption = (variationId: string, optionId: string) => {
    onChange(
      variations.map((v) =>
        v.id === variationId
          ? { ...v, options: v.options.filter((o) => o.id !== optionId) }
          : v
      )
    )
  }

  // Common variation presets
  const presets = [
    { name: t('productForm.variations.presets.size', 'Talla'), options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { name: t('productForm.variations.presets.color', 'Color'), options: ['Negro', 'Blanco', 'Azul', 'Rojo'] },
    { name: t('productForm.variations.presets.material', 'Material'), options: ['Algodon', 'Poliester', 'Lino'] },
  ]

  const addPreset = (preset: { name: string; options: string[] }) => {
    const newVariation: ProductVariation = {
      id: generateId(),
      name: preset.name,
      options: preset.options.map((value) => ({
        id: generateId(),
        value,
        available: true,
      })),
    }
    onChange([...variations, newVariation])
    setExpandedVariation(newVariation.id)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">
            {t('productForm.variations.title', 'Variantes')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('productForm.variations.description', 'Tallas, colores u otras opciones del producto')}
          </p>
        </div>
        <button
          type="button"
          onClick={addVariation}
          className="px-3 py-1.5 text-sm font-medium bg-[#38bdf8]/10 text-[#1e3a5f] rounded-lg hover:bg-[#38bdf8]/20 transition-colors"
        >
          + {t('productForm.variations.add', 'Agregar variante')}
        </button>
      </div>

      {/* Presets */}
      {variations.length === 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            {t('productForm.variations.quickAdd', 'Agregar rapido:')}
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => addPreset(preset)}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {variations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">
            {t('productForm.variations.empty', 'Sin variantes. Agrega una para empezar.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {variations.map((variation) => (
            <div
              key={variation.id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Variation Header */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                onClick={() =>
                  setExpandedVariation(expandedVariation === variation.id ? null : variation.id)
                }
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedVariation === variation.id ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium text-[#1e3a5f]">
                    {variation.name || t('productForm.variations.unnamed', 'Sin nombre')}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({variation.options.length} {t('productForm.variations.options', 'opciones')})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeVariation(variation.id)
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Variation Content */}
              {expandedVariation === variation.id && (
                <div className="p-4 space-y-4">
                  {/* Variation Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                      {t('productForm.variations.name', 'Nombre de la variante')}
                    </label>
                    <input
                      type="text"
                      value={variation.name}
                      onChange={(e) => updateVariation(variation.id, { name: e.target.value })}
                      placeholder={t('productForm.variations.namePlaceholder', 'Ej: Talla, Color, Material')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[#1e3a5f]">
                        {t('productForm.variations.optionsLabel', 'Opciones')}
                      </label>
                      <button
                        type="button"
                        onClick={() => addOption(variation.id)}
                        className="text-xs text-[#2d6cb5] hover:text-[#1e3a5f] font-medium"
                      >
                        + {t('productForm.variations.addOption', 'Agregar opcion')}
                      </button>
                    </div>

                    {variation.options.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                        {t('productForm.variations.noOptions', 'Agrega opciones a esta variante')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {variation.options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <input
                              type="text"
                              value={option.value}
                              onChange={(e) =>
                                updateOption(variation.id, option.id, { value: e.target.value })
                              }
                              placeholder={t('productForm.variations.optionValue', 'Valor')}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                            />
                            <label className="flex items-center gap-1.5 text-xs text-gray-500">
                              <input
                                type="checkbox"
                                checked={option.available}
                                onChange={(e) =>
                                  updateOption(variation.id, option.id, { available: e.target.checked })
                                }
                                className="w-3.5 h-3.5 rounded border-gray-300 text-[#2d6cb5] focus:ring-[#38bdf8]"
                              />
                              {t('productForm.variations.available', 'Disponible')}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeOption(variation.id, option.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
