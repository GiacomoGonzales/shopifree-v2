/**
 * SWATCH THEME - "CARTA DE TONOS" (cosmetics)
 *
 * La tienda es una carta de muestras de maquillaje: fila de swatches de color
 * con nombre y numero, estetica beauty editorial. El catalogo es la coleccion.
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

const swBg = '#F6ECE8'
const swInk = '#3A2D2D'
const swRose = '#C0726E'
const swGold = '#B79268'

const swatchTheme: ThemeConfig = {
  colors: {
    background: swBg, surface: '#FFFFFF', surfaceHover: '#F1E4DF', text: swInk, textMuted: '#9A8580',
    textInverted: '#FFFFFF', primary: swInk, primaryHover: '#241B1B', accent: swRose, border: '#E7D6D0',
    badge: swInk, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem', full: '9999px' },
  fonts: { heading: "'Italiana', Georgia, serif", body: "'Jost', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(58,45,45,0.06)', md: '0 6px 18px rgba(58,45,45,0.10)', lg: '0 20px 44px rgba(58,45,45,0.14)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

const shades = [
  { c: '#E7C7B8', n: 'Nude' }, { c: '#D89A8C', n: 'Rose' }, { c: '#C0726E', n: 'Blush' },
  { c: '#A14E52', n: 'Berry' }, { c: '#7E3B3F', n: 'Wine' }, { c: '#B79268', n: 'Honey' },
]

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function SwatchTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'circle' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { tagline: 'NUEVA COLECCION', shades: 'NUESTROS TONOS', collection: 'COLECCION', items: 'productos' },
    en: { tagline: 'NEW COLLECTION', shades: 'OUR SHADES', collection: 'COLLECTION', items: 'products' },
    pt: { tagline: 'NOVA COLECAO', shades: 'NOSSOS TONS', collection: 'COLECAO', items: 'produtos' },
  }[lang]

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={swatchTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Italiana&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: swBg, fontFamily: swatchTheme.fonts.body, color: swInk }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: `${swBg}f0`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${swatchTheme.colors.border}` }}>
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate tracking-[0.2em]" style={{ fontFamily: swatchTheme.fonts.heading, fontSize: '1.4rem' }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase transition-colors hover:opacity-90" style={{ backgroundColor: swInk, color: '#fff' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-9 md:py-14">
          {/* Portada */}
          <div className="text-center">
            <p className="text-[11px] tracking-[0.4em]" style={{ color: swRose }}>{L.tagline}</p>
            <h1 className="my-2" style={{ fontFamily: swatchTheme.fonts.heading, fontSize: 'clamp(2.6rem, 8vw, 4.5rem)', letterSpacing: '0.04em' }}>{store.name}</h1>
            {store.about?.slogan && <p className="text-sm md:text-base" style={{ color: swatchTheme.colors.textMuted }}>{store.about.slogan}</p>}
          </div>

          {/* Carta de swatches */}
          <div className="mt-8">
            <p className="text-center text-[11px] tracking-[0.3em] mb-4" style={{ color: swGold }}>{L.shades}</p>
            <div className="flex flex-wrap justify-center gap-5 sm:gap-7">
              {shades.map((s, i) => (
                <div key={s.n} className="flex flex-col items-center gap-1.5">
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full" style={{ backgroundColor: s.c, boxShadow: swatchTheme.shadows.md, border: '3px solid #fff' }} />
                  <span className="text-[11px] tracking-wide" style={{ color: swatchTheme.colors.textMuted }}>{String(i + 1).padStart(2, '0')} · {s.n}</span>
                </div>
              ))}
            </div>
          </div>

          {hasHero && (
            <div className="mt-9 overflow-hidden" style={{ borderRadius: '1.5rem' }}>
              <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full aspect-[16/6] object-cover" />
            </div>
          )}

          <div className="flex items-center gap-3 mt-10 mb-5">
            <span className="tracking-[0.2em]" style={{ fontFamily: swatchTheme.fonts.heading, fontSize: '1.4rem' }}>{L.collection}</span>
            <span className="h-px flex-1" style={{ backgroundColor: swatchTheme.colors.border }} />
            <span className="text-xs" style={{ color: swatchTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: swInk, textMuted: swatchTheme.colors.textMuted, border: swatchTheme.colors.border, background: '#fff', primary: swInk, surface: swatchTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: swInk, border: swatchTheme.colors.border, background: '#fff', primary: swInk }} className="ml-auto" />
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
