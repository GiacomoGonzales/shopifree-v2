import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ModifierGroup, ModifierOption } from '../../../types'
import { CARD, INPUT, INPUT_SM, LABEL, SECTION_HINT, SECTION_TITLE } from './tokens'

/** Agarre de arrastre con puntos CSS — mismo patron que Products.tsx, sin SVG. */
function GripDots({ tone = '#C3CFDB' }: { tone?: string }) {
  return (
    <span
      className="block shrink-0"
      style={{
        width: 10,
        height: 15,
        backgroundImage: `radial-gradient(${tone} 1.1px, transparent 1.3px)`,
        backgroundSize: '5px 5px',
      }}
    />
  )
}

/**
 * Envoltorio sortable generico: expone el ref de nodo y los listeners para
 * que el AGARRE sea solo el grip, no la fila entera — asi los inputs de
 * adentro se pueden seguir seleccionando y editando sin iniciar un arrastre.
 */
function Sortable({ id, children }: {
  id: string
  children: (p: {
    handleProps: Record<string, unknown>
    isDragging: boolean
  }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}>
      {children({ handleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  )
}

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

  // Mismos umbrales que el reordenamiento de productos: 5px de distancia con
  // puntero (un clic normal no arrastra) y 200ms de presion en tactil.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // El orden ES el orden del array: el selector de la tienda pinta grupos y
  // opciones tal cual llegan, asi que reordenar aca ya se refleja al guardar.
  const handleGroupDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = modifierGroups.findIndex(g => g.id === active.id)
    const to = modifierGroups.findIndex(g => g.id === over.id)
    if (from === -1 || to === -1) return
    onChange(arrayMove(modifierGroups, from, to))
  }

  const handleOptionDragEnd = (groupId: string) => (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const group = modifierGroups.find(g => g.id === groupId)
    if (!group) return
    const from = group.options.findIndex(o => o.id === active.id)
    const to = group.options.findIndex(o => o.id === over.id)
    if (from === -1 || to === -1) return
    updateGroup(groupId, { options: arrayMove(group.options, from, to) })
  }

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
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={SECTION_TITLE}>
            {t('productForm.modifiers.title', 'Modificadores / Extras')}
          </h2>
          <p className={SECTION_HINT}>
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
        <div className="text-center py-8 bg-[#F6F9FC] rounded-xl border border-dashed border-[#E6EBF1]">
          <p className="text-[#8898AA] text-sm">
            {t('productForm.modifiers.empty', 'Sin modificadores. Agrega un grupo para empezar.')}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
        <SortableContext items={modifierGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {modifierGroups.map((group) => (
            <Sortable key={group.id} id={group.id}>
            {({ handleProps }) => (
            <div
              className="border border-[#E6EBF1] rounded-xl overflow-hidden bg-white"
            >
              {/* Group Header */}
              <div
                className="flex items-center justify-between p-4 bg-[#F6F9FC] cursor-pointer"
                onClick={() =>
                  setExpandedGroup(expandedGroup === group.id ? null : group.id)
                }
              >
                <div className="flex items-center gap-3">
                  {/* Agarre: solo esta zona inicia el arrastre del grupo.
                      stopPropagation para que agarrar no abra/cierre el
                      acordeon. */}
                  <span
                    {...handleProps}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing touch-none py-1 -my-1"
                    aria-label={t('productForm.modifiers.dragGroup', 'Arrastrar para reordenar el grupo')}
                  >
                    <GripDots />
                  </span>
                  <span
                    className="shrink-0"
                    style={{
                      width: 7,
                      height: 7,
                      borderRight: '1.6px solid #A9B6C6',
                      borderBottom: '1.6px solid #A9B6C6',
                      // Rotacion inline para no depender de que Tailwind genere
                      // el valor arbitrario. Cerrado apunta a la derecha, abierto abajo.
                      transform: `rotate(${expandedGroup === group.id ? 45 : -45}deg)`,
                      transition: 'transform .15s ease',
                    }}
                  />
                  <span className="font-medium text-[#1e3a5f]">
                    {group.name || t('productForm.modifiers.unnamed', 'Sin nombre')}
                  </span>
                  {group.required && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                      {t('productForm.modifiers.required', 'Requerido')}
                    </span>
                  )}
                  <span className="text-xs text-[#A9B6C6]">
                    ({group.options.length} {t('productForm.modifiers.options', 'opciones')})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeGroup(group.id)
                  }}
                  className="text-[1.05rem] leading-none text-[#A9B6C6] hover:text-[#DC2626] transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Group Content */}
              {expandedGroup === group.id && (
                <div className="p-4 space-y-4">
                  {/* Group Name */}
                  <div>
                    <label className={LABEL}>
                      {t('productForm.modifiers.groupName', 'Nombre del grupo')}
                    </label>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                      placeholder={t('productForm.modifiers.groupNamePlaceholder', 'Ej: Extras, Tamano, Tipo de pan')}
                      className={INPUT}
                    />
                  </div>

                  {/* Ajustes del grupo.
                      Obligatorio ocupa su propia fila y minimo/maximo van a la
                      par: la seccion ahora vive en la columna derecha, mas
                      angosta, y en tres columnas las etiquetas "Min. seleccion"
                      y "Max. seleccion" se partian en dos renglones. */}
                  <div className="space-y-3">
                    <label
                      htmlFor={`required-${group.id}`}
                      className="flex items-center gap-2 cursor-pointer w-fit"
                    >
                      <input
                        type="checkbox"
                        id={`required-${group.id}`}
                        checked={group.required}
                        onChange={(e) =>
                          updateGroup(group.id, {
                            required: e.target.checked,
                            minSelect: e.target.checked ? Math.max(1, group.minSelect) : 0,
                          })
                        }
                        className="w-4 h-4 rounded border-[#D8E2EC] text-[#2d6cb5] focus:ring-[#38bdf8]"
                      />
                      <span className={LABEL + ' mb-0'}>
                        {t('productForm.modifiers.isRequired', 'Obligatorio')}
                      </span>
                    </label>

                    <label
                      htmlFor={`repeat-${group.id}`}
                      className="flex items-center gap-2 cursor-pointer w-fit"
                    >
                      <input
                        type="checkbox"
                        id={`repeat-${group.id}`}
                        checked={group.allowRepeat ?? false}
                        onChange={(e) => updateGroup(group.id, { allowRepeat: e.target.checked })}
                        className="w-4 h-4 rounded border-[#D8E2EC] text-[#2d6cb5] focus:ring-[#38bdf8]"
                      />
                      <span className={LABEL + ' mb-0'}>
                        {t('productForm.modifiers.allowRepeat', 'Multiopción: se puede repetir la misma opción (ej. 2x mayonesa)')}
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>
                          {t('productForm.modifiers.minSelect', 'Min. seleccion')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={group.minSelect}
                          onChange={(e) =>
                            updateGroup(group.id, { minSelect: parseInt(e.target.value) || 0 })
                          }
                          className={INPUT_SM}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>
                          {t('productForm.modifiers.maxSelect', 'Max. seleccion')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={group.maxSelect}
                          onChange={(e) =>
                            updateGroup(group.id, { maxSelect: parseInt(e.target.value) || 1 })
                          }
                          className={INPUT_SM}
                        />
                      </div>
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
                      <p className="text-sm text-[#A9B6C6] text-center py-4 bg-[#F6F9FC] rounded-lg">
                        {t('productForm.modifiers.noOptions', 'Agrega opciones a este grupo')}
                      </p>
                    ) : (
                      /* Contexto de arrastre PROPIO por grupo: los listeners
                         viven solo en los agarres, asi que no choca con el
                         contexto de los grupos de afuera. */
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd(group.id)}>
                      <SortableContext items={group.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {group.options.map((option) => (
                          <Sortable key={option.id} id={option.id}>
                          {({ handleProps: optHandle }) => (
                          <div
                            className="flex items-center gap-3 p-3 bg-[#F6F9FC] rounded-lg"
                          >
                            <span
                              {...optHandle}
                              className="cursor-grab active:cursor-grabbing touch-none py-1 -my-1"
                              aria-label={t('productForm.modifiers.dragOption', 'Arrastrar para reordenar la opcion')}
                            >
                              <GripDots />
                            </span>
                            <input
                              type="text"
                              value={option.name}
                              onChange={(e) =>
                                updateOption(group.id, option.id, { name: e.target.value })
                              }
                              placeholder={t('productForm.modifiers.optionName', 'Nombre')}
                              className="flex-1 px-3 py-2 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9B6C6] text-sm">
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
                                className="w-20 pl-6 pr-2 py-2 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                              />
                            </div>
                            <label className="flex items-center gap-1.5 text-xs text-[#8898AA]">
                              <input
                                type="checkbox"
                                checked={option.available}
                                onChange={(e) =>
                                  updateOption(group.id, option.id, { available: e.target.checked })
                                }
                                className="w-3.5 h-3.5 rounded border-[#D8E2EC] text-[#2d6cb5] focus:ring-[#38bdf8]"
                              />
                              {t('productForm.modifiers.available', 'Disp.')}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeOption(group.id, option.id)}
                              className="text-[1.05rem] leading-none text-[#A9B6C6] hover:text-[#DC2626] transition-colors"
                            >
                              &times;
                            </button>
                          </div>
                          )}
                          </Sortable>
                        ))}
                      </div>
                      </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}
            </Sortable>
          ))}
        </div>
        </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
