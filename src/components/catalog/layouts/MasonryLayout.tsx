import type { Product } from '../../../types'
import ProductCard from '../ProductCard'
import { ScrollRevealItem } from '../ScrollRevealItem'

interface MasonryLayoutProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
  scrollReveal: boolean
}

export default function MasonryLayout({ products, onSelectProduct, onQuickAdd, scrollReveal }: MasonryLayoutProps) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6">
      {products.map((product, index) => (
        <ScrollRevealItem key={product.id} enabled={scrollReveal} index={index}>
          <div className="break-inside-avoid mb-4 md:mb-6">
            <ProductCard
              product={product}
              onSelect={onSelectProduct}
              onQuickAdd={onQuickAdd}
              variant="masonry"
            />
          </div>
        </ScrollRevealItem>
      ))}
    </div>
  )
}
