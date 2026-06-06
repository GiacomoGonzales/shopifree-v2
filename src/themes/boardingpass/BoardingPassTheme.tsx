/**
 * BOARDING PASS THEME - "PASE DE ABORDAR"
 *
 * Filosofia: la tienda es un pase de abordar de aerolinea.
 * - Tarjeta con ruta ORIGEN -> DESTINO, vuelo/puerta/asiento/fecha
 * - Talon perforado con codigo de barras, livery azul marino + cielo
 * - El catalogo es el "itinerario" del viaje
 * - Ideal para: viajes, equipaje, marcas aspiracionales y creativas
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

const navy = '#13294B'
const sky = '#2E78D2'
const paper = '#EAF1F8'

const bpTheme: ThemeConfig = {
  colors: {
    background: paper, surface: '#FFFFFF', surfaceHover: '#F0F5FB', text: navy, textMuted: '#6A7A93',
    textInverted: '#FFFFFF', primary: navy, primaryHover: '#0E1F39', accent: sky, border: '#CBD9EA',
    badge: navy, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px' },
  fonts: { heading: "'Barlow Condensed', system-ui, sans-serif", body: "'Barlow', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(19,41,75,0.08)', md: '0 6px 16px rgba(19,41,75,0.12)', lg: '0 18px 40px rgba(19,41,75,0.18)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

// A nivel de modulo para no recrearlo en cada render
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-widest" style={{ color: bpTheme.colors.textMuted }}>{label}</p>
      <p className="font-bold leading-tight" style={{ fontFamily: bpTheme.fonts.heading, fontSize: '1.05rem' }}>{value}</p>
    </div>
  )
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function BoardingPassTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { title: 'PASE DE ABORDAR', from: 'ORIGEN', to: 'DESTINO', flight: 'VUELO', gate: 'PUERTA', seat: 'ASIENTO', date: 'FECHA', passenger: 'PASAJERO', boarding: 'ABORDANDO', items: 'articulos', itinerary: 'ITINERARIO' },
    en: { title: 'BOARDING PASS', from: 'FROM', to: 'TO', flight: 'FLIGHT', gate: 'GATE', seat: 'SEAT', date: 'DATE', passenger: 'PASSENGER', boarding: 'BOARDING', items: 'items', itinerary: 'ITINERARY' },
    pt: { title: 'CARTAO DE EMBARQUE', from: 'ORIGEM', to: 'DESTINO', flight: 'VOO', gate: 'PORTAO', seat: 'ASSENTO', date: 'DATA', passenger: 'PASSAGEIRO', boarding: 'EMBARQUE', items: 'itens', itinerary: 'ITINERARIO' },
  }[lang]
  const code = (store.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'STR')
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-ES', { day: '2-digit', month: 'short' }).toUpperCase()

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={bpTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: paper, fontFamily: bpTheme.fonts.body, color: navy }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: navy, color: '#fff' }}>
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              <svg className="w-5 h-5" style={{ color: sky }} fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L11 19v-5.5L21 16z" /></svg>
              {showName && <span className="font-bold tracking-wide truncate" style={{ fontFamily: bpTheme.fonts.heading, fontSize: '1.2rem' }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors hover:bg-white/15" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 md:py-9">
          {/* Tarjeta de pase de abordar */}
          <div className="flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: '#fff', borderRadius: '1rem', boxShadow: bpTheme.shadows.lg }}>
            <div className="flex-1 p-5 md:p-7">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-[0.2em] px-2 py-1 rounded" style={{ backgroundColor: navy, color: '#fff' }}>{L.title}</span>
                <span className="text-xs" style={{ color: bpTheme.colors.textMuted }}>{L.boarding} · {today}</span>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="text-center"><p className="text-3xl md:text-4xl font-bold" style={{ fontFamily: bpTheme.fonts.heading }}>YOU</p><p className="text-[10px] tracking-widest" style={{ color: bpTheme.colors.textMuted }}>{L.from}</p></div>
                <div className="flex-1 flex items-center gap-2 pb-3">
                  <span className="h-px flex-1" style={{ backgroundColor: bpTheme.colors.border }} />
                  <svg className="w-5 h-5" style={{ color: sky }} fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L11 19v-5.5L21 16z" /></svg>
                  <span className="h-px flex-1" style={{ backgroundColor: bpTheme.colors.border }} />
                </div>
                <div className="text-center"><p className="text-3xl md:text-4xl font-bold" style={{ fontFamily: bpTheme.fonts.heading, color: sky }}>{code}</p><p className="text-[10px] tracking-widest" style={{ color: bpTheme.colors.textMuted }}>{L.to}</p></div>
              </div>
              {hasHero && (
                <div className="mt-5 overflow-hidden rounded-lg" style={{ border: `1px solid ${bpTheme.colors.border}` }}>
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full max-h-[220px] object-cover" />
                </div>
              )}
              <div className="grid grid-cols-4 gap-3 mt-5">
                <Field label={L.passenger} value={store.name.toUpperCase().slice(0, 10)} />
                <Field label={L.flight} value={`${code}${(products.length % 900) + 100}`} />
                <Field label={L.gate} value={String.fromCharCode(65 + (categories.length % 6)) + ((products.length % 30) + 1)} />
                <Field label={L.seat} value={`${(products.length % 40) + 1}A`} />
              </div>
            </div>
            {/* Talon perforado */}
            <div className="md:w-52 p-5 md:p-6 flex flex-row md:flex-col items-center justify-between gap-4" style={{ backgroundColor: navy, color: '#fff', borderLeft: '2px dashed rgba(255,255,255,0.4)' }}>
              <div>
                <p className="text-[10px] tracking-widest opacity-70">{L.to}</p>
                <p className="text-2xl font-bold" style={{ fontFamily: bpTheme.fonts.heading }}>{code}</p>
                <p className="text-[10px] tracking-widest opacity-70 mt-2">{L.date}</p>
                <p className="font-semibold">{today}</p>
              </div>
              <div className="flex items-end gap-[2px] h-12" aria-hidden>
                {Array.from({ length: 28 }).map((_, i) => <span key={i} style={{ width: i % 4 === 0 ? '3px' : '1px', height: '100%', backgroundColor: '#fff' }} />)}
              </div>
            </div>
          </div>

          {/* Itinerario = catalogo */}
          <div className="flex items-center gap-3 mt-9 mb-5">
            <span className="text-sm font-bold tracking-[0.25em]" style={{ fontFamily: bpTheme.fonts.heading }}>{L.itinerary}</span>
            <span className="h-px flex-1" style={{ backgroundColor: bpTheme.colors.border }} />
            <span className="text-xs" style={{ color: bpTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: navy, textMuted: bpTheme.colors.textMuted, border: bpTheme.colors.border, background: '#fff', primary: navy, surface: bpTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: navy, border: bpTheme.colors.border, background: '#fff', primary: navy }} className="ml-auto" />
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
