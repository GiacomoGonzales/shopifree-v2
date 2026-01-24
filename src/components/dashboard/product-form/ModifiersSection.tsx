import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModifierGroup, ModifierOption } from '../../../types'

interface ModifiersSectionProps {
  modifierGroups: ModifierGroup[]
  onChange: (groups: ModifierGroup[]) => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export default function ModifiersSection({ modifierGroups, onChange }: ModifiersSectionProps) {
  const { t } = useTranslation('dashboard')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const addGroup = () => {
    const newGroup: ModifierGroup = {
      id: generateId(),
      name: '',
      required: false,
      minSelect: 0,
      maxSelect: 1,
      options: [],
    }
    onChange([...modifierGroups, newGroup])
    setExpandedGroup(newGroup.id)
  }

  const updateGroup = (groupId: string, updates: Partial<ModifierGroup>) => {
    onChange(
      modifierGroups.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    )
  }

  const removeGroup = (groupId: string) => {
    onChange(modifierGroups.filter((g) => g.id !== groupId))
  }

  const addOption = (groupId: string) => {
    const newOption: ModifierOption = {
      id: generateId(),
      name: '',
      price: 0,
      available: true,
    }
    onChange(
      modifierGroups.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, newOption] } : g
      )
    )
  }

  const updateOption = (groupId: string, optionId: string, updates: Partial<ModifierOption>) => {
    onChange(
      modifierGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((o) =>
                o.id === optionId ? { ...o, ...updates } : o
              ),
            }
          : g
      )
    )
  }

  const removeOption = (groupId: string, optionId: string) => {
    onChange(
      modifierGroups.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g
      )
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">
            {t('productForm.modifiers.title', 'Modificadores / Extras')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('productForm.modifiers.description', 'Opciones adicionales como toppings, extras, tamanos')}
          </p>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="px-3 py-1.5 text-sm font-medium bg-[#38bdf8]/10 text-[#1e3a5f] rounded-lg hover:bg-[#38bdf8]/20 transition-colors"
        >
          + {t('productForm.modifiers.addGroup', 'Agregar grupo')}
        </button>
      </div>

      {modifierGroups.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">
            {t('productForm.modifiers.empty', 'Sin modificadores. Agrega un grupo para empezar.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {modifierGroups.map((group) => (
            <div
              key={group.id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Group Header */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                onClick={() =>
                  setExpandedGroup(expandedGroup === group.id ? null : group.id)
                }
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedGroup === group.id ? 'rotate-90' : ''
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
                    {group.name || t('productForm.modifiers.unnamed', 'Sin nombre')}
                  </span>
                  {group.required && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                      {t('productForm.modifiers.required', 'Requerido')}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    ({group.options.length} {t('productForm.modifiers.options', 'opciones')})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeGroup(group.id)
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Group Content */}
              {expandedGroup === group.id && (
                <div className="p-4 space-y-4">
                  {/* Group Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                      {t('productForm.modifiers.groupName', 'Nombre del grupo')}
                    </label>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                      placeholder={t('productForm.modifiers.groupNamePlaceholder', 'Ej: Extras, Tamano, Tipo de pan')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    />
                  </div>

                  {/* Group Settings */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${group.id}`}
                        checked={group.required}
                        onChange={(e) =>
                          updateGroup(group.id, {
                            required: e.target.checked,
                            minSelect: e.target.checked ? 1 : 0,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-[#2d6cb5] focus:ring-[#38bdf8]"
                      />
                      <label htmlFor={`required-${group.id}`} className="text-sm text-gray-700">
                        {t('productForm.modifiers.isRequired', 'Obligatorio')}
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t('productForm.modifiers.minSelect', 'Min. seleccion')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={group.minSelect}
                        onChange={(e) =>
                          updateGroup(group.id, { minSelect: parseInt(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t('productForm.modifiers.maxSelect', 'Max. seleccion')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={group.maxSelect}
                        onChange={(e) =>
                          updateGroup(group.id, { maxSelect: parseInt(e.target.value) || 1 })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[#1e3a5f]">
                        {t('productForm.modifiers.optionsLabel', 'Opciones')}
                      </label>
                      <button
                        type="button"
                        onClick={() => addOption(group.id)}
                        className="text-xs text-[#2d6cb5] hover:text-[#1e3a5f] font-medium"
                      >
                        + {t('productForm.modifiers.addOption', 'Agregar opcion')}
                      </button>
                    </div>

                    {group.options.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                        {t('productForm.modifiers.noOptions', 'Agrega opciones a este grupo')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {group.options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <input
                              type="text"
                              value={option.name}
                              onChange={(e) =>
                                updateOption(group.id, option.id, { name: e.target.value })
                              }
                              placeholder={t('productForm.modifiers.optionName', 'Nombre')}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                +
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={option.price || ''}
                                onChange={(e) =>
                                  updateOption(group.id, option.id, {
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="0"
                                className="w-20 pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                              />
                            </div>
                            <label className="flex items-center gap-1.5 text-xs text-gray-500">
                              <input
                                type="checkbox"
                                checked={option.available}
                                onChange={(e) =>
                                  updateOption(group.id, option.id, { available: e.target.checked })
                                }
                                className="w-3.5 h-3.5 rounded border-gray-300 text-[#2d6cb5] focus:ring-[#38bdf8]"
                              />
                              {t('productForm.modifiers.available', 'Disp.')}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeOption(group.id, option.id)}
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
