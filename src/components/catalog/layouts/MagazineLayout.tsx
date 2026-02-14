import type { Product } from '../../../types'
import ProductCard from '../ProductCard'
import { ScrollRevealItem } from '../ScrollRevealItem'

interface MagazineLayoutProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
  scrollReveal: boolean
}

export default function MagazineLayout({ products, onSelectProduct, onQuickAdd, scrollReveal }: MagazineLayoutProps) {
  if (products.length === 0) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product, index) => (
        <div key={product.id} className={index === 0 ? 'col-span-2 row-span-2' : ''}>
          <ScrollRevealItem enabled={scrollReveal} index={index}>
            <ProductCard
              product={product}
              onSelect={onSelectProduct}
              onQuickAdd={onQuickAdd}
              variant={index === 0 ? 'featured' : 'default'}
            />
          </ScrollRevealItem>
        </div>
      ))}
    </div>
  )
}
