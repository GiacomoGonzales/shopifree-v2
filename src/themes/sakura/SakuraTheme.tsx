/**
 * SAKURA THEME - "ELEGANCIA JAPONESA"
 *
 * Filosofia: Zen, minimalista, armonioso.
 * - Paleta: Negro profundo, rojo carmesi, blanco, dorado
 * - Tipografia: Limpia, minimalista, con toques asiaticos
 * - Layout espacioso, imagenes protagonistas
 * - Transiciones suaves y elegantes
 * - Ideal para: Sushi bars, ramen shops, izakayas, cocina japonesa
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

// Sakura colors
const black = '#0C0C0C'
const darkGray = '#1A1A1A'
const crimson = '#DC2626'
const gold = '#D4A853'
const white = '#FAFAFA'
const sakuraPink = '#FDA4AF'

// Sakura theme configuration
const sakuraTheme: ThemeConfig = {
  colors: {
    background: black,
    surface: darkGray,
    surfaceHover: '#2A2A2A',
    text: white,
    textMuted: '#A1A1AA',
    textInverted: black,
    primary: crimson,
    primaryHover: '#B91C1C',
    accent: gold,
    border: '#27272A',
    badge: crimson,
    badgeText: white,
  },
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Zen Kaku Gothic New', 'Noto Sans JP', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(0 0 0 / 0.4)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.5)',
    lg: '0 20px 40px -8px rgb(0 0 0 / 0.6)',
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
}

export default function SakuraTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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
    <ThemeProvider theme={sakuraTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: black }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Inter:wght@300;400;500;600&display=swap');
          .font-zen { font-family: 'Zen Kaku Gothic New', 'Noto Sans JP', system-ui, sans-serif; }
          .font-sakura-body { font-family: 'Inter', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm tracking-wider font-sakura-body animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || crimson,
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
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity"
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
            backgroundColor: scrolled ? `${black}f5` : black,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${crimson}${scrolled ? '30' : '15'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                /* Japanese-style logo placeholder */
                <div className="w-12 h-12 flex items-center justify-center relative">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${crimson}` }}
                  />
                  <span className="text-lg" style={{ color: crimson }}>桜</span>
                </div>
              )}
              <div>
                <h1 className="font-zen text-2xl md:text-3xl font-medium tracking-wide" style={{ color: white }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs tracking-[0.2em] uppercase mt-0.5 font-sakura-body" style={{ color: gold }}>
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
                style={{
                  border: `1px solid ${crimson}`,
                  borderRadius: '2px'
                }}
              >
                <svg className="w-5 h-5" style={{ color: crimson }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 text-xs font-medium flex items-center justify-center animate-scaleIn"
                  style={{ backgroundColor: crimson, color: white, borderRadius: '2px' }}
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
                  style={{ background: `linear-gradient(to top, ${black} 0%, transparent 60%)` }}
                />
                {/* Decorative corner */}
                <div className="absolute top-4 right-4 w-16 h-16 opacity-30">
                  <svg viewBox="0 0 100 100" style={{ color: gold }}>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                  <h2 className="font-zen text-3xl font-medium" style={{ color: white }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.15em] uppercase mt-2 font-sakura-body" style={{ color: gold }}>
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
                  className="w-full aspect-[21/9] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${black} 0%, transparent 50%)` }}
                />
                {/* Decorative elements */}
                <div className="absolute top-8 right-8 w-24 h-24 opacity-20">
                  <svg viewBox="0 0 100 100" style={{ color: gold }}>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
                    <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-16 text-center">
                  <h2 className="font-zen text-5xl lg:text-6xl font-medium tracking-wide" style={{ color: white }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.25em] uppercase mt-4 font-sakura-body" style={{ color: gold }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Zen Fallback */
            <div className="py-24 md:py-32 text-center relative overflow-hidden" style={{ backgroundColor: darkGray }}>
              {/* Sakura petals decoration */}
              <div className="absolute inset-0 overflow-hidden opacity-10">
                <div className="absolute top-10 left-10 text-6xl" style={{ color: sakuraPink }}>🌸</div>
                <div className="absolute top-20 right-20 text-4xl" style={{ color: sakuraPink }}>🌸</div>
                <div className="absolute bottom-16 left-1/4 text-5xl" style={{ color: sakuraPink }}>🌸</div>
                <div className="absolute bottom-24 right-1/3 text-3xl" style={{ color: sakuraPink }}>🌸</div>
              </div>

              {/* Enso circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-5">
                <svg viewBox="0 0 100 100" style={{ color: crimson }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="280 20" />
                </svg>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Japanese character decoration */}
                <div className="mb-6">
                  <span className="text-5xl" style={{ color: crimson }}>桜</span>
                </div>

                <h1 className="font-zen text-5xl md:text-7xl font-medium tracking-wide" style={{ color: white }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-sm tracking-[0.3em] uppercase mt-6 font-sakura-body" style={{ color: gold }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-sakura-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: `${white}99` }}>
                    {store.about.description}
                  </p>
                )}

                {/* Bottom decoration line */}
                <div className="flex items-center justify-center gap-4 mt-10">
                  <div className="w-12 h-px" style={{ backgroundColor: crimson }} />
                  <div className="w-2 h-2 rotate-45" style={{ backgroundColor: gold }} />
                  <div className="w-12 h-px" style={{ backgroundColor: crimson }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Menu Title */}
        <div className="py-10 text-center" style={{ backgroundColor: black }}>
          <div className="flex items-center justify-center gap-6">
            <div className="w-16 h-px" style={{ backgroundColor: `${crimson}60` }} />
            <div>
              <p className="font-zen text-xs tracking-[0.4em] uppercase mb-1" style={{ color: gold }}>
                {lang === 'en' ? 'Menu' : lang === 'pt' ? 'Cardapio' : 'Carta'}
              </p>
              <p className="font-zen text-lg" style={{ color: white }}>
                {lang === 'en' ? 'Our Selection' : lang === 'pt' ? 'Nossa Selecao' : 'Nuestra Seleccion'}
              </p>
            </div>
            <div className="w-16 h-px" style={{ backgroundColor: `${crimson}60` }} />
          </div>
        </div>

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: black }}>
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
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
