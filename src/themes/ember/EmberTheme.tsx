/**
 * EMBER THEME - "OSCURO CALIDO PREMIUM"
 *
 * Filosofia: Calido, oscuro, premium.
 * - Paleta: Amber/naranja sobre fondo oscuro
 * - Tipografia: Space Grotesk (heading) + Inter (body)
 * - Radiantes medios, sombras calidas
 * - Efectos de hover con scale
 * - Ideal para: Cualquier negocio con estetica premium oscura
 */

import { useState, useEffect, useMemo } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import { optimizeImage } from '../../utils/cloudinary'
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

// Ember colors
const amber = '#F97316'
const amberHover = '#EA580C'
const dark = '#1C1210'
const darkSurface = '#2A1F1A'
const darkSurfaceHover = '#362920'
const warmGray = '#A8957E'
const white = '#FFFFFF'

// Ember theme configuration - warm dark premium
const emberTheme: ThemeConfig = {
  colors: {
    background: dark,
    surface: darkSurface,
    surfaceHover: darkSurfaceHover,
    text: '#F5F0EB',
    textMuted: warmGray,
    textInverted: dark,
    primary: amber,
    primaryHover: amberHover,
    accent: '#FBBF24',
    border: '#3D2E25',
    badge: amber,
    badgeText: dark,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(249 115 22 / 0.06)',
    md: '0 4px 12px -2px rgb(249 115 22 / 0.1)',
    lg: '0 20px 40px -8px rgb(249 115 22 / 0.15)',
  },
  effects: {
    cardHover: 'scale-105',
    buttonHover: 'scale-110',
    headerBlur: true,
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
}

export default function EmberTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
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

  // Flame icon
  const FlameIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.485 1.336-4.779 2.625-6.406A15.597 15.597 0 0110.5 6.5c.31-.266.653-.545 1-.825C12.379 4.937 13 4.168 13 3c0-.552.448-1 1-1s1 .448 1 1c0 1.652-.833 2.883-1.73 3.73-.365.345-.74.666-1.02.907a13.614 13.614 0 00-2.625 2.957C8.437 12.128 7 14.015 7 16c0 2.761 2.239 5 5 5s5-2.239 5-5c0-1.22-.387-2.365-1.025-3.3a.998.998 0 01.166-1.265l.01-.01c.397-.397 1.054-.32 1.332.166C18.45 13.163 19 14.531 19 16c0 3.866-3.134 7-7 7z"/>
    </svg>
  )

  return (
    <ThemeProvider theme={emberTheme} store={store}>
      <div className="min-h-screen font-ember-body" style={{ backgroundColor: dark }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
          .font-ember { font-family: 'Space Grotesk', system-ui, sans-serif; }
          .font-ember-body { font-family: 'Inter', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />



        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${dark}f0` : dark,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#3D2E25' : 'transparent'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-11 h-11 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${amber}20` }}
                >
                  <FlameIcon className="w-6 h-6" style={{ color: amber }} />
                </div>
              )}
              <h1 className="font-ember text-xl md:text-2xl font-semibold" style={{ color: '#F5F0EB' }}>
                {store.name}
              </h1>
            </div>

            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative group"
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: `${amber}20` }}
              >
                <svg className="w-5 h-5" style={{ color: amber }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 text-xs font-semibold flex items-center justify-center rounded-md animate-scaleIn font-ember-body"
                  style={{ backgroundColor: amber, color: dark }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          {(store.heroImage || store.heroImageMobile) ? (
            <>
              {/* Mobile Hero */}
              <div className="md:hidden relative max-h-[400px] overflow-hidden">
                <img
                  src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                  alt=""
                  className="w-full h-auto max-h-[400px] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${dark} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-ember text-3xl font-semibold text-white">
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-ember-body text-sm mt-2" style={{ color: warmGray }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
              {/* Desktop Hero */}
              <div className="hidden md:block relative overflow-hidden">
                <img
                  src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')}
                  alt=""
                  className="w-full aspect-[16/5] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${dark} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-ember text-5xl font-semibold text-white">
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-ember-body text-lg mt-3" style={{ color: warmGray }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Dark Warm Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: darkSurface }}>
              {/* Warm glow behind */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at center, ${amber}10 0%, transparent 70%)` }}
              />

              <div className="max-w-4xl mx-auto px-6 relative">
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="w-12 h-px" style={{ backgroundColor: `${amber}40` }} />
                  <FlameIcon className="w-6 h-6" style={{ color: amber }} />
                  <div className="w-12 h-px" style={{ backgroundColor: `${amber}40` }} />
                </div>

                <h1 className="font-ember text-4xl md:text-6xl font-bold text-white">
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="font-ember-body text-lg md:text-xl mt-4" style={{ color: warmGray }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-ember-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: `${warmGray}cc` }}>
                    {store.about.description}
                  </p>
                )}

                <div className="flex items-center justify-center gap-4 mt-10">
                  <div className="w-12 h-px" style={{ backgroundColor: `${amber}40` }} />
                  <FlameIcon className="w-6 h-6" style={{ color: amber }} />
                  <div className="w-12 h-px" style={{ backgroundColor: `${amber}40` }} />
                </div>
              </div>
            </div>
          )}
        </section>


        <TrustBar />
        <FlashSaleBar />

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
            categories={categories}
          />
        </main>

        {/* Footer */}
        <StoreFooter onWhatsAppClick={onWhatsAppClick} />

        {/* WhatsApp Float */}
        <SocialProofToast />


        <WhatsAppButton
          whatsapp={store.whatsapp || ''}
          storeName={store.name}
          onClick={onWhatsAppClick}
          visible={totalItems === 0}
        />

        {/* Cart Bar */}
        <CartBar
          totalItems={totalItems}
          totalPrice={totalPrice}
          onViewCart={() => setIsCartOpen(true)}
          onCheckout={() => setIsCheckoutOpen(true)}
        />

        {/* Product Drawer */}
        {selectedProduct && (
          <ProductDrawer
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Cart Drawer */}
        {isCartOpen && (
          <CartDrawer
            items={items}
            totalPrice={totalPrice}
            onClose={() => setIsCartOpen(false)}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={() => {
              setIsCartOpen(false)
              setIsCheckoutOpen(true)
            }}
          />
        )}

        {/* Checkout Drawer */}
        {isCheckoutOpen && (
          <CheckoutDrawer
            items={items}
            totalPrice={totalPrice}
            store={store}
            onClose={() => setIsCheckoutOpen(false)}
            onOrderComplete={() => {
              clearCart()
              setIsCheckoutOpen(false)
            }}
          />
        )}
      </div>
    </ThemeProvider>
  )
}
