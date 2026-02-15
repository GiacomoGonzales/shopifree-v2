import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type { Product, Category } from '../../../types'
import ProductCard from '../ProductCard'
import { useTheme } from '../ThemeContext'

interface CarouselLayoutProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
  categories?: Category[]
}

export default function CarouselLayout({ products, onSelectProduct, onQuickAdd, categories }: CarouselLayoutProps) {
  const { theme, language } = useTheme()

  // Group products by category
  const sections = useMemo(() => {
    if (!categories?.length) {
      return [{ id: 'all', name: '', products }]
    }

    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const grouped = new Map<string, Product[]>()
    const uncategorized: Product[] = []

    for (const product of products) {
      if (product.categoryId && categoryMap.has(product.categoryId)) {
        const existing = grouped.get(product.categoryId) || []
        existing.push(product)
        grouped.set(product.categoryId, existing)
      } else {
        uncategorized.push(product)
      }
    }

    const result: { id: string; name: string; products: Product[] }[] = []

    // Follow category order
    for (const cat of categories) {
      const catProducts = grouped.get(cat.id)
      if (catProducts?.length) {
        result.push({ id: cat.id, name: cat.name, products: catProducts })
      }
    }

    if (uncategorized.length) {
      const label = language === 'en' ? 'Other' : language === 'pt' ? 'Outros' : 'Otros'
      result.push({ id: 'other', name: label, products: uncategorized })
    }

    // If only one section, don't show title
    if (result.length === 1) {
      return [{ ...result[0], name: '' }]
    }

    return result
  }, [products, categories, language])

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <CarouselRow
          key={section.id}
          title={section.name}
          products={section.products}
          onSelectProduct={onSelectProduct}
          onQuickAdd={onQuickAdd}
          theme={theme}
        />
      ))}
    </div>
  )
}

interface CarouselRowProps {
  title: string
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
  theme: ReturnType<typeof useTheme>['theme']
}

function CarouselRow({ title, products, onSelectProduct, onQuickAdd, theme }: CarouselRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [updateScrollState, products.length])

  const scroll = (direction: 'left' | 'right') => {
    const el = containerRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.8
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
  }

  return (
    <div>
      {title && (
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
        >
          {title}
        </h3>
      )}
      <div className="relative group/carousel -mx-4 md:mx-0">
        <div
          ref={containerRef}
          className="flex gap-4 md:gap-6 overflow-x-auto carousel-container pb-2 scroll-pl-4 md:scroll-pl-0"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`carousel-item w-[calc(50vw-24px)] md:w-[calc(33.33%-11px)] lg:w-[calc(25%-12px)]${index === 0 ? ' ml-4 md:ml-0' : ''}${index === products.length - 1 ? ' mr-4 md:mr-0' : ''}`}
            >
              <ProductCard
                product={product}
                onSelect={onSelectProduct}
                onQuickAdd={onQuickAdd}
              />
            </div>
          ))}
        </div>

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-10 h-10 items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.full,
              boxShadow: theme.shadows.lg,
              color: theme.colors.text,
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-10 h-10 items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.full,
              boxShadow: theme.shadows.lg,
              color: theme.colors.text,
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
