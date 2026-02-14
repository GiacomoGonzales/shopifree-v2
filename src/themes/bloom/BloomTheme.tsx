/**
 * BLOOM THEME - "FLORES Y ENCANTO"
 *
 * Filosofia: Delicado, romantico, etéreo.
 * - Paleta: Rosa petalo, verde salvia, blanco floral
 * - Tipografia: Serif fina con cursiva para titulos
 * - Layout suave con formas organicas
 * - Transiciones delicadas y elegantes
 * - Ideal para: Florerias, regalerias, eventos, wedding planners
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

// Bloom colors
const rosePetal = '#F9A8B8'
const deepRose = '#E8758A'
const sage = '#6B8F71'
const deepSage = '#527A58'
const floralWhite = '#FFFBFC'
const blush = '#FFF0F3'
const warmGold = '#D4A574'
const darkText = '#3D2C2E'
const mutedText = '#8B7578'
const white = '#FFFFFF'

// Bloom theme configuration
const bloomTheme: ThemeConfig = {
  colors: {
    background: floralWhite,
    surface: white,
    surfaceHover: blush,
    text: darkText,
    textMuted: mutedText,
    textInverted: white,
    primary: sage,
    primaryHover: deepSage,
    accent: rosePetal,
    border: '#F5DDE1',
    badge: rosePetal,
    badgeText: white,
  },
  radius: {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Lato', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 8px 0 rgb(249 168 184 / 0.1)',
    md: '0 4px 16px -2px rgb(249 168 184 / 0.15)',
    lg: '0 20px 40px -8px rgb(249 168 184 / 0.18)',
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

export default function BloomTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Flower icon
  const FlowerIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25zM12 5.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 9.38 9.5 8s1.12-2.5 2.5-2.5zM3 13c0 4.97 4.03 9 9 9-4.97 0-9-4.03-9-9z" />
    </svg>
  )

  // Leaf icon
  const LeafIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
    </svg>
  )

  return (
    <ThemeProvider theme={bloomTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: floralWhite }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Lato:wght@300;400;700&display=swap');
          .font-bloom-heading { font-family: 'Cormorant Garamond', Georgia, serif; }
          .font-bloom-body { font-family: 'Lato', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm font-medium font-bloom-body animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || sage,
              color: store.announcement?.textColor || white
            }}
          >
            <FlowerIcon className="w-4 h-4 inline-block mr-2" />
            {store.announcement?.link ? (
              <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {store.announcement.text}
              </a>
            ) : (
              <span>{store.announcement?.text}</span>
            )}
            <FlowerIcon className="w-4 h-4 inline-block ml-2" />
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
            backgroundColor: scrolled ? `${floralWhite}f5` : floralWhite,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `2px solid ${rosePetal}50` : '2px solid transparent'
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
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: blush }}
                >
                  <FlowerIcon className="w-7 h-7" style={{ color: deepRose }} />
                </div>
              )}
              <div>
                <h1 className="font-bloom-heading text-2xl md:text-3xl font-semibold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-bloom-heading italic" style={{ color: sage }}>
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
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: sage }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn font-bloom-body"
                  style={{ backgroundColor: rosePetal, color: white }}
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
                  style={{ background: `linear-gradient(to top, ${floralWhite} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-bloom-heading text-4xl font-semibold italic" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-bloom-heading italic mt-1" style={{ color: sage }}>
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
                  style={{ background: `linear-gradient(to top, ${floralWhite} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-bloom-heading text-5xl lg:text-6xl font-semibold italic" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-bloom-heading text-xl italic mt-2" style={{ color: sage }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Floral Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: blush }}>
              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden opacity-[0.07]">
                <div className="absolute top-6 left-10 rotate-[-15deg]">
                  <FlowerIcon className="w-24 h-24" style={{ color: deepRose }} />
                </div>
                <div className="absolute top-20 right-16 rotate-[20deg]">
                  <LeafIcon className="w-16 h-16" style={{ color: sage }} />
                </div>
                <div className="absolute bottom-10 left-1/4 rotate-[10deg]">
                  <LeafIcon className="w-20 h-20" style={{ color: sage }} />
                </div>
                <div className="absolute bottom-16 right-1/4 rotate-[-10deg]">
                  <FlowerIcon className="w-18 h-18" style={{ color: deepRose }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium mb-6 font-bloom-body"
                  style={{ backgroundColor: `${sage}15`, color: sage, border: `1px solid ${sage}30` }}
                >
                  <LeafIcon className="w-4 h-4" />
                  {lang === 'en' ? 'With Love' : lang === 'pt' ? 'Com Amor' : 'Con Amor'}
                </div>

                <h1 className="font-bloom-heading text-4xl md:text-6xl font-semibold italic" style={{ color: darkText }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-lg md:text-xl mt-4 font-bloom-heading italic" style={{ color: sage }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-bloom-body text-base max-w-xl mx-auto mt-6 leading-relaxed font-light" style={{ color: mutedText }}>
                    {store.about.description}
                  </p>
                )}

                {/* Decorative divider */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  <div className="w-16 h-px" style={{ backgroundColor: rosePetal }} />
                  <FlowerIcon className="w-5 h-5" style={{ color: rosePetal }} />
                  <div className="w-16 h-px" style={{ backgroundColor: rosePetal }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: floralWhite }}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-px" style={{ backgroundColor: rosePetal }} />
            <p className="font-bloom-heading text-base italic tracking-wide" style={{ color: sage }}>
              {lang === 'en' ? 'Our Collection' : lang === 'pt' ? 'Nossa Colecao' : 'Nuestra Coleccion'}
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: rosePetal }} />
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: floralWhite }}>
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
