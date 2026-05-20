/**
 * FilterPanel
 * =====================================================
 * Fila horizontal de dropdowns compactos para filtrar el catalogo.
 * Patron tipo Mercadolibre / Falabella / Zara: cada filtro es un
 * boton chico; al hacer click se abre un panel flotante con las
 * opciones (chips o inputs). Solo un dropdown abierto a la vez.
 *
 * Diseno responsive sin necesidad de un drawer separado: los botones
 * envuelven (flex-wrap) en mobile y los paneles flotantes se posicionan
 * relativos a cada boton, asi funciona en cualquier ancho.
 *
 * Auto-deteccion: si availableFilters esta vacio (catalogo simple sin
 * variantes / sin marca / sin rango de precio), el componente devuelve
 * null — invisible cuando no aporta.
 *
 * Agnostico al sistema de styling: acepta color props con defaults
 * razonables para temas con fondo claro. Los temas con identidad
 * fuerte pueden pasar sus colores o envolverlo.
 */

import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react'
import type { AvailableFilters, ActiveFilters } from './useProductFilters'
import { getThemeTranslations } from './translations'

// =====================================================
// FilterDropdownButton — un boton + panel flotante.
// Top-level (no inline en FilterPanel) para que useRef +
// useEffect mantengan estado entre renders del padre.
// =====================================================
function FilterDropdownButton({
  isOpen,
  onToggle,
  label,
  activeLabel,
  textColor,
  bgColor,
  borderColor,
  primaryColor,
  children,
}: {
  isOpen: boolean
  onToggle: () => void
  label: string
  activeLabel: string | null
  textColor: string
  bgColor: string
  borderColor: string
  primaryColor: string
  children: ReactNode
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [alignRight, setAlignRight] = useState(false)
  const isActive = activeLabel !== null

  // Smart positioning: si abrir hacia la derecha se sale del viewport,
  // alinear el panel al borde derecho del boton. Evita scroll horizontal
  // en mobile cuando un filtro esta cerca del borde derecho.
  //
  // useLayoutEffect (no useEffect) + activeLabel en deps porque al
  // seleccionar un valor el boton se ensancha ("Marca" → "Marca: X"),
  // el flex-wrap reflowea y el boton puede saltar a otra fila. Necesitamos
  // recomputar la alineacion antes del paint, no despues, para evitar
  // un flash con el panel fuera de pantalla.
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const dropdownEstimatedWidth = 240
    const margin = 16
    setAlignRight(rect.left + dropdownEstimatedWidth > window.innerWidth - margin)
  }, [isOpen, activeLabel])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors hover:opacity-80"
        style={{
          color: isActive ? '#ffffff' : textColor,
          backgroundColor: isActive ? primaryColor : bgColor,
          borderColor: isActive ? primaryColor : borderColor,
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>
          {label}
          {isActive && <span className="opacity-90">: {activeLabel}</span>}
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute mt-2 min-w-[220px] max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto p-3 rounded-xl border shadow-xl z-30 ${alignRight ? 'right-0' : 'left-0'}`}
          style={{ borderColor, backgroundColor: bgColor }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface FilterPanelColors {
  text?: string
  textMuted?: string
  border?: string
  background?: string
  primary?: string
  surface?: string
}

interface FilterPanelProps {
  availableFilters: AvailableFilters
  activeFilters: ActiveFilters
  onFilterChange: <K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]) => void
  onVariationChange: (variationName: string, value: string | null) => void
  onClear: () => void
  hasActiveFilters: boolean
  language?: string
  currency?: string
  colors?: FilterPanelColors
  className?: string
}

export default function FilterPanel({
  availableFilters,
  activeFilters,
  onFilterChange,
  onVariationChange,
  onClear,
  hasActiveFilters,
  language,
  colors,
  className = '',
}: FilterPanelProps) {
  const t = getThemeTranslations(language)
  const rootRef = useRef<HTMLDivElement>(null)

  // Solo un dropdown abierto a la vez. Se identifica por una key:
  //   'variation:<nombre>' | 'brand' | 'price' | null
  const [openKey, setOpenKey] = useState<string | null>(null)

  // Inputs de precio en estado local para no disparar refiltrado en cada keystroke
  const [priceMinInput, setPriceMinInput] = useState<string>(
    activeFilters.priceMin?.toString() ?? ''
  )
  const [priceMaxInput, setPriceMaxInput] = useState<string>(
    activeFilters.priceMax?.toString() ?? ''
  )

  // Sincronizar inputs si los filtros se limpian desde afuera
  useEffect(() => {
    setPriceMinInput(activeFilters.priceMin?.toString() ?? '')
    setPriceMaxInput(activeFilters.priceMax?.toString() ?? '')
  }, [activeFilters.priceMin, activeFilters.priceMax])

  // Cerrar al tocar/click fuera del panel.
  // Usamos `pointerdown` (no `mousedown`) porque en touch devices
  // mousedown no se dispara confiablemente — pointerdown unifica
  // mouse + touch + pen en un solo evento.
  useEffect(() => {
    if (!openKey) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenKey(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openKey])

  const textColor = colors?.text ?? '#111827'
  const mutedColor = colors?.textMuted ?? '#6b7280'
  const borderColor = colors?.border ?? '#e5e7eb'
  const bgColor = colors?.background ?? '#ffffff'
  const primaryColor = colors?.primary ?? '#111827'
  const surfaceColor = colors?.surface ?? '#f9fafb'

  // Auto-deteccion: si no hay nada que mostrar, no renderizar nada
  const hasAnyFilterAvailable =
    availableFilters.brands.length > 0 ||
    availableFilters.priceRange !== null ||
    availableFilters.variations.length > 0

  if (!hasAnyFilterAvailable) return null

  const applyPriceFilter = () => {
    const minVal = priceMinInput.trim()
    const maxVal = priceMaxInput.trim()
    const min = minVal ? Number(minVal) : null
    const max = maxVal ? Number(maxVal) : null
    onFilterChange('priceMin', Number.isFinite(min as number) ? (min as number) : null)
    onFilterChange('priceMax', Number.isFinite(max as number) ? (max as number) : null)
  }

  // Etiqueta del filtro de precio cuando esta activo: "$20 – $50", "Desde $20", "Hasta $50"
  const priceActiveLabel = (() => {
    const { priceMin, priceMax } = activeFilters
    if (priceMin !== null && priceMax !== null) return `${priceMin}–${priceMax}`
    if (priceMin !== null) return `≥ ${priceMin}`
    if (priceMax !== null) return `≤ ${priceMax}`
    return null
  })()

  // Helper: convierte una dropdownKey en el handler toggle
  const toggleDropdown = (key: string) => () => setOpenKey(openKey === key ? null : key)

  // Chip seleccionable dentro de un dropdown
  const OptionChip = ({
    label,
    active,
    onClick,
  }: {
    label: string
    active: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-full text-sm transition-colors border"
      style={{
        backgroundColor: active ? primaryColor : surfaceColor,
        color: active ? '#ffffff' : textColor,
        borderColor: active ? primaryColor : 'transparent',
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={rootRef}
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {/* Variaciones (Color, Talla, etc.) */}
      {availableFilters.variations.map(variation => {
        const activeValue = activeFilters.variations[variation.name] ?? null
        const key = `variation:${variation.name}`
        return (
          <FilterDropdownButton
            key={variation.name}
            isOpen={openKey === key}
            onToggle={toggleDropdown(key)}
            label={variation.name}
            activeLabel={activeValue}
            textColor={textColor}
            bgColor={bgColor}
            borderColor={borderColor}
            primaryColor={primaryColor}
          >
            <div className="flex flex-wrap gap-1.5">
              {variation.values.map(value => {
                const isActive = activeValue === value
                return (
                  <OptionChip
                    key={value}
                    label={value}
                    active={isActive}
                    onClick={() => onVariationChange(variation.name, isActive ? null : value)}
                  />
                )
              })}
            </div>
          </FilterDropdownButton>
        )
      })}

      {/* Marca */}
      {availableFilters.brands.length > 0 && (
        <FilterDropdownButton
          isOpen={openKey === 'brand'}
          onToggle={toggleDropdown('brand')}
          label={t.filterBrand}
          activeLabel={activeFilters.brand}
          textColor={textColor}
          bgColor={bgColor}
          borderColor={borderColor}
          primaryColor={primaryColor}
        >
          <div className="flex flex-wrap gap-1.5">
            {availableFilters.brands.map(brand => {
              const isActive = activeFilters.brand === brand
              return (
                <OptionChip
                  key={brand}
                  label={brand}
                  active={isActive}
                  onClick={() => onFilterChange('brand', isActive ? null : brand)}
                />
              )
            })}
          </div>
        </FilterDropdownButton>
      )}

      {/* Precio */}
      {availableFilters.priceRange && (
        <FilterDropdownButton
          isOpen={openKey === 'price'}
          onToggle={toggleDropdown('price')}
          label={t.filterPrice}
          activeLabel={priceActiveLabel}
          textColor={textColor}
          bgColor={bgColor}
          borderColor={borderColor}
          primaryColor={primaryColor}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder={t.priceFrom}
                value={priceMinInput}
                onChange={e => setPriceMinInput(e.target.value)}
                onBlur={applyPriceFilter}
                onKeyDown={e => e.key === 'Enter' && applyPriceFilter()}
                className="w-24 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ color: textColor, borderColor, backgroundColor: bgColor }}
                min={availableFilters.priceRange.min}
                max={availableFilters.priceRange.max}
              />
              <span className="text-sm" style={{ color: mutedColor }}>–</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder={t.priceTo}
                value={priceMaxInput}
                onChange={e => setPriceMaxInput(e.target.value)}
                onBlur={applyPriceFilter}
                onKeyDown={e => e.key === 'Enter' && applyPriceFilter()}
                className="w-24 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ color: textColor, borderColor, backgroundColor: bgColor }}
                min={availableFilters.priceRange.min}
                max={availableFilters.priceRange.max}
              />
            </div>
            <p className="text-xs" style={{ color: mutedColor }}>
              {availableFilters.priceRange.min} – {availableFilters.priceRange.max}
            </p>
          </div>
        </FilterDropdownButton>
      )}

      {/* Limpiar todo */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onClear()
            setOpenKey(null)
          }}
          className="ml-1 text-sm underline transition-opacity hover:opacity-70"
          style={{ color: mutedColor }}
        >
          {t.filterClear}
        </button>
      )}
    </div>
  )
}
