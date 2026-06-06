/**
 * TAG THEME - "ETIQUETA DE ROPA" (retail)
 *
 * La tienda es una etiqueta colgante (swing tag) de boutique: cartulina kraft,
 * ojal con hilo, nombre estampado y "NEW ARRIVALS". El catalogo es la coleccion.
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
import HeroImg from '../../components/catalog/HeroImg'
import { useProductFilters } from '../shared/useProductFilters'
import SortDropdown from '../shared/SortDropdown'
import FilterPanel from '../shared/FilterPanel'

const paperT = '#F1ECE3'
const kraft = '#E3D2A8'
const inkT = '#2A2622'
const tagRed = '#B23A30'

const tagTheme: ThemeConfig = {
  colors: {
    background: paperT, surface: '#FFFFFF', surfaceHover: '#EFEAE1', text: inkT, textMuted: '#7C7468',
    textInverted: '#FFFFFF', primary: inkT, primaryHover: '#000000', accent: tagRed, border: '#DDD3C2',
    badge: inkT, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
  fonts: { heading: "'Oswald', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(42,38,34,0.08)', md: '0 6px 16px rgba(42,38,34,0.12)', lg: '0 18px 38px rgba(42,38,34,0.16)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function TagTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { tagline: 'NUEVA COLECCION', collection: 'COLECCION', items: 'prendas', sku: 'SKU' },
    en: { tagline: 'NEW ARRIVALS', collection: 'COLLECTION', items: 'items', sku: 'SKU' },
    pt: { tagline: 'NOVA COLECAO', collection: 'COLECAO', items: 'pecas', sku: 'SKU' },
  }[lang]

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={tagTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: paperT, fontFamily: tagTheme.fonts.body, color: inkT }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: paperT, borderBottom: `1px solid ${tagTheme.colors.border}` }}>
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate uppercase tracking-[0.15em]" style={{ fontFamily: tagTheme.fonts.heading, fontSize: '1.25rem' }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: inkT, color: '#fff' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-8 md:py-12">
          {/* Etiqueta colgante */}
          <div className="relative mx-auto max-w-md">
            <div className="mx-auto w-px h-8" style={{ backgroundColor: '#A99B7E' }} />
            <div className="relative px-6 pt-8 pb-6 text-center" style={{ backgroundColor: kraft, borderRadius: '0.75rem', boxShadow: tagTheme.shadows.lg }}>
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 w-6 h-6 rounded-full" style={{ backgroundColor: paperT, border: `2px solid #A99B7E` }} />
              <p className="text-[11px] tracking-[0.35em] font-bold" style={{ color: tagRed }}>{L.tagline}</p>
              <h1 className="uppercase leading-none my-2" style={{ fontFamily: tagTheme.fonts.heading, fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}>{store.name}</h1>
              {store.about?.slogan && <p className="text-sm" style={{ color: '#6B6253' }}>{store.about.slogan}</p>}
              <div className="mt-4 mx-auto h-8 flex items-end justify-center gap-[2px]" aria-hidden>
                {Array.from({ length: 24 }).map((_, i) => <span key={i} style={{ width: i % 4 === 0 ? '3px' : '1px', height: '100%', backgroundColor: inkT }} />)}
              </div>
              <p className="text-[11px] tracking-widest mt-1" style={{ color: '#6B6253' }}>{L.sku} {store.subdomain ? store.subdomain.toUpperCase() : 'STORE'}</p>
            </div>
          </div>

          {hasHero && (
            <div className="mt-8 overflow-hidden rounded-lg" style={{ border: `1px solid ${tagTheme.colors.border}` }}>
              <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full aspect-[16/6] object-cover" />
            </div>
          )}

          <div className="flex items-center gap-3 mt-9 mb-5">
            <span className="uppercase tracking-[0.25em]" style={{ fontFamily: tagTheme.fonts.heading, fontSize: '1.2rem' }}>{L.collection}</span>
            <span className="h-px flex-1" style={{ backgroundColor: tagTheme.colors.border }} />
            <span className="text-xs" style={{ color: tagTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: inkT, textMuted: tagTheme.colors.textMuted, border: tagTheme.colors.border, background: '#fff', primary: inkT, surface: tagTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: inkT, border: tagTheme.colors.border, background: '#fff', primary: inkT }} className="ml-auto" />
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
