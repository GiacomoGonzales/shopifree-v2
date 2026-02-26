/**
 * FOLIO THEME - "MARCA PERSONAL / FREELANCER"
 *
 * Filosofia: Moderno, personal brand, minimalista con personalidad.
 * - Paleta: Negro + violeta electrico (#7C3AED) sobre blanco
 * - Tipografia: Space Grotesk (todo)
 * - Bordes medios, aspecto portfolio/brand
 * - Transiciones dinamicas
 * - Ideal para: Freelancers, coaches, consultores, marca personal
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

// Folio colors
const violet = '#7C3AED'
const violetDark = '#6D28D9'
const violetLight = '#8B5CF6'
const background = '#FFFFFF'
const surface = '#FAFAFA'
const black = '#0A0A0A'
const textMuted = '#71717A'

// Folio theme configuration
const folioTheme: ThemeConfig = {
  colors: {
    background: background,
    surface: surface,
    surfaceHover: '#F4F4F5',
    text: black,
    textMuted: textMuted,
    textInverted: '#FFFFFF',
    primary: violet,
    primaryHover: violetDark,
    accent: violetLight,
    border: '#E4E4E7',
    badge: violet,
    badgeText: '#FFFFFF',
  },
  radius: {
    sm: '0.375rem',
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1.25rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'Space Grotesk', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
    md: '0 4px 8px -2px rgb(0 0 0 / 0.08)',
    lg: '0 12px 30px -8px rgb(0 0 0 / 0.12)',
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

export default function FolioTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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

  // Lightning bolt / creative icon
  const FolioIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )

  return (
    <ThemeProvider theme={folioTheme} store={store}>
      <div className="min-h-screen font-folio" style={{ backgroundColor: background }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
          .font-folio { font-family: 'Space Grotesk', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${background}f0` : background,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#E4E4E7' : 'transparent'}`
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
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${violet}12` }}
                >
                  <FolioIcon className="w-5 h-5" style={{ color: violet }} />
                </div>
              )}
              <h1 className="font-folio text-xl md:text-2xl font-bold" style={{ color: black }}>
                {store.name}
              </h1>
            </div>

            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: `${violet}12` }}
              >
                <svg className="w-5 h-5" style={{ color: violet }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 text-xs font-bold flex items-center justify-center rounded-md animate-scaleIn font-folio"
                  style={{ backgroundColor: violet, color: '#FFFFFF' }}
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
                  <h2 className="font-folio text-3xl font-bold" style={{ color: black }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-folio text-sm mt-2" style={{ color: textMuted }}>
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
                  <h2 className="font-folio text-5xl font-bold" style={{ color: black }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-folio text-lg mt-3" style={{ color: textMuted }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Portfolio/Brand Fallback */
            <div className="py-20 md:py-28 text-center relative" style={{ backgroundColor: surface }}>
              {/* Decorative violet accent dot */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: violet }} />
              </div>

              <div className="max-w-4xl mx-auto px-6">
                <h1 className="font-folio text-5xl md:text-8xl font-bold leading-[0.95] tracking-tight" style={{ color: black }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="font-folio text-lg md:text-xl mt-6 font-medium" style={{ color: violet }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-folio text-base max-w-lg mx-auto mt-5 leading-relaxed" style={{ color: textMuted }}>
                    {store.about.description}
                  </p>
                )}
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: violet }} />
                <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: violet + '40' }} />
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
