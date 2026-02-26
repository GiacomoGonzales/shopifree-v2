/**
 * BARBERSHOP THEME - "BARBERÍA PREMIUM"
 *
 * Filosofia: Oscuro, masculino, vintage-moderno.
 * - Paleta: Negro/carbón con acentos dorados (#C8A97E)
 * - Tipografia: Bebas Neue (bold headlines) + Inter (body)
 * - Bordes rectos, aspecto barbería clásica
 * - Transiciones suaves
 * - Ideal para: Barberías, peluquerías masculinas
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

// Barbershop colors
const gold = '#C8A97E'
const goldDark = '#B8956A'
const goldLight = '#D4B990'
const background = '#111111'
const surface = '#1A1A1A'
const charcoal = '#222222'
const white = '#FFFFFF'
const textMuted = '#888888'

// Barbershop theme configuration
const barbershopTheme: ThemeConfig = {
  colors: {
    background: background,
    surface: surface,
    surfaceHover: charcoal,
    text: white,
    textMuted: textMuted,
    textInverted: '#111111',
    primary: gold,
    primaryHover: goldDark,
    accent: goldLight,
    border: '#2A2A2A',
    badge: gold,
    badgeText: '#111111',
  },
  radius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Bebas Neue', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 8px -1px rgb(0 0 0 / 0.4)',
    lg: '0 10px 25px -5px rgb(0 0 0 / 0.5)',
  },
  effects: {
    cardHover: 'scale-102',
    buttonHover: 'scale-105',
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
  initialProduct?: Product | null
}

export default function BarbershopTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
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

  // Scissors icon for barbershop
  const BarbershopIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
    </svg>
  )

  return (
    <ThemeProvider theme={barbershopTheme} store={store}>
      <div className="min-h-screen font-barbershop-body" style={{ backgroundColor: background }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
          .font-barbershop-heading { font-family: 'Bebas Neue', system-ui, sans-serif; }
          .font-barbershop-body { font-family: 'Inter', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${background}f0` : background,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#2A2A2A' : 'transparent'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ border: `1px solid ${gold}40` }}
                >
                  <BarbershopIcon className="w-5 h-5" style={{ color: gold }} />
                </div>
              )}
              <h1 className="font-barbershop-heading text-2xl md:text-3xl tracking-wider" style={{ color: gold }}>
                {store.name}
              </h1>
            </div>

            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative group"
            >
              <div
                className="w-10 h-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ border: `1px solid ${gold}40` }}
              >
                <svg className="w-5 h-5" style={{ color: gold }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 text-xs font-semibold flex items-center justify-center animate-scaleIn font-barbershop-body"
                  style={{ backgroundColor: gold, color: '#111111' }}
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
                  style={{ background: `linear-gradient(to top, ${background} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-barbershop-heading text-4xl tracking-widest" style={{ color: gold }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-barbershop-body text-sm mt-2 uppercase tracking-wider" style={{ color: textMuted }}>
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
                  style={{ background: `linear-gradient(to top, ${background} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-barbershop-heading text-6xl tracking-widest" style={{ color: gold }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-barbershop-body text-lg mt-3 uppercase tracking-wider" style={{ color: textMuted }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Barbershop Vintage Fallback */
            <div className="py-20 md:py-28 text-center relative" style={{ backgroundColor: surface }}>
              {/* Decorative barbershop lines */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <div className="w-20 h-px" style={{ backgroundColor: gold + '40' }} />
                <div className="w-1.5 h-1.5" style={{ backgroundColor: gold }} />
                <div className="w-8 h-px" style={{ backgroundColor: gold }} />
                <div className="w-1.5 h-1.5" style={{ backgroundColor: gold }} />
                <div className="w-20 h-px" style={{ backgroundColor: gold + '40' }} />
              </div>

              <div className="max-w-3xl mx-auto px-6 pt-4">
                <p className="font-barbershop-body text-xs uppercase tracking-[0.3em] mb-4" style={{ color: gold }}>
                  Est. {new Date().getFullYear()}
                </p>
                <h1 className="font-barbershop-heading text-6xl md:text-8xl tracking-wider leading-none" style={{ color: white }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="font-barbershop-body text-sm md:text-base mt-5 uppercase tracking-[0.2em]" style={{ color: textMuted }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-barbershop-body text-sm max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: textMuted }}>
                    {store.about.description}
                  </p>
                )}
              </div>

              {/* Bottom decorative line */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <div className="w-20 h-px" style={{ backgroundColor: gold + '40' }} />
                <div className="w-1.5 h-1.5" style={{ backgroundColor: gold }} />
                <div className="w-8 h-px" style={{ backgroundColor: gold }} />
                <div className="w-1.5 h-1.5" style={{ backgroundColor: gold }} />
                <div className="w-20 h-px" style={{ backgroundColor: gold + '40' }} />
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
