/**
 * APPOINTMENT THEME - "TARJETA DE CITA / AGENDA" (services)
 *
 * La tienda es una tarjeta de reserva: agenda con franjas horarias, sello
 * "CONFIRMADO" y mini calendario. El catalogo son los servicios disponibles.
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

const appBg = '#EEF2F5'
const appInk = '#23303A'
const appBlue = '#3A6E8F'
const appGreen = '#2E8B6F'

const appointmentTheme: ThemeConfig = {
  colors: {
    background: appBg, surface: '#FFFFFF', surfaceHover: '#E7EDF1', text: appInk, textMuted: '#6E7C86',
    textInverted: '#FFFFFF', primary: appBlue, primaryHover: '#2E5872', accent: appGreen, border: '#D5DEE4',
    badge: appBlue, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px' },
  fonts: { heading: "'Sora', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(35,48,58,0.06)', md: '0 6px 16px rgba(35,48,58,0.10)', lg: '0 18px 40px rgba(35,48,58,0.14)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function AppointmentTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { book: 'RESERVA TU CITA', confirmed: 'CONFIRMADO', services: 'SERVICIOS', items: 'servicios', slots: 'HORARIOS', book2: 'Agendar', avail: 'Disponible hoy' },
    en: { book: 'BOOK YOUR APPOINTMENT', confirmed: 'CONFIRMED', services: 'SERVICES', items: 'services', slots: 'TIME SLOTS', book2: 'Book', avail: 'Available today' },
    pt: { book: 'AGENDE SEU HORARIO', confirmed: 'CONFIRMADO', services: 'SERVICOS', items: 'servicos', slots: 'HORARIOS', book2: 'Agendar', avail: 'Disponivel hoje' },
  }[lang]
  const slots = ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00']
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-ES', { weekday: 'short', day: '2-digit', month: 'short' })

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={appointmentTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: appBg, fontFamily: appointmentTheme.fonts.body, color: appInk }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: '#fff', borderBottom: `1px solid ${appointmentTheme.colors.border}` }}>
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate font-bold" style={{ fontFamily: appointmentTheme.fonts.heading }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors hover:opacity-90" style={{ backgroundColor: appBlue, color: '#fff' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-7 md:py-10">
          {/* Tarjeta de cita */}
          <div className="relative overflow-hidden" style={{ backgroundColor: '#fff', borderRadius: '1rem', boxShadow: appointmentTheme.shadows.lg, border: `1px solid ${appointmentTheme.colors.border}` }}>
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${appBlue}, ${appGreen})` }} />
            <div className="p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.3em] font-semibold" style={{ color: appBlue }}>{L.book}</p>
                  <h1 className="mt-1" style={{ fontFamily: appointmentTheme.fonts.heading, fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 700 }}>{store.name}</h1>
                  {store.about?.slogan && <p className="text-sm mt-1" style={{ color: appointmentTheme.colors.textMuted }}>{store.about.slogan}</p>}
                </div>
                <div className="-rotate-6 text-center px-3 py-1.5 rounded hidden sm:block flex-shrink-0" style={{ border: `2px solid ${appGreen}`, color: appGreen }}>
                  <p className="text-[10px] font-bold tracking-widest leading-none">{L.confirmed}</p>
                  <p className="text-xs font-bold mt-0.5">{today}</p>
                </div>
              </div>
              {/* Franjas horarias */}
              <p className="text-[11px] tracking-widest mt-5 mb-2" style={{ color: appointmentTheme.colors.textMuted }}>{L.slots} · {L.avail}</p>
              <div className="flex flex-wrap gap-2">
                {slots.map((s, i) => (
                  <span key={s} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: i === 2 ? appBlue : appointmentTheme.colors.surfaceHover, color: i === 2 ? '#fff' : appInk, border: `1px solid ${appointmentTheme.colors.border}` }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-9 mb-5">
            <span className="font-bold tracking-wide" style={{ fontFamily: appointmentTheme.fonts.heading, fontSize: '1.2rem' }}>{L.services}</span>
            <span className="h-px flex-1" style={{ backgroundColor: appointmentTheme.colors.border }} />
            <span className="text-xs" style={{ color: appointmentTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: appInk, textMuted: appointmentTheme.colors.textMuted, border: appointmentTheme.colors.border, background: '#fff', primary: appBlue, surface: appointmentTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: appInk, border: appointmentTheme.colors.border, background: '#fff', primary: appBlue }} className="ml-auto" />
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
