import type { Product, Category } from '../../types'
import ProductCard from './ProductCard'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import { ScrollRevealItem } from './ScrollRevealItem'
import MasonryLayout from './layouts/MasonryLayout'
import MagazineLayout from './layouts/MagazineLayout'
import CarouselLayout from './layouts/CarouselLayout'
import ListLayout from './layouts/ListLayout'
import { usePagination } from '../../hooks/usePagination'

interface ProductGridProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
  categories?: Category[]
  columns?: {
    sm: number
    md: number
    lg: number
  }
}

export default function ProductGrid({
  products,
  onSelectProduct,
  onQuickAdd,
  categories,
  columns = { sm: 2, md: 3, lg: 4 }
}: ProductGridProps) {
  const { theme, language } = useTheme()
  const t = getThemeTranslations(language)
  const paginationType = theme.effects.paginationType ?? 'none'

  const {
    displayedItems,
    currentPage,
    totalPages,
    hasMore,
    totalItems,
    goToPage,
    loadMore,
    sentinelRef,
  } = usePagination({ items: products, type: paginationType })

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <div
          className="w-20 h-20 mx-auto mb-6 flex items-center justify-center"
          style={{
            backgroundColor: theme.colors.surfaceHover,
            borderRadius: theme.radius.full
          }}
        >
          <svg
            className="w-10 h-10"
            style={{ color: theme.colors.border }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-lg" style={{ color: theme.colors.textMuted }}>{t.noItems}</p>
      </div>
    )
  }

  const scrollReveal = theme.effects.scrollReveal ?? false
  const layout = theme.effects.productLayout ?? 'grid'

  // Render the product layout
  let layoutContent: React.ReactNode

  if (layout === 'masonry') {
    layoutContent = <MasonryLayout products={displayedItems} onSelectProduct={onSelectProduct} onQuickAdd={onQuickAdd} scrollReveal={scrollReveal} />
  } else if (layout === 'magazine') {
    layoutContent = <MagazineLayout products={displayedItems} onSelectProduct={onSelectProduct} onQuickAdd={onQuickAdd} scrollReveal={scrollReveal} />
  } else if (layout === 'carousel') {
    layoutContent = <CarouselLayout products={displayedItems} onSelectProduct={onSelectProduct} onQuickAdd={onQuickAdd} categories={categories} />
  } else if (layout === 'list') {
    layoutContent = <ListLayout products={displayedItems} onSelectProduct={onSelectProduct} onQuickAdd={onQuickAdd} scrollReveal={scrollReveal} />
  } else {
    const gridClass = `grid grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} gap-4 md:gap-8`
    layoutContent = (
      <div className={gridClass}>
        {displayedItems.map((product, index) => (
          <ScrollRevealItem key={product.id} enabled={scrollReveal} index={index}>
            <ProductCard
              product={product}
              onSelect={onSelectProduct}
              onQuickAdd={onQuickAdd}
            />
          </ScrollRevealItem>
        ))}
      </div>
    )
  }

  // No pagination controls needed
  if (paginationType === 'none') {
    return <>{layoutContent}</>
  }

  return (
    <div>
      {layoutContent}

      {/* Showing count */}
      {paginationType !== 'none' && totalItems > 0 && (
        <p className="text-center text-sm mt-4" style={{ color: theme.colors.textMuted }}>
          {t.showingProducts.replace('{{shown}}', String(displayedItems.length)).replace('{{total}}', String(totalItems))}
        </p>
      )}

      {/* Load more button */}
      {paginationType === 'load-more' && hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.textInverted,
            }}
          >
            {t.loadMore}
          </button>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {paginationType === 'infinite-scroll' && hasMore && (
        <div ref={sentinelRef} className="h-4" />
      )}

      {/* Classic pagination */}
      {paginationType === 'classic' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: theme.colors.text }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              if (totalPages <= 7) return true
              if (page === 1 || page === totalPages) return true
              if (Math.abs(page - currentPage) <= 1) return true
              return false
            })
            .reduce<(number | 'dots')[]>((acc, page, idx, arr) => {
              if (idx > 0 && page - (arr[idx - 1]) > 1) acc.push('dots')
              acc.push(page)
              return acc
            }, [])
            .map((item, idx) =>
              item === 'dots' ? (
                <span key={`dots-${idx}`} className="px-1" style={{ color: theme.colors.textMuted }}>...</span>
              ) : (
                <button
                  key={item}
                  onClick={() => goToPage(item)}
                  className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: item === currentPage ? theme.colors.primary : 'transparent',
                    color: item === currentPage ? theme.colors.textInverted : theme.colors.text,
                  }}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: theme.colors.text }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
