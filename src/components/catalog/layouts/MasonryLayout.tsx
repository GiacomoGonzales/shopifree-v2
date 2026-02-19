import { useMemo } from 'react'
import type { Product } from '../../../types'
import ProductCard from '../ProductCard'
import { ScrollRevealItem } from '../ScrollRevealItem'
import { useWindowWidth } from '../../../hooks/useWindowWidth'

interface MasonryLayoutProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
  scrollReveal: boolean
}

export default function MasonryLayout({ products, onSelectProduct, onQuickAdd, scrollReveal }: MasonryLayoutProps) {
  const width = useWindowWidth()
  const columnCount = width >= 1024 ? 4 : width >= 768 ? 3 : 2

  // Distribute products round-robin into fixed columns
  const columns = useMemo(() => {
    const cols: Product[][] = Array.from({ length: columnCount }, () => [])
    products.forEach((product, i) => {
      cols[i % columnCount].push(product)
    })
    return cols
  }, [products, columnCount])

  return (
    <div
      className="grid gap-4 md:gap-6"
      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
    >
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex flex-col gap-4 md:gap-6">
          {col.map((product, rowIdx) => (
            <ScrollRevealItem
              key={product.id}
              enabled={scrollReveal}
              index={colIdx + rowIdx * columnCount}
            >
              <ProductCard
                product={product}
                onSelect={onSelectProduct}
                onQuickAdd={onQuickAdd}
                variant="masonry"
              />
            </ScrollRevealItem>
          ))}
        </div>
      ))}
    </div>
  )
}
