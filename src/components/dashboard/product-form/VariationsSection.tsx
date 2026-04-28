import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProductVariation, VariationOption, VariantCombination } from '../../../types'
import VariantAdvancedModal from './VariantAdvancedModal'

interface VariationsSectionProps {
  variations: ProductVariation[]
  onChange: (variations: ProductVariation[]) => void
  combinations: VariantCombination[]
  onCombinationsChange: (combinations: VariantCombination[]) => void
  trackStock?: boolean
  basePrice?: number
  isEditing?: boolean
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Generate all combinations from variation options
function generateCombinations(
  variations: ProductVariation[],
  existing: VariantCombination[],
  basePrice?: number
): VariantCombination[] {
  const validVariations = variations.filter(v => v.name && v.options.length > 0)
  if (validVariations.length === 0) return []

  // Build all possible option combos
  const optionSets = validVariations.map(v => v.options.filter(o => o.value).map(o => ({ name: v.name, value: o.value })))

  // Cartesian product
  const combos: Record<string, string>[][] = optionSets.reduce<Record<string, string>[][]>(
    (acc, set) => {
      if (acc.length === 0) return set.map(o => [{ [o.name]: o.value }])
      return acc.flatMap(combo => set.map(o => [...combo, { [o.name]: o.value }]))
    },
    []
  )

  return combos.map(combo => {
    const options: Record<string, string> = {}
    combo.forEach(o => Object.assign(options, o))

    // Check if this combination already exists (preserve its data)
    const key = Object.entries(options).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|')
    const existingCombo = existing.find(e => {
      const eKey = Object.entries(e.options).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|')
      return eKey === key
    })

    if (existingCombo) return existingCombo

    return {
      id: generateId(),
      options,
      stock: 0,
      price: basePrice,
      available: true,
    }
  })
}

export default function VariationsSection({
  variations, onChange, combinations, onCombinationsChange, trackStock, basePrice, isEditing
}: VariationsSectionProps) {
  const { t } = useTranslation('dashboard')
  const [expandedVariation, setExpandedVariation] = useState<string | null>(null)
  const [advancedComboId, setAdvancedComboId] = useState<string | null>(null)
  const advancedCombo = advancedComboId ? combinations.find(c => c.id === advancedComboId) : undefined

  // Regenerate combinations when variations change
  const regenerateCombinations = useCallback((newVariations: ProductVariation[]) => {
    const newCombos = generateCombinations(newVariations, combinations, basePrice)
    onCombinationsChange(newCombos)
  }, [combinations, onCombinationsChange, basePrice])

  // Auto-generate combinations for existing products that have variations but no combinations
  useEffect(() => {
    if (variations.length > 0 && combinations.length === 0) {
      const hasValidOptions = variations.some(v => v.name && v.options.some(o => o.value))
      if (hasValidOptions) {
        const newCombos = generateCombinations(variations, [], basePrice)
        if (newCombos.length > 0) onCombinationsChange(newCombos)
      }
    }
  }, []) // Only on mount

  // Regenerate when variations change (debounced via onChange)
  const handleVariationsChange = (newVariations: ProductVariation[]) => {
    onChange(newVariations)
    regenerateCombinations(newVariations)
  }

  const addVariation = () => {
    const newVar: ProductVariation = { id: generateId(), name: '', options: [] }
    handleVariationsChange([...variations, newVar])
    setExpandedVariation(newVar.id)
  }

  const updateVariation = (id: string, updates: Partial<ProductVariation>) => {
    const updated = variations.map(v => v.id === id ? { ...v, ...updates } : v)
    handleVariationsChange(updated)
  }

  const removeVariation = (id: string) => {
    handleVariationsChange(variations.filter(v => v.id !== id))
  }

  const addOption = (variationId: string) => {
    const newOpt: VariationOption = { id: generateId(), value: '', available: true }
    const updated = variations.map(v =>
      v.id === variationId ? { ...v, options: [...v.options, newOpt] } : v
    )
    handleVariationsChange(updated)
  }

  const updateOption = (variationId: string, optionId: string, updates: Partial<VariationOption>) => {
    const updated = variations.map(v =>
      v.id === variationId ? { ...v, options: v.options.map(o => o.id === optionId ? { ...o, ...updates } : o) } : v
    )
    handleVariationsChange(updated)
  }

  const removeOption = (variationId: string, optionId: string) => {
    const updated = variations.map(v =>
      v.id === variationId ? { ...v, options: v.options.filter(o => o.id !== optionId) } : v
    )
    handleVariationsChange(updated)
  }

  const updateCombination = (comboId: string, updates: Partial<VariantCombination>) => {
    onCombinationsChange(combinations.map(c => c.id === comboId ? { ...c, ...updates } : c))
  }

  const presets = [
    { name: 'Talla', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { name: 'Color', options: ['Negro', 'Blanco', 'Azul', 'Rojo'] },
    { name: 'Material', options: ['Algodon', 'Poliester', 'Lino'] },
  ]

  const addPreset = (preset: { name: string; options: string[] }) => {
    const newVar: ProductVariation = {
      id: generateId(),
      name: preset.name,
      options: preset.options.map(value => ({ id: generateId(), value, available: true })),
    }
    handleVariationsChange([...variations, newVar])
    setExpandedVariation(newVar.id)
  }

  const comboLabel = (combo: VariantCombination) => Object.values(combo.options).join(' / ')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Variantes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Tallas, colores u otras opciones</p>
        </div>
        <button type="button" onClick={addVariation}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
          + Agregar variante
        </button>
      </div>

      {/* Presets */}
      {variations.length === 0 && (
        <div>
          <p className="text-[11px] text-gray-400 mb-2">Agregar rapido:</p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button key={p.name} type="button" onClick={() => addPreset(p)}
                className="px-2.5 py-1 text-xs bg-gray-50 text-gray-500 rounded-md hover:bg-gray-100 transition-colors">
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variation groups */}
      {variations.length > 0 && (
        <div className="space-y-3">
          {variations.map(variation => (
            <div key={variation.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50/80 cursor-pointer"
                onClick={() => setExpandedVariation(expandedVariation === variation.id ? null : variation.id)}>
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedVariation === variation.id ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {variation.name || 'Sin nombre'}
                  </span>
                  <span className="text-[11px] text-gray-400">({variation.options.length} opciones)</span>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); removeVariation(variation.id) }}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              {expandedVariation === variation.id && (
                <div className="p-3 space-y-3 animate-[slideDown_0.15s_ease-out]">
                  <input type="text" value={variation.name}
                    onChange={e => updateVariation(variation.id, { name: e.target.value })}
                    placeholder="Ej: Talla, Color, Material"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Opciones</span>
                    <button type="button" onClick={() => addOption(variation.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                      + Agregar
                    </button>
                  </div>

                  {variation.options.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">Agrega opciones</p>
                  ) : (
                    <div className="space-y-1.5">
                      {variation.options.map(option => (
                        <div key={option.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <input type="text" value={option.value}
                            onChange={e => updateOption(variation.id, option.id, { value: e.target.value })}
                            placeholder="Valor"
                            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                          <button type="button" onClick={() => removeOption(variation.id, option.id)}
                            className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Combinations table */}
      {combinations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              Combinaciones <span className="text-gray-400 font-normal">({combinations.length})</span>
            </h3>
            {trackStock && (
              <p className="text-[11px] text-gray-400">
                Stock total: {combinations.reduce((s, c) => s + c.stock, 0)}
              </p>
            )}
          </div>

          {isEditing && trackStock && (
            <p className="text-[11px] text-gray-400">El stock se gestiona desde Inventario, Compras o Produccion</p>
          )}
          {!trackStock && (
            <p className="text-[11px] text-gray-400 italic">
              Para gestionar stock por variante, activa "Controlar stock" en Inventario.
            </p>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50/80 text-[11px] text-gray-400 uppercase tracking-wider font-medium border-b border-gray-100">
              <div className={trackStock ? 'col-span-4' : 'col-span-5'}>Combinacion</div>
              <div className={trackStock ? 'col-span-2' : 'col-span-3'}>SKU</div>
              <div className={trackStock ? 'col-span-2 text-right' : 'col-span-2 text-right'}>Precio</div>
              {trackStock && <div className="col-span-2 text-right">Stock</div>}
              <div className="col-span-2 text-right">Estado</div>
            </div>

            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {combinations.map(combo => {
                // True when the variant has data only available through the advanced modal,
                // so we can show a small dot to hint that there's extra config in there.
                const hasAdvancedData = !!(combo.image || combo.barcode || combo.cost !== undefined)
                return (
                <div key={combo.id} className="px-3 py-2">
                  {/* Mobile */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {combo.image && (
                          <img src={combo.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        )}
                        <p className="text-sm text-gray-900 truncate">{comboLabel(combo)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {trackStock && (
                          <span className="text-xs text-gray-500 tabular-nums">{combo.stock} uds</span>
                        )}
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={combo.available}
                            onChange={e => updateCombination(combo.id, { available: e.target.checked })}
                            className="w-3 h-3 rounded border-gray-300 text-[#1e3a5f]" />
                          <span className="text-[10px] text-gray-400">Activo</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={combo.sku || ''} placeholder="SKU"
                        onChange={e => updateCombination(combo.id, { sku: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded-md text-xs" />
                      <input type="number" min="0" value={combo.price ?? ''} placeholder="Precio"
                        onChange={e => updateCombination(combo.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                        className="px-2 py-1.5 border border-gray-200 rounded-md text-xs text-right" />
                    </div>
                    {!isEditing && trackStock && (
                      <input type="number" min="0" value={combo.stock || ''} placeholder="Stock inicial"
                        onChange={e => updateCombination(combo.id, { stock: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs text-right" />
                    )}
                    <button type="button" onClick={() => setAdvancedComboId(combo.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-[#1e3a5f] bg-[#1e3a5f]/5 hover:bg-[#1e3a5f]/10 rounded-md transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.425-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      <span>{t('productForm.variantAdvanced.openCta')}</span>
                      {hasAdvancedData && <span className="w-1.5 h-1.5 rounded-full bg-[#2d6cb5]" />}
                    </button>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                    <div className={trackStock ? 'col-span-4' : 'col-span-5'}>
                      <div className="flex items-center gap-2 min-w-0">
                        {combo.image && (
                          <img src={combo.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        )}
                        <p className="text-sm text-gray-900 truncate">{comboLabel(combo)}</p>
                      </div>
                    </div>
                    <div className={trackStock ? 'col-span-2' : 'col-span-3'}>
                      <input type="text" value={combo.sku || ''} placeholder="SKU"
                        onChange={e => updateCombination(combo.id, { sku: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                    <div className="col-span-2 text-right">
                      <input type="number" min="0" value={combo.price ?? ''} placeholder={String(basePrice || 0)}
                        onChange={e => updateCombination(combo.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs text-right focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                    {trackStock && (
                      <div className="col-span-2 text-right">
                        {isEditing ? (
                          <p className="text-xs text-gray-500 tabular-nums pr-1">{combo.stock}</p>
                        ) : (
                          <input type="number" min="0" value={combo.stock || ''}
                            onChange={e => updateCombination(combo.id, { stock: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs text-right focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                        )}
                      </div>
                    )}
                    <div className="col-span-2 flex justify-end items-center gap-2">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={combo.available}
                          onChange={e => updateCombination(combo.id, { available: e.target.checked })}
                          className="w-3 h-3 rounded border-gray-300 text-[#1e3a5f]" />
                        <span className="text-[11px] text-gray-400">{combo.available ? 'Activo' : 'Inactivo'}</span>
                      </label>
                      <button type="button" onClick={() => setAdvancedComboId(combo.id)}
                        title={t('productForm.variantAdvanced.openCta')}
                        className="relative p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.425-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        {hasAdvancedData && (
                          <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[#2d6cb5]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Advanced settings modal — power-user editor for a single combination
          (image, barcode, cost, plus the basics already in the table). */}
      {advancedCombo && (
        <VariantAdvancedModal
          combo={advancedCombo}
          basePrice={basePrice}
          trackStock={trackStock}
          isEditing={isEditing}
          onChange={updates => updateCombination(advancedCombo.id, updates)}
          onClose={() => setAdvancedComboId(null)}
        />
      )}
    </div>
  )
}
