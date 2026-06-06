/**
 * MENU THEME - "CARTA DE RESTAURANTE" (restaurant)
 *
 * La tienda es la carta de un restaurante elegante: papel crema, serif fino,
 * ornamentos, secciones con guia de puntos. El catalogo son los platos.
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

const menuCream = '#FBF7EF'
const menuInk = '#2B2620'
const wine = '#6E2B2B'

const menuTheme: ThemeConfig = {
  colors: {
    background: menuCream, surface: '#FFFFFF', surfaceHover: '#F3EDE1', text: menuInk, textMuted: '#857C6C',
    textInverted: '#FFFFFF', primary: wine, primaryHover: '#561F1F', accent: '#A6803F', border: '#E1D7C4',
    badge: wine, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
  fonts: { heading: "'Playfair Display', Georgia, serif", body: "'Jost', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(43,38,32,0.06)', md: '0 6px 16px rgba(43,38,32,0.10)', lg: '0 18px 40px rgba(43,38,32,0.14)' },
  effects: { cardHover: 'translateY(-3px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function MenuTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { menu: 'LA CARTA', specialties: 'ESPECIALIDADES DE LA CASA', dishes: 'NUESTROS PLATOS', items: 'platos', est: 'EST.' },
    en: { menu: 'THE MENU', specialties: 'HOUSE SPECIALTIES', dishes: 'OUR DISHES', items: 'dishes', est: 'EST.' },
    pt: { menu: 'O CARDAPIO', specialties: 'ESPECIALIDADES DA CASA', dishes: 'NOSSOS PRATOS', items: 'pratos', est: 'EST.' },
  }[lang]

  const estYear = store.createdAt ? new Date(store.createdAt).getFullYear() : new Date().getFullYear()
  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={menuTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: menuCream, fontFamily: menuTheme.fonts.body, color: menuInk }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: menuCream, borderBottom: `1px solid ${menuTheme.colors.border}` }}>
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate" style={{ fontFamily: menuTheme.fonts.heading, fontSize: '1.35rem' }}>{store.name}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors hover:opacity-90" style={{ backgroundColor: wine, color: '#fff' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {totalItems}
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-14" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          {/* Portada de la carta */}
          <div className="text-center">
            <p className="text-xs tracking-[0.4em]" style={{ color: menuTheme.colors.accent }}>{L.est} {estYear}</p>
            <div className="flex items-center justify-center gap-3 my-2">
              <span className="h-px w-12" style={{ backgroundColor: menuTheme.colors.accent }} />
              <span style={{ color: menuTheme.colors.accent }}>❧</span>
              <span className="h-px w-12" style={{ backgroundColor: menuTheme.colors.accent }} />
            </div>
            <h1 style={{ fontFamily: menuTheme.fonts.heading, fontSize: 'clamp(2.4rem, 7vw, 4rem)' }}>{store.name}</h1>
            <p className="mt-2 italic text-sm md:text-base" style={{ color: menuTheme.colors.textMuted, fontFamily: menuTheme.fonts.heading }}>
              {store.about?.slogan || L.specialties}
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="h-px w-20" style={{ backgroundColor: menuTheme.colors.border }} />
              <span style={{ color: menuTheme.colors.accent }}>✦</span>
              <span className="h-px w-20" style={{ backgroundColor: menuTheme.colors.border }} />
            </div>
          </div>

          {hasHero && (
            <div className="mt-7 overflow-hidden rounded-lg" style={{ border: `1px solid ${menuTheme.colors.border}` }}>
              <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full aspect-[16/6] object-cover" style={{ filter: 'sepia(8%)' }} />
            </div>
          )}

          <div className="flex items-center gap-3 mt-9 mb-5">
            <span className="tracking-[0.25em]" style={{ fontFamily: menuTheme.fonts.heading, fontSize: '1.3rem' }}>{L.dishes}</span>
            <span className="flex-1 border-b border-dotted" style={{ borderColor: menuTheme.colors.textMuted }} />
            <span className="text-xs" style={{ color: menuTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: menuInk, textMuted: menuTheme.colors.textMuted, border: menuTheme.colors.border, background: '#fff', primary: wine, surface: menuTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: menuInk, border: menuTheme.colors.border, background: '#fff', primary: wine }} className="ml-auto" />
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
