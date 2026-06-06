/**
 * PETCARD THEME - "PLACA / FICHA DE MASCOTA" (pets)
 *
 * La tienda es una placa de identificacion de mascota + ficha de adopcion:
 * chapa redonda con hueso y huella, sellos de patita, colores calidos.
 * El catalogo son "mis cositas". Juguetona y amigable.
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

const petBg = '#FFF6E9'
const petInk = '#473C36'
const petOrange = '#F2994A'
const petMint = '#5FB89A'

const petcardTheme: ThemeConfig = {
  colors: {
    background: petBg, surface: '#FFFFFF', surfaceHover: '#FBEFDD', text: petInk, textMuted: '#9A8A7E',
    textInverted: '#FFFFFF', primary: petOrange, primaryHover: '#E0852F', accent: petMint, border: '#F0E0CA',
    badge: petOrange, badgeText: '#FFFFFF',
  },
  radius: { sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem', full: '9999px' },
  fonts: { heading: "'Baloo 2', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif" },
  shadows: { sm: '0 2px 4px rgba(71,60,54,0.08)', md: '0 8px 20px rgba(71,60,54,0.12)', lg: '0 20px 44px rgba(71,60,54,0.16)' },
  effects: { cardHover: 'translateY(-4px)', buttonHover: 'scale-105', headerBlur: false, darkMode: false },
}

const Paw = ({ size = 18, color = petOrange }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
    <circle cx="6" cy="10" r="2.4" /><circle cx="12" cy="7.5" r="2.6" /><circle cx="18" cy="10" r="2.4" />
    <ellipse cx="12" cy="16.5" rx="5" ry="4.2" />
  </svg>
)

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function PetcardTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'circle' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { tag: 'MI PLACA', visit: 'VISITAME', stuff: 'MIS COSITAS', items: 'productos', friend: 'Tu amigo de confianza' },
    en: { tag: 'MY TAG', visit: 'VISIT ME', stuff: 'MY GOODIES', items: 'products', friend: 'Your trusted friend' },
    pt: { tag: 'MINHA PLACA', visit: 'VISITE-ME', stuff: 'MINHAS COISINHAS', items: 'produtos', friend: 'Seu amigo de confianca' },
  }[lang]

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={petcardTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: petBg, fontFamily: petcardTheme.fonts.body, color: petInk }}>
        <AnnouncementBar />

        <header className="sticky top-0 z-50" style={{ backgroundColor: petBg }}>
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-full" style={{ backgroundColor: '#fff', boxShadow: petcardTheme.shadows.md }}>
              <div className="flex items-center gap-2 min-w-0">
                {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
                {showName && <span className="truncate font-extrabold" style={{ fontFamily: petcardTheme.fonts.heading, fontSize: '1.25rem' }}>{store.name}</span>}
              </div>
              <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105" style={{ backgroundColor: petOrange }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                {totalItems}
              </button>
            </div>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 md:py-11">
          {/* Placa / chapa */}
          <div className="relative mx-auto max-w-lg text-center px-8 py-10 overflow-hidden" style={{ background: 'linear-gradient(160deg, #FFFFFF, #FFF1DD)', borderRadius: '2rem', boxShadow: petcardTheme.shadows.lg, border: `3px dashed ${petOrange}` }}>
            {/* Huellas decorativas */}
            <span className="absolute left-4 top-4 opacity-40"><Paw size={22} color={petMint} /></span>
            <span className="absolute right-5 bottom-5 opacity-40"><Paw size={26} color={petOrange} /></span>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest" style={{ backgroundColor: petMint, color: '#fff' }}>
              <Paw size={13} color="#fff" /> {L.tag}
            </div>
            <h1 className="mt-3 leading-none" style={{ fontFamily: petcardTheme.fonts.heading, fontWeight: 800, fontSize: 'clamp(2.2rem, 7vw, 3.6rem)' }}>{store.name}</h1>
            <p className="mt-2 text-sm" style={{ color: petcardTheme.colors.textMuted }}>{store.about?.slogan || L.friend}</p>
            {store.whatsapp && (
              <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={() => onWhatsAppClick?.()}
                className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-full font-bold text-white transition-transform hover:scale-105"
                style={{ backgroundColor: petOrange, fontFamily: petcardTheme.fonts.heading }}>
                <Paw size={16} color="#fff" /> {L.visit}
              </a>
            )}
          </div>

          {hasHero && (
            <div className="mt-8 overflow-hidden" style={{ borderRadius: '2rem', boxShadow: petcardTheme.shadows.md }}>
              <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full aspect-[16/6] object-cover" />
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-10 mb-6">
            <Paw size={18} color={petMint} />
            <span className="font-extrabold" style={{ fontFamily: petcardTheme.fonts.heading, fontSize: '1.5rem' }}>{L.stuff}</span>
            <Paw size={18} color={petOrange} />
          </div>

          <TrustBar />
          <FlashSaleBar />

          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
              colors={{ text: petInk, textMuted: petcardTheme.colors.textMuted, border: petcardTheme.colors.border, background: '#fff', primary: petOrange, surface: petcardTheme.colors.surfaceHover }} />
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: petInk, border: petcardTheme.colors.border, background: '#fff', primary: petOrange }} className="ml-auto" />
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
