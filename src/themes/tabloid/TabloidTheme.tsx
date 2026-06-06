/**
 * TABLOID THEME - "PERIODICO SENSACIONALISTA"
 *
 * Filosofia: la tienda es la portada de un tabloide.
 * - Cabecera (masthead) enorme, titulares condensados gigantes, "EXTRA!"
 * - Papel periodico, tinta negra + rojo de alarma, reglas dobles
 * - El catalogo es la "edicion del dia"
 * - Ideal para: ofertas agresivas, marcas ruidosas, lanzamientos
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

const news = '#F4F1E8'
const inkk = '#15140F'
const alarm = '#C62828'

const tabloidTheme: ThemeConfig = {
  colors: {
    background: news, surface: '#FBFAF4', surfaceHover: '#EFEBDF', text: inkk, textMuted: '#5C584C',
    textInverted: '#FFFFFF', primary: inkk, primaryHover: '#000000', accent: alarm, border: '#15140F',
    badge: alarm, badgeText: '#FFFFFF',
  },
  radius: { sm: '0', md: '0', lg: '0', xl: '0', full: '9999px' },
  fonts: { heading: "'Anton', system-ui, sans-serif", body: "'Spectral', Georgia, serif" },
  shadows: { sm: 'none', md: 'none', lg: '0 8px 20px rgba(0,0,0,0.12)' },
  effects: { cardHover: 'translateY(-2px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function TabloidTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { extra: 'EXTRA · EDICION DEL DIA', headline: 'LO QUE TODOS QUIEREN, AQUI', edition: 'EDICION', items: 'NOTAS', cart: 'CESTA', read: 'EXCLUSIVA' },
    en: { extra: 'EXTRA · TODAY EDITION', headline: 'WHAT EVERYONE WANTS, RIGHT HERE', edition: 'EDITION', items: 'STORIES', cart: 'BASKET', read: 'EXCLUSIVE' },
    pt: { extra: 'EXTRA · EDICAO DO DIA', headline: 'O QUE TODOS QUEREM, AQUI', edition: 'EDICAO', items: 'NOTAS', cart: 'CESTA', read: 'EXCLUSIVA' },
  }[lang]
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
  const issue = 1000 + (products.length * 7 % 8999)

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={tabloidTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Anton&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: news, fontFamily: tabloidTheme.fonts.body, color: inkk }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: inkk, color: news }}>
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate font-bold tracking-wide uppercase" style={{ fontFamily: tabloidTheme.fonts.heading, fontSize: '1.4rem' }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: alarm, color: '#fff' }}>
              {L.cart} · {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-12" />

        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
          {/* Masthead */}
          <div className="text-center border-y-4 py-3" style={{ borderColor: inkk }}>
            <p className="text-[11px] tracking-[0.3em] font-bold" style={{ color: alarm }}>{L.extra}</p>
            <h1 className="uppercase leading-[0.9] my-1" style={{ fontFamily: tabloidTheme.fonts.heading, fontSize: 'clamp(2.5rem, 9vw, 6rem)' }}>{store.name}</h1>
            <div className="flex items-center justify-center gap-3 text-[11px] tracking-widest uppercase" style={{ color: tabloidTheme.colors.textMuted }}>
              <span>{L.edition} #{issue}</span><span>•</span><span>{today}</span>
            </div>
          </div>

          {/* Portada: titular + foto */}
          <div className="grid md:grid-cols-3 gap-5 mt-6 pb-6 border-b-2" style={{ borderColor: inkk }}>
            <div className="md:col-span-2">
              <span className="inline-block text-[11px] font-bold px-2 py-0.5 mb-2 uppercase tracking-widest" style={{ backgroundColor: alarm, color: '#fff' }}>{L.read}</span>
              <h2 className="uppercase leading-[0.95]" style={{ fontFamily: tabloidTheme.fonts.heading, fontSize: 'clamp(1.8rem, 5vw, 3.2rem)' }}>
                {store.about?.slogan || L.headline}
              </h2>
            </div>
            <div>
              {hasHero ? (
                <figure>
                  <div className="overflow-hidden" style={{ border: `2px solid ${inkk}` }}>
                    <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full max-h-[240px] object-cover" style={{ filter: 'grayscale(35%) contrast(1.05)' }} />
                  </div>
                  <figcaption className="text-[11px] italic mt-1" style={{ color: tabloidTheme.colors.textMuted }}>▲ {store.name}</figcaption>
                </figure>
              ) : (
                <div className="h-full min-h-[140px] flex items-center justify-center border-2 border-dashed" style={{ borderColor: tabloidTheme.colors.border }}>
                  <span style={{ fontFamily: tabloidTheme.fonts.heading, fontSize: '2.5rem' }}>★</span>
                </div>
              )}
            </div>
          </div>

          {/* Seccion */}
          <div className="flex items-center gap-3 mt-7 mb-4">
            <span className="uppercase" style={{ fontFamily: tabloidTheme.fonts.heading, fontSize: '1.4rem' }}>{L.items}</span>
            <span className="h-[3px] flex-1" style={{ backgroundColor: inkk }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: tabloidTheme.colors.textMuted }}>{filteredProducts.length}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: inkk, textMuted: tabloidTheme.colors.textMuted, border: inkk, background: news, primary: inkk, surface: tabloidTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: inkk, border: inkk, background: news, primary: inkk }} className="ml-auto" />
          </div>

          <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} onQuickAdd={handleAddToCart} categories={categories} />

          <div className="text-center mt-8 pt-4 border-t-4" style={{ borderColor: inkk }}>
            <p className="uppercase tracking-[0.3em] text-xs" style={{ color: tabloidTheme.colors.textMuted }}>— {store.subdomain ? store.subdomain.toUpperCase() : store.name.toUpperCase()} —</p>
          </div>
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
