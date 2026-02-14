import type { Product } from '../../../types'
import ProductCard from '../ProductCard'
import { ScrollRevealItem } from '../ScrollRevealItem'

interface ListLayoutProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product) => void
  scrollReveal: boolean
}

export default function ListLayout({ products, onSelectProduct, onQuickAdd, scrollReveal }: ListLayoutProps) {
  return (
    <div className="flex flex-col gap-4">
      {products.map((product, index) => (
        <ScrollRevealItem key={product.id} enabled={scrollReveal} index={index}>
          <ProductCard
            product={product}
            onSelect={onSelectProduct}
            onQuickAdd={onQuickAdd}
            variant="horizontal"
          />
        </ScrollRevealItem>
      ))}
    </div>
  )
}
