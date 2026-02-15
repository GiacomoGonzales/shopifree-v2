/**
 * SLATE THEME - "PROFESIONAL CORPORATIVO"
 *
 * Filosofia: Limpio, profesional, confiable.
 * - Paleta: Slate blue sobre blanco, tonos neutros
 * - Tipografia: Outfit - moderna y corporativa
 * - Bordes pequenos, aspecto corporativo
 * - Transiciones sutiles y elegantes
 * - Ideal para: Cualquier tipo de negocio, servicios profesionales
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

// Slate colors
const slateBlue = '#475569'
const slateDark = '#334155'
const slateLight = '#64748B'
const background = '#FFFFFF'
const surface = '#F8FAFC'
const white = '#FFFFFF'

// Slate theme configuration - professional and corporate
const slateTheme: ThemeConfig = {
  colors: {
    background: background,
    surface: surface,
    surfaceHover: '#F1F5F9',
    text: '#0F172A',
    textMuted: slateLight,
    textInverted: white,
    primary: slateBlue,
    primaryHover: slateDark,
    accent: '#3B82F6',
    border: '#E2E8F0',
    badge: slateBlue,
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
    heading: "'Outfit', system-ui, sans-serif",
    body: "'Outfit', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
    lg: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
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

export default function SlateTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Briefcase/document icon
  const SlateIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )

  return (
    <ThemeProvider theme={slateTheme} store={store}>
      <div className="min-h-screen font-slate" style={{ backgroundColor: background }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
          .font-slate { font-family: 'Outfit', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />



        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${white}f8` : white,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#E2E8F0' : 'transparent'}`
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
                  style={{ backgroundColor: `${slateBlue}10` }}
                >
                  <SlateIcon className="w-5 h-5" style={{ color: slateBlue }} />
                </div>
              )}
              <h1 className="font-slate text-xl md:text-2xl font-semibold" style={{ color: '#0F172A' }}>
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
                style={{ backgroundColor: `${slateBlue}10` }}
              >
                <svg className="w-5 h-5" style={{ color: slateBlue }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 text-xs font-semibold flex items-center justify-center rounded-md animate-scaleIn font-slate"
                  style={{ backgroundColor: slateBlue, color: white }}
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
                  <h2 className="font-slate text-3xl font-semibold" style={{ color: '#0F172A' }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-slate text-sm mt-2" style={{ color: slateLight }}>
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
                  <h2 className="font-slate text-5xl font-semibold" style={{ color: '#0F172A' }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-slate text-lg mt-3" style={{ color: slateLight }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Clean Corporate Fallback */
            <div className="py-16 md:py-24 text-center relative" style={{ backgroundColor: surface }}>
              {/* Subtle geometric decoration */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="w-16 h-px" style={{ backgroundColor: '#E2E8F0' }} />
                <div className="w-2 h-2 rounded-sm rotate-45" style={{ backgroundColor: slateBlue }} />
                <div className="w-16 h-px" style={{ backgroundColor: '#E2E8F0' }} />
              </div>

              <div className="max-w-3xl mx-auto px-6 pt-6">
                <h1 className="font-slate text-4xl md:text-6xl font-semibold" style={{ color: '#0F172A' }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="font-slate text-lg md:text-xl mt-4" style={{ color: slateLight }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-slate text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: '#94A3B8' }}>
                    {store.about.description}
                  </p>
                )}
              </div>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="w-16 h-px" style={{ backgroundColor: '#E2E8F0' }} />
                <div className="w-2 h-2 rounded-sm rotate-45" style={{ backgroundColor: slateBlue }} />
                <div className="w-16 h-px" style={{ backgroundColor: '#E2E8F0' }} />
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
