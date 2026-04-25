/**
 * VINYL THEME - "TURNTABLE / RECORD STORE"
 *
 * Filosofia: Vinyl shop nocturno — disco girando, ondas de sonido, neon ambar.
 * - Negro profundo + cobre/oro + crema
 * - Hero con vinilo SVG girando lentamente y aguja
 * - Tipografia: Bebas Neue (display tall) + Inter (body)
 * - Numeracion tipo tracklist (01., 02., ...)
 * - Footer con sound-wave bars
 * Ideal para: musica, audio, instrumentos, libreria de discos, audio hifi.
 */

import { useState, useEffect, useMemo } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import {
  ThemeProvider,
  ProductGrid,
  ProductDrawer,
  CartDrawer,
  CartBar,
  CategoryNav,
  WhatsAppButton,
  StoreFooter,
  CheckoutDrawer,
  AnnouncementBar,
  TrustBar,
  FlashSaleBar,
  SocialProofToast,
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'
import { useHeaderLogo } from '../shared/useHeaderLogo'
import HeroImg from '../../components/catalog/HeroImg'

const vinylTheme: ThemeConfig = {
  colors: {
    background: '#0E0B08',
    surface: '#1A1612',
    surfaceHover: '#241E18',
    text: '#F5EDD8',
    textMuted: '#9B8B6E',
    textInverted: '#0E0B08',
    primary: '#D4A04A',
    primaryHover: '#E0AD56',
    accent: '#A65A2A',
    border: 'rgba(212,160,74,0.25)',
    badge: '#D4A04A',
    badgeText: '#0E0B08',
  },
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Bebas Neue', 'Impact', sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 0 12px rgba(212,160,74,0.10)',
    md: '0 0 24px rgba(212,160,74,0.16)',
    lg: '0 12px 40px rgba(0,0,0,0.5)',
  },
  effects: {
    cardHover: 'translateY(-3px)',
    buttonHover: 'scale-105',
    headerBlur: false,
    darkMode: true,
  },
}

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
  onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void
  initialProduct?: Product | null
}

export default function VinylTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName } = useHeaderLogo(store)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredProducts = useMemo(() => {
    return activeCategory
      ? products.filter(p => p.categoryId === activeCategory)
      : products
  }, [products, activeCategory])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onProductView?.(product)
  }

  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => {
    addItem(product, extras)
    onCartAdd?.(product)
  }

  return (
    <ThemeProvider theme={vinylTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes vinyl-spin {
          from { transform: rotate(0deg) }
          to { transform: rotate(360deg) }
        }
        .vinyl-spin { animation: vinyl-spin 16s linear infinite; }
      `}</style>

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#0E0B08',
          backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(212,160,74,0.08) 0%, transparent 60%)`,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#F5EDD8',
        }}
      >
        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(14,11,8,0.92)' : '#0E0B08',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '1px solid rgba(212,160,74,0.25)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-9 w-auto object-contain" />}
              {showName && (
                <span
                  className="text-2xl md:text-3xl tracking-widest"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#D4A04A' }}
                >
                  {store.name}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-4 py-2 transition-all"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '1.1rem',
                letterSpacing: '0.15em',
                background: totalItems > 0 ? '#D4A04A' : 'transparent',
                color: totalItems > 0 ? '#0E0B08' : '#D4A04A',
                border: '1px solid #D4A04A',
              }}
            >
              <span>{(store.language === 'en' ? 'CRATE' : 'CESTA').toUpperCase()}</span>
              <span>·</span>
              <span>{totalItems.toString().padStart(2, '0')}</span>
            </button>
          </div>
        </header>

        {/* Hero — turntable */}
        <section className="relative overflow-hidden py-14 md:py-24">
          <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-10">
            <div>
              <p className="text-sm tracking-[0.3em] uppercase mb-5" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#A65A2A' }}>
                {store.language === 'en' ? '· Now spinning' : '· Suena ahora'}
              </p>
              <h1
                className="text-6xl md:text-8xl leading-[0.9] tracking-wider"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F5EDD8' }}
              >
                {store.name.toUpperCase()}
              </h1>
              {store.about?.slogan && (
                <p className="mt-6 text-base md:text-lg max-w-md leading-relaxed" style={{ color: '#9B8B6E' }}>
                  {store.about.slogan}
                </p>
              )}
              <div className="mt-8 flex items-center gap-3 text-xs tracking-widest uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#D4A04A' }}>
                <span>SIDE A</span>
                <span className="w-12 h-px" style={{ backgroundColor: '#D4A04A' }} />
                <span>33 1/3 RPM</span>
              </div>
            </div>

            <div className="relative aspect-square max-w-md mx-auto w-full">
              {(store.heroImage || store.heroImageMobile) ? (
                <>
                  {/* Vinyl record with hero image as label */}
                  <div className="absolute inset-0 vinyl-spin">
                    <div
                      className="w-full h-full rounded-full relative"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, #1a1612 0%, #0a0807 40%, #1a1612 60%, #0a0807 100%)`,
                        boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(212,160,74,0.06)',
                      }}
                    >
                      {/* Grooves */}
                      {[0.95, 0.85, 0.75, 0.6, 0.5].map((scale, i) => (
                        <div
                          key={i}
                          className="absolute rounded-full border"
                          style={{
                            inset: `${((1 - scale) / 2) * 100}%`,
                            borderColor: 'rgba(245,237,216,0.04)',
                          }}
                        />
                      ))}
                      {/* Center label */}
                      <div className="absolute rounded-full overflow-hidden" style={{ inset: '34%', boxShadow: '0 0 0 4px #0E0B08' }}>
                        <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                      </div>
                      {/* Center spindle hole */}
                      <div className="absolute rounded-full" style={{ inset: '49%', backgroundColor: '#0E0B08' }} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 vinyl-spin">
                  <div
                    className="w-full h-full rounded-full relative"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, #1a1612 0%, #0a0807 40%, #1a1612 60%, #0a0807 100%)`,
                      boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                    }}
                  >
                    {[0.95, 0.85, 0.75, 0.6, 0.5].map((scale, i) => (
                      <div
                        key={i}
                        className="absolute rounded-full border"
                        style={{
                          inset: `${((1 - scale) / 2) * 100}%`,
                          borderColor: 'rgba(245,237,216,0.05)',
                        }}
                      />
                    ))}
                    <div
                      className="absolute rounded-full flex items-center justify-center"
                      style={{
                        inset: '34%',
                        background: 'radial-gradient(circle, #D4A04A 0%, #A65A2A 100%)',
                        boxShadow: '0 0 0 4px #0E0B08',
                      }}
                    >
                      <span
                        className="text-center px-2 leading-tight"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#0E0B08', fontSize: '0.85rem', letterSpacing: '0.1em' }}
                      >
                        {store.name.toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute rounded-full" style={{ inset: '49%', backgroundColor: '#0E0B08' }} />
                  </div>
                </div>
              )}
              {/* Tonearm — diagonal line */}
              <svg className="absolute -top-6 -right-6 w-24 h-24 hidden md:block" viewBox="0 0 80 80" fill="none">
                <circle cx="65" cy="15" r="6" stroke="#D4A04A" strokeWidth="2" fill="#1A1612" />
                <line x1="65" y1="15" x2="40" y2="55" stroke="#D4A04A" strokeWidth="3" strokeLinecap="round" />
                <circle cx="40" cy="55" r="3" fill="#D4A04A" />
              </svg>
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Tracklist label */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-2 flex items-center gap-4">
          <span
            className="px-3 py-1 text-base tracking-widest"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: '#0E0B08',
              backgroundColor: '#D4A04A',
              letterSpacing: '0.15em',
            }}
          >
            {store.language === 'en' ? 'TRACKLIST' : 'CARA A'}
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: 'rgba(212,160,74,0.3)' }} />
          <span className="text-xs tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#9B8B6E' }}>
            {filteredProducts.length.toString().padStart(2, '0')} TRACKS
          </span>
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-16 md:pb-24">
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
            categories={categories}
          />
        </main>

        {/* Sound wave footer divider */}
        <div className="flex items-end justify-center gap-1 px-4 pt-8 opacity-60" aria-hidden>
          {Array.from({ length: 60 }).map((_, i) => {
            const heights = [8, 16, 12, 24, 18, 30, 14, 22, 10, 28, 20, 16]
            const h = heights[i % heights.length]
            return (
              <div
                key={i}
                className="w-1"
                style={{
                  height: `${h}px`,
                  backgroundColor: '#D4A04A',
                  opacity: 0.3 + (h / 60),
                }}
              />
            )
          })}
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
