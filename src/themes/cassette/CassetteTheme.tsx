/**
 * CASSETTE THEME - "MIXTAPE / CASETE"
 *
 * Filosofia: la tienda es un casete de los 80/90.
 * - Cuerpo de casete con dos carretes que giran + etiqueta "LADO A"
 * - Plastico oscuro translucido, acentos neon, tipografia manuscrita
 * - El catalogo es el "tracklist" del mixtape
 * - Ideal para: musica, streetwear, retro/nostalgia, marcas jovenes
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

const plastic = '#211E2B'
const cream = '#F2E9DC'
const neon = '#FF5DA2'
const cyan = '#3DD6D0'

const cassetteTheme: ThemeConfig = {
  colors: {
    background: plastic, surface: '#2B2735', surfaceHover: '#332E3F', text: cream, textMuted: '#A79FB4',
    textInverted: '#211E2B', primary: neon, primaryHover: '#F0408F', accent: cyan, border: '#3E3850',
    badge: neon, badgeText: '#211E2B',
  },
  radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
  fonts: { heading: "'Permanent Marker', cursive", body: "'Space Grotesk', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.4)', md: '0 6px 18px rgba(0,0,0,0.5)', lg: '0 20px 44px rgba(0,0,0,0.55)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: true },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function CassetteTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { side: 'LADO A', tracklist: 'TRACKLIST', items: 'pistas', play: 'REPRODUCIR' },
    en: { side: 'SIDE A', tracklist: 'TRACKLIST', items: 'tracks', play: 'PLAY' },
    pt: { side: 'LADO A', tracklist: 'TRACKLIST', items: 'faixas', play: 'TOCAR' },
  }[lang]

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  const reel = (
    <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ border: `3px solid ${cream}`, backgroundColor: '#1a1722' }}>
      <div className="w-12 h-12 rounded-full animate-spin" style={{ animationDuration: '3.5s', background: `repeating-conic-gradient(${cream} 0deg 12deg, transparent 12deg 30deg)`, WebkitMaskImage: 'radial-gradient(circle, transparent 5px, #000 6px)', maskImage: 'radial-gradient(circle, transparent 5px, #000 6px)' }} />
      <div className="absolute w-3 h-3 rounded-full" style={{ backgroundColor: cream }} />
    </div>
  )

  return (
    <ThemeProvider theme={cassetteTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: plastic, fontFamily: cassetteTheme.fonts.body, color: cream }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: '#1a1722', borderBottom: `1px solid ${cassetteTheme.colors.border}` }}>
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate text-xl" style={{ fontFamily: cassetteTheme.fonts.heading, color: neon }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-transform hover:scale-105" style={{ backgroundColor: neon, color: plastic }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 md:py-10">
          {/* Casete */}
          <div className="mx-auto max-w-xl p-5 md:p-7" style={{ background: 'linear-gradient(160deg, #322B40, #221E2C)', borderRadius: '0.9rem', boxShadow: cassetteTheme.shadows.lg, border: `1px solid ${cassetteTheme.colors.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: cyan, color: plastic }}>{L.side}</span>
              <span className="text-xs tracking-widest" style={{ color: cassetteTheme.colors.textMuted }}>STEREO · Dolby</span>
            </div>
            {/* Etiqueta manuscrita */}
            <div className="px-4 py-3 mb-5 rounded" style={{ backgroundColor: cream, color: plastic }}>
              <p className="text-2xl md:text-3xl leading-none" style={{ fontFamily: cassetteTheme.fonts.heading }}>{store.name}</p>
              {store.about?.slogan && <p className="text-sm mt-1" style={{ color: '#5a5566' }}>{store.about.slogan}</p>}
            </div>
            {/* Ventana con carretes */}
            <div className="flex items-center justify-around py-4 rounded-lg" style={{ backgroundColor: '#15121d', border: `2px solid ${cassetteTheme.colors.border}` }}>
              {reel}
              <div className="flex-1 mx-3 h-6 rounded-sm" style={{ background: `repeating-linear-gradient(90deg, ${cassetteTheme.colors.border} 0 6px, transparent 6px 10px)` }} />
              {reel}
            </div>
            <div className="flex justify-center gap-3 mt-4">
              {[0, 1, 2].map(i => <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: i === 0 ? neon : cassetteTheme.colors.border }} />)}
            </div>
          </div>

          {/* Tracklist = catalogo */}
          <div className="flex items-center gap-3 mt-9 mb-5">
            <span className="text-lg" style={{ fontFamily: cassetteTheme.fonts.heading, color: cyan }}>{L.tracklist}</span>
            <span className="h-px flex-1" style={{ backgroundColor: cassetteTheme.colors.border }} />
            <span className="text-xs" style={{ color: cassetteTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: cream, textMuted: cassetteTheme.colors.textMuted, border: cassetteTheme.colors.border, background: cassetteTheme.colors.surface, primary: neon, surface: cassetteTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: cream, border: cassetteTheme.colors.border, background: cassetteTheme.colors.surface, primary: neon }} className="ml-auto" />
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
