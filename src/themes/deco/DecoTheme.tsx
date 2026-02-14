/**
 * DECO THEME - "ESTILO Y HOGAR"
 *
 * Filosofia: Escandinavo, calido, minimalista.
 * - Paleta: Beige arena, verde oliva, terracota, blanco calido
 * - Tipografia: Geometrica limpia, moderna
 * - Layout espacioso tipo catalogo de diseño
 * - Transiciones suaves y elegantes
 * - Ideal para: Mueblerias, decoracion, interiorismo, hogar
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

// Deco colors
const sand = '#E8DCC8'
const warmWhite = '#FAF8F5'
const olive = '#6B7B3A'
const deepOlive = '#556230'
const terracota = '#CC7755'
const charcoal = '#2C2C2C'
const mutedText = '#7A7368'
const white = '#FFFFFF'

// Deco theme configuration
const decoTheme: ThemeConfig = {
  colors: {
    background: warmWhite,
    surface: white,
    surfaceHover: sand,
    text: charcoal,
    textMuted: mutedText,
    textInverted: warmWhite,
    primary: olive,
    primaryHover: deepOlive,
    accent: terracota,
    border: '#DDD5C8',
    badge: terracota,
    badgeText: white,
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  fonts: {
    heading: "'DM Sans', system-ui, sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 3px 0 rgb(44 44 44 / 0.06)',
    md: '0 4px 12px -2px rgb(44 44 44 / 0.08)',
    lg: '0 20px 40px -8px rgb(44 44 44 / 0.1)',
  },
  effects: {
    cardHover: 'scale-105',
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

export default function DecoTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Home icon
  const HomeIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )

  // Diamond/gem icon for decorative use
  const DiamondIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.41L18.59 12 12 18.59 5.41 12 12 5.41z" />
    </svg>
  )

  return (
    <ThemeProvider theme={decoTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: warmWhite }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
          .font-deco { font-family: 'DM Sans', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm font-medium font-deco animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || olive,
              color: store.announcement?.textColor || warmWhite
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
            backgroundColor: scrolled ? `${warmWhite}f5` : warmWhite,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `1px solid ${sand}` : '1px solid transparent'
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
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: sand }}
                >
                  <HomeIcon className="w-6 h-6" style={{ color: charcoal }} />
                </div>
              )}
              <div>
                <h1 className="font-deco text-2xl md:text-3xl font-bold tracking-tight" style={{ color: charcoal }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-medium font-deco tracking-wide" style={{ color: olive }}>
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
                className="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: olive }}
              >
                <svg className="w-6 h-6" fill="none" stroke={warmWhite} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn font-deco"
                  style={{ backgroundColor: terracota, color: white }}
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
                  style={{ background: `linear-gradient(to top, ${warmWhite} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-deco text-3xl font-bold tracking-tight" style={{ color: charcoal }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-deco font-medium mt-1" style={{ color: olive }}>
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
                  style={{ background: `linear-gradient(to top, ${warmWhite} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-deco text-5xl lg:text-6xl font-bold tracking-tight" style={{ color: charcoal }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-deco text-xl font-medium mt-2" style={{ color: olive }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Scandinavian Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: sand }}>
              {/* Subtle geometric pattern */}
              <div className="absolute inset-0 opacity-[0.04]">
                <div className="absolute top-10 left-16">
                  <DiamondIcon className="w-20 h-20" style={{ color: charcoal }} />
                </div>
                <div className="absolute top-24 right-20 rotate-45">
                  <DiamondIcon className="w-14 h-14" style={{ color: charcoal }} />
                </div>
                <div className="absolute bottom-12 left-1/3">
                  <DiamondIcon className="w-16 h-16 rotate-12" style={{ color: charcoal }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium mb-6 font-deco"
                  style={{ backgroundColor: olive, color: warmWhite }}
                >
                  <HomeIcon className="w-4 h-4" />
                  {lang === 'en' ? 'Design Your Space' : lang === 'pt' ? 'Decore Seu Espaco' : 'Disena Tu Espacio'}
                </div>

                <h1 className="font-deco text-4xl md:text-6xl font-bold tracking-tight" style={{ color: charcoal }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-lg md:text-xl font-medium mt-4 font-deco" style={{ color: olive }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-deco text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: mutedText }}>
                    {store.about.description}
                  </p>
                )}

                {/* Minimal divider */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <div className="w-20 h-px" style={{ backgroundColor: terracota }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: warmWhite }}>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-px" style={{ backgroundColor: sand }} />
            <p className="font-deco text-sm font-semibold tracking-widest uppercase" style={{ color: olive }}>
              {lang === 'en' ? 'Our Collection' : lang === 'pt' ? 'Nossa Colecao' : 'Nuestra Coleccion'}
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: sand }} />
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: warmWhite }}>
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
