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

/**
 * BOLD THEME - "IMPACTO"
 *
 * Filosofia: Brutalista, contundente, sin disculpas.
 * - Bordes afilados, sin redondeos
 * - Tipografia ALL CAPS, extra bold
 * - Contraste extremo negro + acento vibrante
 * - Geometria industrial
 */

// Bold theme configuration
const boldTheme: ThemeConfig = {
  colors: {
    background: '#000000',
    surface: '#171717',
    surfaceHover: '#262626',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.5)',
    textInverted: '#000000',
    primary: '#FBBF24',
    primaryHover: '#F59E0B',
    accent: '#FBBF24',
    border: 'rgba(251,191,36,0.2)',
    badge: '#FBBF24',
    badgeText: '#000000',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '0',
  },
  fonts: {
    heading: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  effects: {
    cardHover: 'scale-105',
    buttonHover: 'scale-105',
    headerBlur: false,
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

export default function BoldTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [announcementVisible, setAnnouncementVisible] = useState(true)

  const accent = store.themeSettings?.primaryColor || '#FBBF24'
  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && announcementVisible

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
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

  // Create dynamic theme with store accent color
  const dynamicTheme: ThemeConfig = {
    ...boldTheme,
    colors: {
      ...boldTheme.colors,
      primary: accent,
      primaryHover: accent,
      accent: accent,
      border: `${accent}33`,
      badge: accent,
    }
  }

  return (
    <ThemeProvider theme={dynamicTheme} store={store}>
      <div className="min-h-screen bg-black text-white">
        {/* Announcement Bar */}
        {showAnnouncement && (
          <div
            className="relative overflow-hidden"
            style={{ backgroundColor: store.announcement?.backgroundColor || accent }}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`,
              }} />
            </div>
            <div className="relative flex items-center justify-center py-3 px-12">
              {store.announcement?.link ? (
                <a
                  href={store.announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-black uppercase tracking-widest hover:underline"
                  style={{ color: store.announcement?.textColor || '#000000' }}
                >
                  {store.announcement.text} →
                </a>
              ) : (
                <span
                  className="text-sm font-black uppercase tracking-widest"
                  style={{ color: store.announcement?.textColor || '#000000' }}
                >
                  {store.announcement?.text}
                </span>
              )}
              <button
                onClick={() => setAnnouncementVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: store.announcement?.textColor || '#000000' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className={`sticky top-0 z-50 transition-all duration-200 ${
          isScrolled ? 'bg-black border-b-2' : 'bg-black'
        }`} style={{ borderColor: isScrolled ? accent : 'transparent' }}>
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo && (
                <div className="w-10 h-10 bg-white flex items-center justify-center overflow-hidden">
                  <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                </div>
              )}
              <span className="text-xl md:text-2xl font-black uppercase tracking-tight" style={{ color: accent }}>
                {store.name}
              </span>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="relative group">
              <div
                className="w-12 h-12 flex items-center justify-center transition-all group-hover:scale-105"
                style={{ backgroundColor: accent }}
              >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black text-xs font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        {(store.heroImage || store.heroImageMobile) ? (
          <section className="relative">
            <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center" style={{ backgroundColor: '#111' }}>
              <img
                src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                alt={store.name}
                className="w-full h-auto max-h-[400px] object-contain"
              />
              <div className="absolute inset-0 pointer-events-none" style={{
                background: `linear-gradient(135deg, ${accent}CC 0%, transparent 50%, black 100%)`
              }} />
              <div className="absolute bottom-0 left-0 p-6">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">{store.name}</h1>
                {store.about?.slogan && (
                  <p className="text-white/80 text-lg mt-2 max-w-lg uppercase tracking-wide font-medium">{store.about.slogan}</p>
                )}
              </div>
            </div>
            <div className="hidden md:block relative overflow-hidden">
              <img
                src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')}
                alt={store.name}
                className="w-full aspect-[16/5] object-cover"
              />
              <div className="absolute inset-0 pointer-events-none" style={{
                background: `linear-gradient(135deg, ${accent}CC 0%, transparent 50%, black 100%)`
              }} />
              <div className="absolute bottom-0 left-0 p-10">
                <h1 className="text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-none">{store.name}</h1>
                {store.about?.slogan && (
                  <p className="text-white/80 text-xl mt-2 max-w-lg uppercase tracking-wide font-medium">{store.about.slogan}</p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-[60%] h-full" style={{ backgroundColor: accent }} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[100px] opacity-20" style={{ backgroundColor: accent }} />
            <div className="relative max-w-7xl mx-auto px-4 text-center">
              <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black uppercase tracking-tighter leading-none" style={{ color: accent }}>
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="text-white/50 text-lg md:text-xl mt-6 uppercase tracking-widest">{store.about.slogan}</p>
              )}
              <div className="w-32 h-1 mx-auto mt-8" style={{ backgroundColor: accent }} />
            </div>
          </section>
        )}

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-7xl mx-auto px-4 py-8 md:py-12 pb-32">
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
