import type { Product } from '../../types'
import ProductCard from './ProductCard'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import { ScrollRevealItem } from './ScrollRevealItem'

interface ProductGridProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
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
  columns = { sm: 2, md: 3, lg: 4 }
}: ProductGridProps) {
  const { theme, language } = useTheme()
  const t = getThemeTranslations(language)

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

  const gridClass = `grid grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} gap-4 md:gap-8`

  const scrollReveal = theme.effects.scrollReveal ?? false

  return (
    <div className={gridClass}>
      {products.map((product, index) => (
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
