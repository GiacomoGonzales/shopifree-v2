/**
 * FITNESS THEME - "ENTRENA DURO"
 *
 * Filosofia: Agresivo, motivacional, energetico.
 * - Paleta: Negro intenso, rojo energetico, blanco
 * - Tipografia: Condensada, bold, impactante
 * - Layout deportivo con lineas dinamicas
 * - Transiciones rapidas y contundentes
 * - Ideal para: Gimnasios, suplementos, ropa deportiva, equipamiento
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

// Fitness colors
const black = '#111111'
const darkGray = '#1A1A1A'
const red = '#EF4444'
const redHover = '#DC2626'
const white = '#FFFFFF'
const lightGray = '#F5F5F5'
const mutedGray = '#9CA3AF'

// Fitness theme configuration
const fitnessTheme: ThemeConfig = {
  colors: {
    background: black,
    surface: darkGray,
    surfaceHover: '#252525',
    text: white,
    textMuted: mutedGray,
    textInverted: black,
    primary: red,
    primaryHover: redHover,
    accent: white,
    border: '#2A2A2A',
    badge: red,
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
    heading: "'Oswald', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.4)',
    lg: '0 20px 40px -8px rgb(0 0 0 / 0.5)',
  },
  effects: {
    cardHover: 'scale-105',
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

export default function FitnessTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Lightning bolt icon
  const BoltIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" />
    </svg>
  )

  return (
    <ThemeProvider theme={fitnessTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: black }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
          .font-fitness-heading { font-family: 'Oswald', system-ui, sans-serif; }
          .font-fitness-body { font-family: 'Inter', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm font-bold font-fitness-heading uppercase tracking-widest animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || red,
              color: store.announcement?.textColor || white
            }}
          >
            <BoltIcon className="w-4 h-4 inline-block mr-2" />
            {store.announcement?.link ? (
              <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {store.announcement.text}
              </a>
            ) : (
              <span>{store.announcement?.text}</span>
            )}
            <BoltIcon className="w-4 h-4 inline-block ml-2" />
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${black}f0` : black,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `2px solid ${red}` : '2px solid transparent'
          }}
        >
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{ backgroundColor: red }}
                >
                  <BoltIcon className="w-7 h-7" style={{ color: white }} />
                </div>
              )}
              <div>
                <h1 className="font-fitness-heading text-2xl md:text-3xl font-bold uppercase tracking-wider" style={{ color: white }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-medium font-fitness-body uppercase tracking-widest" style={{ color: red }}>
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
                className="w-12 h-12 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: red }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn font-fitness-body"
                  style={{ backgroundColor: white, color: black }}
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
                  style={{ background: `linear-gradient(to top, ${black} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-fitness-heading text-4xl font-bold uppercase tracking-wider" style={{ color: white }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-fitness-body font-semibold mt-1 uppercase tracking-widest text-sm" style={{ color: red }}>
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
                  style={{ background: `linear-gradient(to top, ${black} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-fitness-heading text-5xl lg:text-7xl font-bold uppercase tracking-wider" style={{ color: white }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-fitness-body text-lg font-semibold mt-2 uppercase tracking-widest" style={{ color: red }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Aggressive Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: darkGray }}>
              {/* Diagonal stripes background */}
              <div className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, ${red} 20px, ${red} 22px)`
                }}
              />

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold mb-6 font-fitness-heading uppercase tracking-widest"
                  style={{ backgroundColor: red, color: white }}
                >
                  <BoltIcon className="w-4 h-4" />
                  {lang === 'en' ? 'Train Hard' : lang === 'pt' ? 'Treine Forte' : 'Entrena Duro'}
                </div>

                <h1 className="font-fitness-heading text-5xl md:text-7xl font-bold uppercase tracking-wider" style={{ color: white }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-lg md:text-xl font-semibold mt-4 font-fitness-body uppercase tracking-widest" style={{ color: red }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-fitness-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: mutedGray }}>
                    {store.about.description}
                  </p>
                )}

                {/* Decorative divider */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  <div className="w-12 h-[2px]" style={{ backgroundColor: red }} />
                  <BoltIcon className="w-5 h-5" style={{ color: red }} />
                  <div className="w-12 h-[2px]" style={{ backgroundColor: red }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: black }}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-[2px]" style={{ backgroundColor: red }} />
            <p className="font-fitness-heading text-sm font-bold tracking-[0.3em] uppercase" style={{ color: red }}>
              {lang === 'en' ? 'Our Products' : lang === 'pt' ? 'Nossos Produtos' : 'Nuestros Productos'}
            </p>
            <div className="w-8 h-[2px]" style={{ backgroundColor: red }} />
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
