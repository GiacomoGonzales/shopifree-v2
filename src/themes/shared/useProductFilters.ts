/**
 * useProductFilters
 * =====================================================
 * Hook compartido para los 70+ temas del storefront.
 *
 * Centraliza toda la logica de ordenamiento + filtrado de productos
 * en un solo lugar, para que cada tema solo tenga que llamarlo en
 * lugar de re-implementar la logica.
 *
 * Caracteristicas clave:
 * - Auto-deteccion: solo expone filtros que tengan sentido para
 *   el catalogo real (no muestra "Talla" si ningun producto tiene
 *   variante de talla, no muestra "Marca" si todos los productos
 *   tienen la misma marca, etc.).
 * - Mantiene compatibilidad con el filtro activeCategory que ya
 *   existia en cada tema (es solo un caso particular).
 * - Sin acoplamiento a UI: devuelve datos + setters, los temas
 *   eligen como renderizarlos.
 *
 * Uso minimo:
 *   const { filteredProducts } = useProductFilters(products, categories)
 *
 * Uso completo:
 *   const {
 *     filteredProducts,
 *     availableFilters,    // que filtros mostrar
 *     activeFilters,       // estado actual
 *     setFilter,           // cambiar un filtro
 *     clearFilters,        // resetear todo
 *     hasActiveFilters,    // hay algun filtro aplicado?
 *     sortBy,
 *     setSortBy,
 *   } = useProductFilters(products, categories)
 */

import { useMemo, useState, useCallback } from 'react'
import type { Product, Category } from '../../types'

// =====================================================
// TIPOS
// =====================================================

export type SortBy = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name-asc'

export interface ActiveFilters {
  /** ID de categoria seleccionada, o null para "Todos" */
  categoryId: string | null
  /** Marca seleccionada, o null para todas */
  brand: string | null
  /** Precio minimo, o null si no se filtra */
  priceMin: number | null
  /** Precio maximo, o null si no se filtra */
  priceMax: number | null
  /** Variantes seleccionadas: { "Color": "Rojo", "Talla": "M" } */
  variations: Record<string, string>
}

export interface VariationFilter {
  /** Nombre de la variacion tal como lo escribio el dueno: "Color", "Talla", "Sabor" */
  name: string
  /** Valores unicos detectados en los productos para esa variacion */
  values: string[]
}

export interface AvailableFilters {
  /** Categorias que tienen al menos un producto. Vacio si no hay >=2 categorias activas. */
  categories: Category[]
  /** Marcas detectadas en los productos. Vacio si no hay >=2 marcas distintas. */
  brands: string[]
  /** Rango de precios del catalogo. null si todos los productos cuestan lo mismo o no vale filtrar. */
  priceRange: { min: number; max: number } | null
  /** Variaciones detectadas (Color, Talla, etc.) con sus valores unicos. */
  variations: VariationFilter[]
}

export interface UseProductFiltersResult {
  filteredProducts: Product[]
  availableFilters: AvailableFilters
  activeFilters: ActiveFilters
  setFilter: <K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]) => void
  /** Helper especifico para variaciones, mas comodo desde la UI */
  setVariationFilter: (variationName: string, value: string | null) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  sortBy: SortBy
  setSortBy: (sort: SortBy) => void
}

// =====================================================
// CONSTANTES DE AUTO-DETECCION
// =====================================================

/**
 * Diferencia minima entre min y max de precios para que valga la pena
 * mostrar el filtro de precio. Si todos los productos cuestan entre $10 y $12,
 * no aporta nada poder filtrar por precio.
 */
const MIN_PRICE_RANGE_TO_SHOW = 10

/**
 * Cantidad minima de valores distintos para mostrar un filtro de variacion
 * o de marca. Si todo es del mismo color, no hay nada que filtrar.
 */
const MIN_DISTINCT_VALUES = 2

// =====================================================
// ESTADO INICIAL
// =====================================================

const INITIAL_FILTERS: ActiveFilters = {
  categoryId: null,
  brand: null,
  priceMin: null,
  priceMax: null,
  variations: {},
}

// =====================================================
// HOOK
// =====================================================

export function useProductFilters(
  products: Product[],
  categories: Category[]
): UseProductFiltersResult {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(INITIAL_FILTERS)
  const [sortBy, setSortBy] = useState<SortBy>('featured')

  // ---------------------------------------------------
  // AUTO-DETECCION: que filtros mostrar
  // ---------------------------------------------------
  const availableFilters = useMemo<AvailableFilters>(() => {
    // 1. Categorias: solo las que tienen >=1 producto, y solo si hay >=2 categorias
    const categoryIdsWithProducts = new Set(
      products
        .map(p => p.categoryId)
        .filter((id): id is string => !!id)
    )
    const relevantCategories = categories.filter(c => categoryIdsWithProducts.has(c.id))
    const showCategories = relevantCategories.length >= MIN_DISTINCT_VALUES

    // 2. Marcas: distintas, ignorando vacias/undefined
    const brandSet = new Set<string>()
    products.forEach(p => {
      if (p.brand && p.brand.trim()) brandSet.add(p.brand.trim())
    })
    const brands = Array.from(brandSet).sort()
    const showBrands = brands.length >= MIN_DISTINCT_VALUES

    // 3. Rango de precios
    let priceRange: { min: number; max: number } | null = null
    if (products.length > 0) {
      const prices = products.map(p => p.price).filter(p => typeof p === 'number')
      if (prices.length > 0) {
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        if (max - min >= MIN_PRICE_RANGE_TO_SHOW) {
          priceRange = { min: Math.floor(min), max: Math.ceil(max) }
        }
      }
    }

    // 4. Variaciones (Color, Talla, etc.) — escaneamos ambos modelos
    //    - product.variations[]   (modelo legacy: cada variation tiene options[])
    //    - product.combinations[] (modelo moderno: matriz de combinaciones)
    const variationMap = new Map<string, Set<string>>()

    products.forEach(p => {
      // Modelo legacy
      p.variations?.forEach(v => {
        if (!v.name) return
        if (!variationMap.has(v.name)) variationMap.set(v.name, new Set())
        const set = variationMap.get(v.name)!
        v.options?.forEach(opt => {
          if (opt.value && opt.available !== false) set.add(opt.value)
        })
      })

      // Modelo moderno (combinations)
      p.combinations?.forEach(c => {
        if (!c.options) return
        Object.entries(c.options).forEach(([variationName, value]) => {
          if (!variationName || !value) return
          if (c.available === false) return
          if (!variationMap.has(variationName)) variationMap.set(variationName, new Set())
          variationMap.get(variationName)!.add(value)
        })
      })
    })

    const variations: VariationFilter[] = []
    variationMap.forEach((valueSet, name) => {
      const values = Array.from(valueSet).sort()
      // Solo mostrar la variacion si hay 2+ valores distintos
      if (values.length >= MIN_DISTINCT_VALUES) {
        variations.push({ name, values })
      }
    })

    return {
      categories: showCategories ? relevantCategories : [],
      brands: showBrands ? brands : [],
      priceRange,
      variations,
    }
  }, [products, categories])

  // ---------------------------------------------------
  // FILTRADO
  // ---------------------------------------------------
  const filtered = useMemo(() => {
    return products.filter(p => {
      // Categoria
      if (activeFilters.categoryId && p.categoryId !== activeFilters.categoryId) {
        return false
      }

      // Marca
      if (activeFilters.brand && p.brand !== activeFilters.brand) {
        return false
      }

      // Precio min
      if (activeFilters.priceMin !== null && p.price < activeFilters.priceMin) {
        return false
      }

      // Precio max
      if (activeFilters.priceMax !== null && p.price > activeFilters.priceMax) {
        return false
      }

      // Variaciones: cada variacion activa debe matchear en alguna variant del producto
      for (const [variationName, requiredValue] of Object.entries(activeFilters.variations)) {
        if (!requiredValue) continue

        const hasInLegacy = p.variations?.some(
          v => v.name === variationName && v.options?.some(o => o.value === requiredValue && o.available !== false)
        )

        const hasInCombinations = p.combinations?.some(
          c => c.options?.[variationName] === requiredValue && c.available !== false
        )

        if (!hasInLegacy && !hasInCombinations) return false
      }

      return true
    })
  }, [products, activeFilters])

  // ---------------------------------------------------
  // ORDENAMIENTO
  // ---------------------------------------------------
  const filteredProducts = useMemo(() => {
    // copia para no mutar
    const result = [...filtered]

    switch (sortBy) {
      case 'newest':
        return result.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return bTime - aTime
        })

      case 'price-asc':
        return result.sort((a, b) => a.price - b.price)

      case 'price-desc':
        return result.sort((a, b) => b.price - a.price)

      case 'name-asc':
        return result.sort((a, b) => a.name.localeCompare(b.name))

      case 'featured':
      default:
        // Destacados primero, luego por campo `order` ascendente
        return result.sort((a, b) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
          const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
          return aOrder - bOrder
        })
    }
  }, [filtered, sortBy])

  // ---------------------------------------------------
  // SETTERS
  // ---------------------------------------------------
  const setFilter = useCallback(
    <K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]) => {
      setActiveFilters(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  const setVariationFilter = useCallback((variationName: string, value: string | null) => {
    setActiveFilters(prev => {
      const next = { ...prev.variations }
      if (value === null) {
        delete next[variationName]
      } else {
        next[variationName] = value
      }
      return { ...prev, variations: next }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setActiveFilters(INITIAL_FILTERS)
  }, [])

  // ---------------------------------------------------
  // DERIVADOS
  // ---------------------------------------------------
  const hasActiveFilters =
    activeFilters.categoryId !== null ||
    activeFilters.brand !== null ||
    activeFilters.priceMin !== null ||
    activeFilters.priceMax !== null ||
    Object.keys(activeFilters.variations).length > 0

  return {
    filteredProducts,
    availableFilters,
    activeFilters,
    setFilter,
    setVariationFilter,
    clearFilters,
    hasActiveFilters,
    sortBy,
    setSortBy,
  }
}
