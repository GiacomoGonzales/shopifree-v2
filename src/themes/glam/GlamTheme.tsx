/**
 * GLAM THEME - "BELLEZA PREMIUM"
 *
 * Filosofia: Elegante, lujoso, femenino.
 * - Paleta: Rosa nude, dorado, negro, blanco
 * - Tipografia: Serif elegante tipo revista de moda
 * - Layout sofisticado con detalles dorados
 * - Transiciones suaves y refinadas
 * - Ideal para: Maquillaje, perfumeria, beauty premium, cosmeticos
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
  CheckoutDrawer
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

// Glam colors
const nude = '#FDF5F3'
const softPink = '#FDEAEA'
const gold = '#C9A962'
const darkGold = '#B8944D'
const black = '#1A1A1A'
const charcoal = '#2D2D2D'
const white = '#FFFFFF'

// Glam theme configuration
const glamTheme: ThemeConfig = {
  colors: {
    background: nude,
    surface: white,
    surfaceHover: softPink,
    text: black,
    textMuted: '#6B6B6B',
    textInverted: white,
    primary: gold,
    primaryHover: darkGold,
    accent: black,
    border: '#F5E6E0',
    badge: gold,
    badgeText: black,
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Nunito Sans', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
    lg: '0 20px 40px -8px rgb(0 0 0 / 0.12)',
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
}

export default function GlamTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const lang = (store.language as 'es' | 'en' | 'pt') || 'es'

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

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

  return (
    <ThemeProvider theme={glamTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: nude }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Nunito+Sans:wght@300;400;500;600&display=swap');
          .font-glam { font-family: 'Cormorant Garamond', Georgia, serif; }
          .font-glam-body { font-family: 'Nunito Sans', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm tracking-wider font-glam-body animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || black,
              color: store.announcement?.textColor || white
            }}
          >
            {store.announcement?.link ? (
              <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {store.announcement.text}
              </a>
            ) : (
              <span>{store.announcement?.text}</span>
            )}
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-5'}`}
          style={{
            backgroundColor: scrolled ? `${white}f8` : white,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#F5E6E0' : 'transparent'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                /* Elegant monogram placeholder */
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{ border: `1.5px solid ${gold}` }}
                >
                  <span className="font-glam text-xl font-semibold" style={{ color: gold }}>
                    {store.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="font-glam text-2xl md:text-3xl font-medium tracking-wide" style={{ color: black }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs tracking-[0.15em] uppercase mt-0.5 font-glam-body" style={{ color: gold }}>
                    {store.about.slogan}
                  </p>
                )}
              </div>
            </div>

            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative group"
            >
              <div
                className="w-11 h-11 flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ border: `1px solid ${gold}` }}
              >
                <svg className="w-5 h-5" style={{ color: gold }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 text-xs font-medium flex items-center justify-center animate-scaleIn font-glam-body"
                  style={{ backgroundColor: gold, color: black }}
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
              <div className="md:hidden relative max-h-[450px] overflow-hidden">
                <img
                  src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                  alt=""
                  className="w-full h-auto max-h-[450px] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${nude} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                  <h2 className="font-glam text-3xl font-medium tracking-wide" style={{ color: black }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.1em] uppercase mt-2 font-glam-body" style={{ color: charcoal }}>
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
                  style={{ background: `linear-gradient(to top, ${nude} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-16 text-center">
                  <h2 className="font-glam text-5xl lg:text-6xl font-medium tracking-wide" style={{ color: black }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.2em] uppercase mt-4 font-glam-body" style={{ color: charcoal }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Elegant Glam Fallback */
            <div className="py-20 md:py-28 text-center relative overflow-hidden" style={{ backgroundColor: softPink }}>
              {/* Decorative gold lines */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{ backgroundColor: gold, opacity: 0.3 }} />
              <div className="absolute bottom-0 left-0 right-0 h-px" style={{ backgroundColor: gold, opacity: 0.3 }} />

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Decorative element */}
                <div className="flex items-center justify-center gap-6 mb-8">
                  <div className="w-16 h-px" style={{ backgroundColor: gold }} />
                  <div className="w-3 h-3 rotate-45" style={{ border: `1px solid ${gold}` }} />
                  <div className="w-16 h-px" style={{ backgroundColor: gold }} />
                </div>

                <h1 className="font-glam text-5xl md:text-7xl font-medium tracking-wide" style={{ color: black }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-sm tracking-[0.2em] uppercase mt-6 font-glam-body" style={{ color: charcoal }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-glam-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: `${black}99` }}>
                    {store.about.description}
                  </p>
                )}

                {/* Bottom decorative element */}
                <div className="flex items-center justify-center gap-6 mt-10">
                  <div className="w-16 h-px" style={{ backgroundColor: gold }} />
                  <div className="w-3 h-3 rotate-45" style={{ border: `1px solid ${gold}` }} />
                  <div className="w-16 h-px" style={{ backgroundColor: gold }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Collection Title */}
        <div className="py-10 text-center" style={{ backgroundColor: nude }}>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-px" style={{ backgroundColor: `${gold}60` }} />
            <p className="font-glam text-sm tracking-[0.3em] uppercase" style={{ color: gold }}>
              {lang === 'en' ? 'Collection' : lang === 'pt' ? 'Colecao' : 'Coleccion'}
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: `${gold}60` }} />
          </div>
        </div>

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: nude }}>
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
