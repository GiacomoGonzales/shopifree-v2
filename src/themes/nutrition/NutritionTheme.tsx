/**
 * NUTRITION THEME - "ETIQUETA NUTRICIONAL" (grocery)
 *
 * La tienda es el panel de Informacion Nutricional de un producto: bordes
 * negros gruesos, reglas finas/gruesas, "Porcion" y "% Valor Diario".
 * El catalogo son los "ingredientes". Muy reconocible para abarrotes.
 */

import { useState } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import {
  ThemeProvider, ProductGrid, ProductDrawer, CartDrawer, CartBar, CategoryCarousel,
  WhatsAppButton, StoreFooter, CheckoutDrawer, AnnouncementBar, TrustBar, FlashSaleBar, SocialProofToast,
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'
import { useHeaderLogo } from '../shared/useHeaderLogo'
import { useProductFilters } from '../shared/useProductFilters'
import SortDropdown from '../shared/SortDropdown'
import FilterPanel from '../shared/FilterPanel'

const nWhite = '#FFFFFF'
const nInk = '#0A0A0A'
const nGreen = '#2E7D32'

const nutritionTheme: ThemeConfig = {
  colors: {
    background: '#EFEFE9', surface: nWhite, surfaceHover: '#F2F2EC', text: nInk, textMuted: '#555',
    textInverted: '#FFFFFF', primary: nInk, primaryHover: '#000', accent: nGreen, border: '#0A0A0A',
    badge: nInk, badgeText: '#FFFFFF',
  },
  radius: { sm: '0', md: '0', lg: '0', xl: '0', full: '9999px' },
  fonts: { heading: "'Archivo', system-ui, sans-serif", body: "'Archivo', Arial, sans-serif" },
  shadows: { sm: 'none', md: 'none', lg: '0 10px 24px rgba(0,0,0,0.15)' },
  effects: { cardHover: 'translateY(-2px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function NutritionTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { facts: 'Informacion Nutricional', serving: 'Productos por tienda', amount: 'Cantidad por porcion', daily: '% Frescura Diaria', catalog: 'INGREDIENTES', items: 'productos', fresh: '100% FRESCO' },
    en: { facts: 'Nutrition Facts', serving: 'Items per store', amount: 'Amount per serving', daily: '% Daily Freshness', catalog: 'INGREDIENTS', items: 'items', fresh: '100% FRESH' },
    pt: { facts: 'Informacao Nutricional', serving: 'Produtos por loja', amount: 'Quantidade por porcao', daily: '% Frescor Diario', catalog: 'INGREDIENTES', items: 'produtos', fresh: '100% FRESCO' },
  }[lang]
  const rows = [
    { k: store.about?.slogan ? 'Sabor' : 'Calidad', v: 'Premium', d: '100%' },
    { k: 'Variedad', v: `${categories.length}`, d: `${Math.min(99, categories.length * 12)}%` },
    { k: 'Frescura', v: 'Alta', d: '98%' },
  ]

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={nutritionTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: '#EFEFE9', fontFamily: nutritionTheme.fonts.body, color: nInk }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: nWhite, borderBottom: `3px solid ${nInk}` }}>
          <div className="max-w-3xl mx-auto px-4 h-13 flex items-center justify-between" style={{ height: '3.25rem' }}>
            <div className="flex items-center gap-2 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate font-extrabold uppercase tracking-tight" style={{ fontSize: '1.1rem' }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1 text-xs font-extrabold uppercase" style={{ backgroundColor: nInk, color: '#fff' }}>
              CART · {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-[3.25rem]" />

        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-7 md:py-10">
          {/* Panel nutricional */}
          <div className="px-4 py-3" style={{ backgroundColor: nWhite, border: `3px solid ${nInk}`, boxShadow: nutritionTheme.shadows.lg }}>
            <div className="flex items-center justify-between">
              <h1 className="font-extrabold leading-none" style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}>{L.facts}</h1>
              <span className="text-[10px] font-bold px-2 py-1" style={{ backgroundColor: nGreen, color: '#fff' }}>{L.fresh}</span>
            </div>
            <div className="border-t mt-1 pt-1" style={{ borderColor: nInk }}>
              <p className="text-sm font-semibold">{L.serving}: {products.length}</p>
            </div>
            <div className="border-t-8 mt-1" style={{ borderColor: nInk }} />
            <p className="text-xs font-bold mt-1">{L.amount}</p>
            <div className="flex items-baseline justify-between border-b-4 pb-1" style={{ borderColor: nInk }}>
              <span className="font-extrabold text-lg">{store.name}</span>
            </div>
            <p className="text-right text-xs font-bold border-b mt-1 pb-0.5" style={{ borderColor: nInk }}>{L.daily}</p>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b py-1" style={{ borderColor: nInk }}>
                <span><strong>{r.k}</strong> {r.v}</span>
                <span className="font-bold">{r.d}</span>
              </div>
            ))}
            {store.about?.slogan && <p className="text-[11px] mt-2" style={{ color: nutritionTheme.colors.textMuted }}>* {store.about.slogan}</p>}
          </div>

          <div className="flex items-center gap-3 mt-9 mb-4">
            <span className="font-extrabold uppercase tracking-tight" style={{ fontSize: '1.3rem' }}>{L.catalog}</span>
            <span className="h-1 flex-1" style={{ backgroundColor: nInk }} />
            <span className="text-xs font-bold">{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: nInk, textMuted: nutritionTheme.colors.textMuted, border: nInk, background: nWhite, primary: nInk, surface: nutritionTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: nInk, border: nInk, background: nWhite, primary: nInk }} className="ml-auto" />
          </div>

          <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} onQuickAdd={handleAddToCart} categories={categories} />
        </div>

        <StoreFooter onWhatsAppClick={onWhatsAppClick} />
        <SocialProofToast />
        <WhatsAppButton whatsapp={store.whatsapp || ''} storeName={store.name} onClick={onWhatsAppClick} visible={totalItems === 0} />
        <CartBar totalItems={totalItems} totalPrice={totalPrice} onViewCart={() => setIsCartOpen(true)} onCheckout={() => setIsCheckoutOpen(true)} />
        {selectedProduct && <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} />}
        {isCartOpen && <CartDrawer items={items} totalPrice={totalPrice} onClose={() => setIsCartOpen(false)} onUpdateQuantity={updateQuantity} onRemoveItem={removeItem} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true) }} />}
        {isCheckoutOpen && <CheckoutDrawer items={items} totalPrice={totalPrice} store={store} onClose={() => setIsCheckoutOpen(false)} onOrderComplete={() => { clearCart(); setIsCheckoutOpen(false) }} />}
      </div>
    </ThemeProvider>
  )
}
