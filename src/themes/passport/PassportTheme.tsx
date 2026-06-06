/**
 * PASSPORT THEME - "PASAPORTE"
 *
 * Filosofia: la tienda es un pasaporte de viaje.
 * - Portada azul marino con dorado, paginas crema con guilloche sutil
 * - Sellos de entrada rotados, zona MRZ legible por maquina al pie
 * - El catalogo son las "paginas" del documento
 * - Ideal para: viajes, marcas premium con narrativa, ediciones limitadas
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

const cover = '#1B2A4A'
const gold = '#C8A24B'
const page = '#F5F0E6'
const pink = '#9E3B36'

const passportTheme: ThemeConfig = {
  colors: {
    background: '#E8E0CE', surface: page, surfaceHover: '#EDE6D6', text: '#23324E', textMuted: '#7A7460',
    textInverted: '#FFFFFF', primary: cover, primaryHover: '#13203A', accent: gold, border: '#D8CDB2',
    badge: cover, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
  fonts: { heading: "'Marcellus', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(27,42,74,0.08)', md: '0 6px 18px rgba(27,42,74,0.12)', lg: '0 20px 44px rgba(27,42,74,0.20)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

const guilloche =
  'repeating-radial-gradient(circle at 15% 20%, rgba(27,42,74,0.04) 0 1px, transparent 1px 9px),' +
  'repeating-radial-gradient(circle at 85% 70%, rgba(200,162,75,0.05) 0 1px, transparent 1px 11px)'

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function PassportTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { title: 'PASAPORTE', type: 'TIPO', code: 'CODIGO', surname: 'TIENDA', given: 'LEMA', pages: 'PAGINAS', visited: 'VISITADO', items: 'sellos' },
    en: { title: 'PASSPORT', type: 'TYPE', code: 'CODE', surname: 'STORE', given: 'MOTTO', pages: 'PAGES', visited: 'ADMITTED', items: 'stamps' },
    pt: { title: 'PASSAPORTE', type: 'TIPO', code: 'CODIGO', surname: 'LOJA', given: 'LEMA', pages: 'PAGINAS', visited: 'VISITADO', items: 'selos' },
  }[lang]
  const code = (store.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'STR')
  const surname = store.name.toUpperCase().replace(/[^A-Z0-9]/g, '<').slice(0, 18)
  const mrz1 = `P<${code}${surname}`.padEnd(44, '<').slice(0, 44)
  const mrz2 = `${code}${String(1000000 + (products.length * 13 % 8999999))}<${code}`.padEnd(44, '<').slice(0, 44)
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={passportTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: '#E8E0CE', fontFamily: passportTheme.fonts.body, color: '#23324E' }}>
        <AnnouncementBar />

        {/* Portada (sticky header) */}
        <header className="sticky top-0 z-50" style={{ backgroundColor: cover, color: gold }}>
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              <svg className="w-5 h-5" style={{ color: gold }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.5 7.1 17.2 8 11.7l-4-3.9L9.5 7z" /></svg>
              {showName && <span className="truncate tracking-[0.2em]" style={{ fontFamily: passportTheme.fonts.heading, fontSize: '1.2rem' }}>{store.name.toUpperCase()}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors hover:bg-white/10" style={{ border: `1px solid ${gold}` }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 md:py-9">
          {/* Pagina de datos */}
          <div className="relative overflow-hidden" style={{ backgroundColor: page, backgroundImage: guilloche, borderRadius: '0.6rem', boxShadow: passportTheme.shadows.lg, border: `1px solid ${passportTheme.colors.border}` }}>
            {/* Sello rotado */}
            <div className="absolute right-4 top-6 -rotate-12 text-center px-3 py-2 rounded-full hidden sm:block" style={{ border: `2.5px solid ${pink}`, color: pink, opacity: 0.85 }}>
              <p className="text-[10px] font-bold tracking-widest leading-none">{L.visited}</p>
              <p className="text-[11px] font-bold leading-tight">{today}</p>
            </div>

            <div className="p-5 md:p-8">
              <div className="flex items-center justify-between border-b-2 pb-2 mb-5" style={{ borderColor: passportTheme.colors.border }}>
                <span style={{ fontFamily: passportTheme.fonts.heading, letterSpacing: '0.3em', fontSize: '1.1rem' }}>{L.title}</span>
                <span className="text-xs tracking-widest" style={{ color: passportTheme.colors.textMuted }}>{L.type} P · {code}</span>
              </div>

              <div className="flex gap-5">
                {/* Foto */}
                <div className="w-24 sm:w-32 flex-shrink-0">
                  <div className="overflow-hidden" style={{ border: `1px solid ${passportTheme.colors.border}`, aspectRatio: '3/4', backgroundColor: '#fff' }}>
                    {hasHero
                      ? <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full h-full object-cover" style={{ filter: 'grayscale(20%)' }} />
                      : <div className="w-full h-full flex items-center justify-center" style={{ fontFamily: passportTheme.fonts.heading, fontSize: '2.5rem', color: passportTheme.colors.border }}>{store.name.charAt(0).toUpperCase()}</div>}
                  </div>
                </div>
                {/* Campos */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div><p className="text-[10px] tracking-widest" style={{ color: passportTheme.colors.textMuted }}>{L.surname}</p><p className="truncate" style={{ fontFamily: passportTheme.fonts.heading, fontSize: '1.5rem' }}>{store.name}</p></div>
                  {store.about?.slogan && <div><p className="text-[10px] tracking-widest" style={{ color: passportTheme.colors.textMuted }}>{L.given}</p><p className="text-sm">{store.about.slogan}</p></div>}
                  <div className="flex gap-6">
                    <div><p className="text-[10px] tracking-widest" style={{ color: passportTheme.colors.textMuted }}>{L.code}</p><p className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{code}-{1000 + (products.length % 9000)}</p></div>
                    <div><p className="text-[10px] tracking-widest" style={{ color: passportTheme.colors.textMuted }}>{L.pages}</p><p className="font-semibold">{filteredProducts.length}</p></div>
                  </div>
                </div>
              </div>

              {/* MRZ */}
              <div className="mt-6 pt-3 border-t" style={{ borderColor: passportTheme.colors.border }}>
                <p className="truncate text-[13px] sm:text-base tracking-[0.08em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2A3A56' }}>{mrz1}</p>
                <p className="truncate text-[13px] sm:text-base tracking-[0.08em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2A3A56' }}>{mrz2}</p>
              </div>
            </div>
          </div>

          {/* Paginas = catalogo */}
          <div className="flex items-center gap-3 mt-9 mb-5">
            <span style={{ fontFamily: passportTheme.fonts.heading, letterSpacing: '0.25em', fontSize: '1.05rem' }}>{L.pages}</span>
            <span className="h-px flex-1" style={{ backgroundColor: passportTheme.colors.border }} />
            <span className="text-xs" style={{ color: passportTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: '#23324E', textMuted: passportTheme.colors.textMuted, border: passportTheme.colors.border, background: page, primary: cover, surface: passportTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: '#23324E', border: passportTheme.colors.border, background: page, primary: cover }} className="ml-auto" />
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
