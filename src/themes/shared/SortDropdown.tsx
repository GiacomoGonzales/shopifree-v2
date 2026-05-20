/**
 * SortDropdown
 * =====================================================
 * Dropdown de ordenamiento, compartido por los 70+ temas.
 *
 * Diseno: agnostico al sistema de styling. Acepta color props,
 * con defaults razonables que funcionan en temas con fondo claro
 * (Minimal, Boutique, Fresh, Slate, etc.). Los temas con fondo
 * oscuro o identidad fuerte pueden pasar sus propios colores o
 * envolverlo en su propia variante.
 *
 * Se acopla por minimo: lee `sortBy` + `onSortChange` del hook
 * useProductFilters y nada mas.
 */

import { useState, useRef, useEffect } from 'react'
import type { SortBy } from './useProductFilters'
import { getThemeTranslations } from './translations'

interface SortDropdownProps {
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
  language?: string
  /** Colores opcionales para integrarse con el tema */
  colors?: {
    text?: string
    border?: string
    background?: string
    primary?: string
  }
  className?: string
}

export default function SortDropdown({
  sortBy,
  onSortChange,
  language,
  colors,
  className = '',
}: SortDropdownProps) {
  const t = getThemeTranslations(language)
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al tocar/click afuera. pointerdown unifica mouse + touch,
  // mousedown solo no se dispara confiablemente en mobile.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  const options: Array<{ value: SortBy; label: string }> = [
    { value: 'featured', label: t.sortFeatured },
    { value: 'newest', label: t.sortNewest },
    { value: 'price-asc', label: t.sortPriceAsc },
    { value: 'price-desc', label: t.sortPriceDesc },
    { value: 'name-asc', label: t.sortNameAsc },
  ]

  const activeLabel = options.find(o => o.value === sortBy)?.label ?? t.sortFeatured

  const textColor = colors?.text ?? '#111827'
  const borderColor = colors?.border ?? '#e5e7eb'
  const bgColor = colors?.background ?? '#ffffff'
  const primaryColor = colors?.primary ?? '#111827'

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: textColor, borderColor, backgroundColor: bgColor }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="opacity-70">{t.sortBy}:</span>
        <span>{activeLabel}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 min-w-[200px] rounded-lg border shadow-lg z-30 overflow-hidden"
          style={{ borderColor, backgroundColor: bgColor }}
        >
          {options.map(opt => {
            const isActive = opt.value === sortBy
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange(opt.value)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:opacity-70"
                  style={{
                    color: isActive ? primaryColor : textColor,
                    backgroundColor: isActive ? `${primaryColor}10` : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
