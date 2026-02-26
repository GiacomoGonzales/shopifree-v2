/**
 * SERENITY THEME - "SPA & BIENESTAR"
 *
 * Filosofia: Relajante, premium, femenino sutil.
 * - Paleta: Rosa nude/blush (#D4A0A0) sobre crema (#FFF9F5), sage green accent
 * - Tipografia: Playfair Display (headings) + Lato (body)
 * - Bordes suaves y redondeados
 * - Transiciones suaves, efecto zen
 * - Ideal para: Salones de belleza, spas, centros de bienestar
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

// Serenity colors
const blush = '#D4A0A0'
const blushDark = '#C48E8E'
const sage = '#8FAE8B'
const background = '#FFF9F5'
const surface = '#FFF3ED'
const white = '#FFFFFF'
const textDark = '#3D2C2C'
const textMuted = '#9B8585'

// Serenity theme configuration
const serenityTheme: ThemeConfig = {
  colors: {
    background: background,
    surface: surface,
    surfaceHover: '#FFEEE5',
    text: textDark,
    textMuted: textMuted,
    textInverted: white,
    primary: blush,
    primaryHover: blushDark,
    accent: sage,
    border: '#F0DDD5',
    badge: blush,
    badgeText: white,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Lato', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 3px 0 rgb(212 160 160 / 0.08)',
    md: '0 4px 12px -2px rgb(212 160 160 / 0.12)',
    lg: '0 12px 30px -8px rgb(212 160 160 / 0.15)',
  },
  effects: {
    cardHover: 'scale-102',
    buttonHover: 'scale-105',
    headerBlur: true,
    darkMode: false,
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

export default function SerenityTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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

  // Lotus/spa icon
  const SerenityIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18c-3.5 0-6.5-2-8-5 1-2 2.5-3.5 4.5-4.3C9 8.2 10.5 8 12 8s3 .2 3.5.7c2 .8 3.5 2.3 4.5 4.3-1.5 3-4.5 5-8 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8V4m-3 5.5L7 5m6 4.5L17 5" />
    </svg>
  )

  return (
    <ThemeProvider theme={serenityTheme} store={store}>
      <div className="min-h-screen font-serenity-body" style={{ backgroundColor: background }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Lato:wght@300;400;700&display=swap');
          .font-serenity-heading { font-family: 'Playfair Display', Georgia, serif; }
          .font-serenity-body { font-family: 'Lato', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${background}f0` : background,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#F0DDD5' : 'transparent'}`
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
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${blush}18` }}
                >
                  <SerenityIcon className="w-5 h-5" style={{ color: blush }} />
                </div>
              )}
              <h1 className="font-serenity-heading text-xl md:text-2xl font-medium" style={{ color: textDark }}>
                {store.name}
              </h1>
            </div>

            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: `${blush}18` }}
              >
                <svg className="w-5 h-5" style={{ color: blush }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 text-xs font-semibold flex items-center justify-center rounded-full animate-scaleIn font-serenity-body"
                  style={{ backgroundColor: blush, color: white }}
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
                  <h2 className="font-serenity-heading text-3xl italic" style={{ color: textDark }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-serenity-body text-sm mt-2 tracking-wide" style={{ color: textMuted }}>
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
                  <h2 className="font-serenity-heading text-5xl italic" style={{ color: textDark }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-serenity-body text-lg mt-3 tracking-wide" style={{ color: textMuted }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Serene Spa Fallback */
            <div className="py-16 md:py-24 text-center relative" style={{ backgroundColor: surface }}>
              {/* Organic leaf decoration */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="w-12 h-px" style={{ backgroundColor: blush + '50' }} />
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C10 2 14 6 14 10C14 14 10 18 10 18C10 18 6 14 6 10C6 6 10 2 10 2Z" stroke={sage} strokeWidth="1" fill={sage + '20'} />
                </svg>
                <div className="w-12 h-px" style={{ backgroundColor: blush + '50' }} />
              </div>

              <div className="max-w-3xl mx-auto px-6 pt-6">
                <h1 className="font-serenity-heading text-4xl md:text-6xl italic font-medium" style={{ color: textDark }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="font-serenity-body text-base md:text-lg mt-4 tracking-wide font-light" style={{ color: textMuted }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-serenity-body text-sm max-w-xl mx-auto mt-6 leading-relaxed font-light" style={{ color: textMuted }}>
                    {store.about.description}
                  </p>
                )}
              </div>

              {/* Bottom decoration */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="w-12 h-px" style={{ backgroundColor: blush + '50' }} />
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C10 2 14 6 14 10C14 14 10 18 10 18C10 18 6 14 6 10C6 6 10 2 10 2Z" stroke={sage} strokeWidth="1" fill={sage + '20'} />
                </svg>
                <div className="w-12 h-px" style={{ backgroundColor: blush + '50' }} />
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
