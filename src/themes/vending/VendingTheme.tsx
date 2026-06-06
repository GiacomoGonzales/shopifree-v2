/**
 * VENDING THEME - "MAQUINA EXPENDEDORA"
 *
 * Filosofia: la tienda es una maquina expendedora.
 * - Cuerpo metalico rojo, display LED verde, vitrina de cristal con el catalogo
 * - Ranura de monedas, teclado, lector de tarjeta y bandeja "EMPUJAR"
 * - Concepto de interfaz/objeto fisico, ludico y memorable
 * - Ideal para: snacks, bebidas, gadgets, marcas divertidas
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

const room = '#241E1C'
const machineRed = '#B0231C'
const metal = '#2A2A2A'
const glass = '#F7F7F4'
const led = '#86F58A'
const coin = '#F4C430'
const vink = '#1A1A1A'

const vendingTheme: ThemeConfig = {
  colors: {
    background: room, surface: glass, surfaceHover: '#ECECE6', text: vink, textMuted: '#5A5A55',
    textInverted: '#FFFFFF', primary: machineRed, primaryHover: '#8E1B16', accent: coin, border: '#C9C9C2',
    badge: machineRed, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px' },
  fonts: { heading: "'VT323', ui-monospace, monospace", body: "'Inter', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.3)', md: '0 6px 16px rgba(0,0,0,0.4)', lg: '0 24px 50px rgba(0,0,0,0.55)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function VendingTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { select: 'ELIGE TU PRODUCTO', insert: 'INSERTA MONEDA', push: 'EMPUJAR PARA RETIRAR', items: 'productos', cart: 'CESTA' },
    en: { select: 'SELECT YOUR ITEM', insert: 'INSERT COIN', push: 'PUSH TO COLLECT', items: 'items', cart: 'CART' },
    pt: { select: 'ESCOLHA SEU PRODUTO', insert: 'INSIRA MOEDA', push: 'EMPURRE PARA RETIRAR', items: 'produtos', cart: 'CESTA' },
  }[lang]

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={vendingTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=VT323&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: room, fontFamily: vendingTheme.fonts.body, color: '#fff' }}>
        <AnnouncementBar />

        {/* Top de la maquina (sticky header) */}
        <header className="sticky top-0 z-50" style={{ backgroundColor: machineRed, borderBottom: `3px solid ${metal}` }}>
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate font-extrabold uppercase tracking-wide text-white">{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase" style={{ backgroundColor: coin, color: vink }}>
              {L.cart} · {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 md:py-9">
          {/* Cuerpo de la maquina */}
          <div style={{ backgroundColor: machineRed, borderRadius: '1.25rem', padding: '14px', boxShadow: vendingTheme.shadows.lg, border: `4px solid ${metal}` }}>
            {/* Display LED */}
            <div className="flex items-center justify-between px-4 py-2 mb-3 rounded" style={{ backgroundColor: '#0B0B0B', border: '2px solid #000' }}>
              <span style={{ fontFamily: vendingTheme.fonts.heading, color: led, fontSize: '1.5rem', letterSpacing: '0.05em', textShadow: `0 0 8px ${led}` }}>★ {L.select}</span>
              <span style={{ fontFamily: vendingTheme.fonts.heading, color: led, fontSize: '1.5rem' }}>{filteredProducts.length} {L.items}</span>
            </div>

            <div className="grid md:grid-cols-[1fr_140px] gap-3">
              {/* Vitrina de cristal con el catalogo */}
              <div className="relative rounded-lg p-3 sm:p-4" style={{ backgroundColor: glass, border: '3px solid #14140F', boxShadow: 'inset 0 0 24px rgba(0,0,0,0.18)' }}>
                {/* Reflejo de cristal */}
                <div className="pointer-events-none absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.35) 0%, transparent 30%, transparent 65%, rgba(255,255,255,0.15) 100%)' }} />
                <div className="relative" style={{ color: vink }}>
                  <TrustBar />
                  <FlashSaleBar />
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
                      colors={{ text: vink, textMuted: vendingTheme.colors.textMuted, border: vendingTheme.colors.border, background: '#fff', primary: machineRed, surface: vendingTheme.colors.surfaceHover }} />
                    <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: vink, border: vendingTheme.colors.border, background: '#fff', primary: machineRed }} className="ml-auto" />
                  </div>
                  <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} onQuickAdd={handleAddToCart} categories={categories} />
                </div>
              </div>

              {/* Panel de controles */}
              <div className="flex md:flex-col gap-3">
                {/* Teclado */}
                <div className="grid grid-cols-3 gap-1.5 p-2 rounded" style={{ backgroundColor: '#171717' }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                    <span key={n} className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold" style={{ backgroundColor: '#3A3A3A', color: '#eee', fontFamily: vendingTheme.fonts.heading }}>{n}</span>
                  ))}
                </div>
                {/* Ranura monedas + lector */}
                <div className="flex-1 flex flex-col gap-2 p-2 rounded justify-between" style={{ backgroundColor: '#171717' }}>
                  <div>
                    <div className="mx-auto w-2 h-9 rounded-full" style={{ backgroundColor: coin }} />
                    <p className="text-[9px] text-center mt-1" style={{ color: '#bbb', fontFamily: vendingTheme.fonts.heading, letterSpacing: '0.1em' }}>{L.insert}</p>
                  </div>
                  <div className="h-7 rounded" style={{ background: `linear-gradient(${metal}, #111)`, border: '1px solid #000' }} />
                </div>
              </div>
            </div>

            {/* Bandeja de entrega */}
            <div className="mt-3 rounded-lg px-4 py-3 text-center" style={{ backgroundColor: '#14140F', border: '3px solid #000' }}>
              <span style={{ fontFamily: vendingTheme.fonts.heading, color: led, fontSize: '1.15rem', letterSpacing: '0.1em' }}>▼ {L.push} ▼</span>
            </div>
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
