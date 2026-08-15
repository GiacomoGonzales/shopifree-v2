import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { formatPrice } from '../../../lib/currency'
import type { ModifierGroup } from '../../../types'

export interface SelectedModifier {
  groupId: string
  groupName: string
  options: {
    id: string
    name: string
    price: number
  }[]
}

interface ModifierSelectorProps {
  modifierGroups: ModifierGroup[]
  onChange: (selected: SelectedModifier[], totalExtra: number) => void
  language?: string
}

export default function ModifierSelector({ modifierGroups, onChange, language = 'es' }: ModifierSelectorProps) {
  const { theme, store } = useTheme()
  const [selections, setSelections] = useState<Record<string, string[]>>({})

  // Initialize selections with empty arrays for each group
  useEffect(() => {
    const initial: Record<string, string[]> = {}
    modifierGroups.forEach(group => {
      initial[group.id] = []
    })
    setSelections(initial)
  }, [modifierGroups])

  // Calculate and notify parent of changes
  useEffect(() => {
    const selected: SelectedModifier[] = []
    let totalExtra = 0

    modifierGroups.forEach(group => {
      const selectedOptionIds = selections[group.id] || []
      if (selectedOptionIds.length > 0) {
        // Se mapea id→opcion PRESERVANDO duplicados: en los grupos
        // multiopcion la misma opcion aparece N veces en la seleccion y cada
        // aparicion cuenta y se cobra. El filter(includes) anterior las
        // colapsaba a una.
        const selectedOptions = selectedOptionIds
          .map(id => group.options.find(opt => opt.id === id))
          .filter((opt): opt is typeof group.options[number] => !!opt)
          .map(opt => ({
            id: opt.id,
            name: opt.name,
            price: opt.price,
          }))

        selected.push({
          groupId: group.id,
          groupName: group.name,
          options: selectedOptions,
        })

        totalExtra += selectedOptions.reduce((sum, opt) => sum + opt.price, 0)
      }
    })

    onChange(selected, totalExtra)
  }, [selections, modifierGroups, onChange])

  const handleSelect = (groupId: string, optionId: string, maxSelect: number) => {
    setSelections(prev => {
      const current = prev[groupId] || []

      if (maxSelect === 1) {
        // Radio behavior - single select
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: [] }
        }
        return { ...prev, [groupId]: [optionId] }
      }

      // Checkbox behavior - multi select
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) }
      }

      if (current.length >= maxSelect) {
        // At max, don't add more
        return prev
      }

      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  // Multiopcion: suma/quita UNA unidad de la opcion (puede repetirse).
  const changeQty = (groupId: string, optionId: string, delta: 1 | -1, maxSelect: number) => {
    setSelections(prev => {
      const current = prev[groupId] || []
      if (delta === 1) {
        if (current.length >= maxSelect) return prev
        return { ...prev, [groupId]: [...current, optionId] }
      }
      const idx = current.indexOf(optionId)
      if (idx === -1) return prev
      const next = [...current]
      next.splice(idx, 1)
      return { ...prev, [groupId]: next }
    })
  }

  const optionQty = (groupId: string, optionId: string) =>
    (selections[groupId] || []).filter(id => id === optionId).length

  const isSelected = (groupId: string, optionId: string) => {
    return (selections[groupId] || []).includes(optionId)
  }

  const getGroupSelectionCount = (groupId: string) => {
    return (selections[groupId] || []).length
  }

  const isGroupValid = (group: ModifierGroup) => {
    const count = getGroupSelectionCount(group.id)
    return !group.required || count >= group.minSelect
  }

  const labels = {
    es: {
      required: 'Requerido',
      optional: 'Opcional',
      selectMin: 'Selecciona al menos',
      selectMax: 'Maximo',
    },
    en: {
      required: 'Required',
      optional: 'Optional',
      selectMin: 'Select at least',
      selectMax: 'Maximum',
    },
    pt: {
      required: 'Obrigatorio',
      optional: 'Opcional',
      selectMin: 'Selecione pelo menos',
      selectMax: 'Maximo',
    },
  }

  const t = labels[language as keyof typeof labels] || labels.es

  return (
    <div className="space-y-4">
      {modifierGroups.map(group => {
        const valid = isGroupValid(group)
        const count = getGroupSelectionCount(group.id)

        return (
          <div key={group.id} className="space-y-2">
            {/* Group Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="font-medium text-sm"
                  style={{ color: theme.colors.text }}
                >
                  {group.name}
                </span>
                {group.required && !valid && (
                  <span
                    className="text-xs px-2 py-0.5"
                    style={{
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      borderRadius: theme.radius.full,
                    }}
                  >
                    {t.required}
                  </span>
                )}
                {!group.required && (
                  <span
                    className="text-xs"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {t.optional}
                  </span>
                )}
              </div>
              <span
                className="text-xs"
                style={{ color: theme.colors.textMuted }}
              >
                {count}/{group.maxSelect}
              </span>
            </div>

            {/* Options */}
            <div className="space-y-1">
              {group.options.filter(opt => opt.available).map(option => {
                const selected = isSelected(group.id, option.id)
                const atMax = count >= group.maxSelect && !selected

                // Multiopcion: fila con stepper (− qty +) en vez de toggle.
                // La misma opcion puede sumarse varias veces hasta el tope
                // del GRUPO (count, no por opcion).
                if (group.allowRepeat && group.maxSelect > 1) {
                  const qty = optionQty(group.id, option.id)
                  const groupFull = count >= group.maxSelect
                  return (
                    <div
                      key={option.id}
                      className="w-full flex items-center justify-between p-3 transition-all"
                      style={{
                        backgroundColor: qty > 0
                          ? theme.effects.darkMode ? 'rgba(255,255,255,0.1)' : theme.colors.surfaceHover
                          : 'transparent',
                        borderRadius: theme.radius.md,
                        border: `1px solid ${qty > 0 ? theme.colors.primary : theme.colors.border}`,
                        opacity: groupFull && qty === 0 ? 0.45 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate" style={{ color: theme.colors.text }}>
                          {option.name}
                        </span>
                        {option.price > 0 && (
                          <span className="text-sm shrink-0" style={{ color: theme.colors.textMuted }}>
                            +{formatPrice(option.price, store.currency)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {qty > 0 && (
                          <>
                            <button
                              type="button"
                              aria-label={`Quitar ${option.name}`}
                              onClick={() => changeQty(group.id, option.id, -1, group.maxSelect)}
                              className="w-7 h-7 flex items-center justify-center rounded-full text-base leading-none transition-opacity hover:opacity-80"
                              style={{ border: `1.5px solid ${theme.colors.primary}`, color: theme.colors.primary }}
                            >
                              −
                            </button>
                            <span className="text-sm min-w-[1.2rem] text-center tabular-nums font-semibold"
                                  style={{ color: theme.colors.text }}>
                              {qty}
                            </span>
                          </>
                        )}
                        <button
                          type="button"
                          aria-label={`Agregar ${option.name}`}
                          disabled={groupFull}
                          onClick={() => changeQty(group.id, option.id, 1, group.maxSelect)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-base leading-none transition-opacity hover:opacity-80 disabled:opacity-35"
                          style={{
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.textInverted,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={atMax}
                    onClick={() => handleSelect(group.id, option.id, group.maxSelect)}
                    className="w-full flex items-center justify-between p-3 transition-all"
                    style={{
                      backgroundColor: selected
                        ? theme.effects.darkMode ? 'rgba(255,255,255,0.1)' : theme.colors.surfaceHover
                        : 'transparent',
                      borderRadius: theme.radius.md,
                      border: `1px solid ${selected ? theme.colors.primary : theme.colors.border}`,
                      opacity: atMax ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox/Radio indicator */}
                      <div
                        className="w-5 h-5 flex items-center justify-center"
                        style={{
                          borderRadius: group.maxSelect === 1 ? theme.radius.full : theme.radius.sm,
                          border: `2px solid ${selected ? theme.colors.primary : theme.colors.border}`,
                          backgroundColor: selected ? theme.colors.primary : 'transparent',
                        }}
                      >
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-sm"
                        style={{ color: theme.colors.text }}
                      >
                        {option.name}
                      </span>
                    </div>
                    {option.price > 0 && (
                      <span
                        className="text-sm"
                        style={{ color: theme.colors.textMuted }}
                      >
                        {/* formatPrice con la moneda de la tienda: antes el
                            "$" iba literal y una tienda en soles mostraba el
                            producto en S/ y los adicionales en dolares. */}
                        +{formatPrice(option.price, store.currency)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
