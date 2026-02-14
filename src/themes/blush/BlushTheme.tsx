/**
 * BLUSH THEME - "COSMETICS ROSA CORAL"
 *
 * Filosofia: Rosa coral, femenino, fresco.
 * - Paleta: Rose sobre rosa claro
 * - Tipografia: Sora (heading) + Nunito Sans (body)
 * - Bordes medios-grandes
 * - Sombras con tinte rosado
 * - Ideal para: Maquillaje, accesorios femeninos, beauty, nail art
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
  TrustBar
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

// Blush colors
const rose = '#E11D48'
const roseHover = '#BE123C'
const rosePink = '#FFF1F2'
const softPink = '#FFE4E6'
const coral = '#FB7185'
const darkText = '#2D1520'
const mutedText = '#8B6577'
const white = '#FFFFFF'

// Blush theme configuration - rose coral cosmetics
const blushTheme: ThemeConfig = {
  colors: {
    background: rosePink,
    surface: white,
    surfaceHover: softPink,
    text: darkText,
    textMuted: mutedText,
    textInverted: white,
    primary: rose,
    primaryHover: roseHover,
    accent: coral,
    border: '#FECDD3',
    badge: rose,
    badgeText: white,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1.25rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Sora', system-ui, sans-serif",
    body: "'Nunito Sans', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(225 29 72 / 0.06)',
    md: '0 4px 12px -2px rgb(225 29 72 / 0.1)',
    lg: '0 20px 40px -8px rgb(225 29 72 / 0.15)',
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

export default function BlushTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)


  const lang = (store.language as 'es' | 'en' | 'pt') || 'es'

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

  // Flower/lips icon
  const BlushIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  )

  return (
    <ThemeProvider theme={blushTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: rosePink }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
          .font-blush { font-family: 'Sora', system-ui, sans-serif; }
          .font-blush-body { font-family: 'Nunito Sans', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />



        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-5'}`}
          style={{
            backgroundColor: scrolled ? `${white}f8` : white,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#FECDD3' : 'transparent'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: softPink }}
                >
                  <BlushIcon className="w-6 h-6" style={{ color: rose }} />
                </div>
              )}
              <div>
                <h1 className="font-blush text-2xl md:text-3xl font-semibold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs tracking-wide mt-0.5 font-blush-body" style={{ color: coral }}>
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
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: softPink }}
              >
                <svg className="w-5 h-5" style={{ color: rose }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 text-xs font-medium flex items-center justify-center rounded-full animate-scaleIn font-blush-body"
                  style={{ backgroundColor: rose, color: white }}
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
                  style={{ background: `linear-gradient(to top, ${rosePink} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                  <h2 className="font-blush text-3xl font-semibold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm mt-2 font-blush-body" style={{ color: mutedText }}>
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
                  style={{ background: `linear-gradient(to top, ${rosePink} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-16 text-center">
                  <h2 className="font-blush text-5xl lg:text-6xl font-semibold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-wide mt-4 font-blush-body" style={{ color: mutedText }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Blush Fallback */
            <div className="py-20 md:py-28 text-center relative overflow-hidden" style={{ backgroundColor: softPink }}>
              {/* Decorative hearts */}
              <div className="absolute inset-0 overflow-hidden opacity-8">
                <div className="absolute top-10 left-12 rotate-[-15deg]">
                  <BlushIcon className="w-16 h-16" style={{ color: rose }} />
                </div>
                <div className="absolute bottom-14 right-10 rotate-[10deg]">
                  <BlushIcon className="w-20 h-20" style={{ color: coral }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                <div className="flex items-center justify-center gap-6 mb-8">
                  <div className="w-16 h-px" style={{ backgroundColor: `${rose}30` }} />
                  <BlushIcon className="w-5 h-5" style={{ color: rose }} />
                  <div className="w-16 h-px" style={{ backgroundColor: `${rose}30` }} />
                </div>

                <h1 className="font-blush text-5xl md:text-7xl font-semibold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="text-sm tracking-wide mt-6 font-blush-body" style={{ color: mutedText }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-blush-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: `${darkText}88` }}>
                    {store.about.description}
                  </p>
                )}

                <div className="flex items-center justify-center gap-6 mt-10">
                  <div className="w-16 h-px" style={{ backgroundColor: `${rose}30` }} />
                  <BlushIcon className="w-5 h-5" style={{ color: rose }} />
                  <div className="w-16 h-px" style={{ backgroundColor: `${rose}30` }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Collection Title */}
        <div className="py-10 text-center" style={{ backgroundColor: rosePink }}>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-px" style={{ backgroundColor: `${rose}30` }} />
            <p className="font-blush text-sm tracking-[0.2em] uppercase font-medium" style={{ color: rose }}>
              {lang === 'en' ? 'Our Products' : lang === 'pt' ? 'Nossos Produtos' : 'Nuestros Productos'}
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: `${rose}30` }} />
          </div>
        </div>


        <TrustBar />

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: rosePink }}>
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
