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
          <h2 className="text-[0.9rem] font-semibold text-[#1e3a5f]">Variantes</h2>
          <p className="text-xs text-[#A9B6C6] mt-0.5">Tallas, colores u otras opciones</p>
        </div>
        <button type="button" onClick={addVariation}
          className="px-3 py-1.5 text-xs font-medium bg-[#F1F5F9] text-[#425466] rounded-lg hover:bg-[#E1E8EF] transition-colors">
          + Agregar variante
        </button>
      </div>

      {/* Presets */}
      {variations.length === 0 && (
        <div>
          <p className="text-[11px] text-[#A9B6C6] mb-2">Agregar rapido:</p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button key={p.name} type="button" onClick={() => addPreset(p)}
                className="px-2.5 py-1 text-xs bg-[#F6F9FC] text-[#8898AA] rounded-md hover:bg-[#F1F5F9] transition-colors">
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
            <div key={variation.id} className="border border-[#E6EBF1] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#F6F9FC] cursor-pointer"
                onClick={() => setExpandedVariation(expandedVariation === variation.id ? null : variation.id)}>
                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0"
                    style={{
                      width: 7,
                      height: 7,
                      borderRight: '1.6px solid #A9B6C6',
                      borderBottom: '1.6px solid #A9B6C6',
                      // Rotacion inline para no depender de que Tailwind genere
                      // el valor arbitrario. Cerrado apunta a la derecha, abierto abajo.
                      transform: `rotate(${expandedVariation === variation.id ? 45 : -45}deg)`,
                      transition: 'transform .15s ease',
                    }}
                  />
                  <span className="text-sm font-medium text-[#425466]">
                    {variation.name || 'Sin nombre'}
                  </span>
                  <span className="text-[0.7rem] font-normal text-[#A9B6C6]">({variation.options.length} opciones)</span>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); removeVariation(variation.id) }}
                  className="p-1 text-[1.05rem] leading-none text-[#C3CFDB] hover:text-[#DC2626] transition-colors">
                  &times;
                </button>
              </div>

              {/* Content */}
              {expandedVariation === variation.id && (
                <div className="p-3 space-y-3 animate-[slideDown_0.15s_ease-out]">
                  <input type="text" value={variation.name}
                    onChange={e => updateVariation(variation.id, { name: e.target.value })}
                    placeholder="Ej: Talla, Color, Material"
                    className="w-full px-3 py-2 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8898AA]">Opciones</span>
                    <button type="button" onClick={() => addOption(variation.id)}
                      className="text-xs text-[#A9B6C6] hover:text-[#425466] font-medium">
                      + Agregar
                    </button>
                  </div>

                  {variation.options.length === 0 ? (
                    <p className="text-xs text-[#A9B6C6] text-center py-3 bg-[#F6F9FC] rounded-lg">Agrega opciones</p>
                  ) : (
                    <div className="space-y-1.5">
                      {variation.options.map(option => (
                        <div key={option.id} className="flex items-center gap-2 p-2 bg-[#F6F9FC] rounded-lg">
                          <input type="text" value={option.value}
                            onChange={e => updateOption(variation.id, option.id, { value: e.target.value })}
                            placeholder="Valor"
                            className="flex-1 px-2.5 py-1.5 border border-[#E6EBF1] rounded-md text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                          <button type="button" onClick={() => removeOption(variation.id, option.id)}
                            className="p-1 text-[1.05rem] leading-none text-[#C3CFDB] hover:text-[#DC2626] transition-colors">
                            &times;
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
            <h3 className="text-[0.9rem] font-semibold text-[#1e3a5f]">
              Combinaciones <span className="text-[#A9B6C6] font-normal">({combinations.length})</span>
            </h3>
            {trackStock && (
              <p className="text-[0.7rem] font-normal text-[#A9B6C6]">
                Stock total: {combinations.reduce((s, c) => s + c.stock, 0)}
              </p>
            )}
          </div>

          {isEditing && trackStock && (
            <p className="text-[0.7rem] font-normal text-[#A9B6C6]">
              También puedes ajustar stock desde el botón "Stock" en el listado de Productos o desde Inventario.
            </p>
          )}
          {!trackStock && (
            <p className="text-[11px] text-[#A9B6C6] italic">
              Para gestionar stock por variante, activa "Controlar stock" en Inventario.
            </p>
          )}

          <div className="border border-[#E6EBF1] rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-[#F6F9FC] text-[11px] text-[#A9B6C6] uppercase tracking-wider font-medium border-b border-[#EEF2F6]">
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
                        <p className="text-[0.8rem] font-medium text-[#1e3a5f] truncate">{comboLabel(combo)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {trackStock && (
                          <span className="text-xs text-[#8898AA] tabular-nums">{combo.stock} uds</span>
                        )}
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={combo.available}
                            onChange={e => updateCombination(combo.id, { available: e.target.checked })}
                            className="w-3 h-3 rounded border-[#D8E2EC] text-[#1e3a5f]" />
                          <span className="text-[10px] text-[#A9B6C6]">Activo</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={combo.sku || ''} placeholder="SKU"
                        onChange={e => updateCombination(combo.id, { sku: e.target.value })}
                        className="px-2 py-1.5 border border-[#E6EBF1] rounded-md text-xs" />
                      <input type="number" min="0" value={combo.price ?? ''} placeholder="Precio"
                        onChange={e => updateCombination(combo.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                        className="px-2 py-1.5 border border-[#E6EBF1] rounded-md text-xs text-right" />
                    </div>
                    {trackStock && (
                      <input type="number" min="0" value={combo.stock || ''} placeholder={isEditing ? 'Stock' : 'Stock inicial'}
                        onChange={e => updateCombination(combo.id, { stock: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border border-[#E6EBF1] rounded-md text-xs text-right" />
                    )}
                    <button type="button" onClick={() => setAdvancedComboId(combo.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-[#1e3a5f] bg-[#1e3a5f]/5 hover:bg-[#1e3a5f]/10 rounded-md transition-colors">
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
                        <p className="text-[0.8rem] font-medium text-[#1e3a5f] truncate">{comboLabel(combo)}</p>
                      </div>
                    </div>
                    <div className={trackStock ? 'col-span-2' : 'col-span-3'}>
                      <input type="text" value={combo.sku || ''} placeholder="SKU"
                        onChange={e => updateCombination(combo.id, { sku: e.target.value })}
                        className="w-full px-2 py-1 border border-[#E6EBF1] rounded-md text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                    <div className="col-span-2 text-right">
                      <input type="number" min="0" value={combo.price ?? ''} placeholder={String(basePrice || 0)}
                        onChange={e => updateCombination(combo.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-2 py-1 border border-[#E6EBF1] rounded-md text-xs text-right focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                    {trackStock && (
                      <div className="col-span-2 text-right">
                        {/* Always editable — including for existing products. The previous
                            read-only "<p>" forced merchants to leave the form for Inventory,
                            which was a top fricción ("haz todo desde aquí"). The save flow
                            already persists combinations[] back to Firestore and recomputes
                            product.stock from the sum, so editing here is safe. */}
                        <input type="number" min="0" value={combo.stock || ''}
                          onChange={e => updateCombination(combo.id, { stock: Number(e.target.value) || 0 })}
                          className="w-full px-2 py-1 border border-[#E6EBF1] rounded-md text-xs text-right focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                      </div>
                    )}
                    <div className="col-span-2 flex justify-end items-center gap-2">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={combo.available}
                          onChange={e => updateCombination(combo.id, { available: e.target.checked })}
                          className="w-3 h-3 rounded border-[#D8E2EC] text-[#1e3a5f]" />
                        <span className="text-[0.7rem] font-normal text-[#A9B6C6]">{combo.available ? 'Activo' : 'Inactivo'}</span>
                      </label>
                      <button type="button" onClick={() => setAdvancedComboId(combo.id)}
                        title={t('productForm.variantAdvanced.openCta')}
                        className="relative p-1 text-[#A9B6C6] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded transition-colors">
                        <span className="text-[0.85rem] leading-none">&ctdot;</span>
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
