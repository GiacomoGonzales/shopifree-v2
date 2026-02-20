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

/**
 * LUXE THEME - "ELEGANCIA"
 * Sofisticado, exclusivo, atemporal.
 * Paleta: Negro, dorado, blanco crema
 * Tipografia serif elegante
 */

// Luxe colors
const gold = '#C9A962'
const darkBg = '#0D0D0D'
const cream = '#FAF8F5'

// Luxe theme configuration
const luxeTheme: ThemeConfig = {
  colors: {
    background: cream,
    surface: cream,
    surfaceHover: '#F5F3F0',
    text: darkBg,
    textMuted: `${darkBg}80`,
    textInverted: cream,
    primary: darkBg,
    primaryHover: '#1a1a1a',
    accent: gold,
    border: `${gold}30`,
    badge: darkBg,
    badgeText: gold,
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '0',
  },
  fonts: {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Cormorant Garamond', Georgia, serif",
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.15)',
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
  initialProduct?: Product | null
}

export default function LuxeTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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

  return (
    <ThemeProvider theme={luxeTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: cream }}>
        {/* Google Fonts for Serif */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
          .font-serif-luxe { font-family: 'Cormorant Garamond', Georgia, serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-700 ${scrolled ? 'py-3' : 'py-5'}`}
          style={{
            backgroundColor: scrolled ? `${cream}f5` : cream,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `1px solid ${gold}20` : '1px solid transparent'
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo && (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <h1 className="font-serif-luxe text-2xl md:text-3xl font-semibold tracking-wide" style={{ color: darkBg }}>
                {store.name}
              </h1>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="relative group">
              <div className="w-12 h-12 flex items-center justify-center border transition-all duration-300 group-hover:scale-105" style={{ borderColor: darkBg }}>
                <svg className="w-5 h-5" style={{ color: darkBg }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 text-xs font-medium flex items-center justify-center animate-scaleIn" style={{ backgroundColor: gold, color: darkBg }}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative">
          {(store.heroImage || store.heroImageMobile) ? (
            <>
              <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center" style={{ backgroundColor: darkBg }}>
                <img src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt="" className="w-full h-auto max-h-[400px] object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-serif-luxe text-3xl text-white mb-2">{store.name}</h2>
                  {store.about?.slogan && <p className="text-white/80 text-sm tracking-widest uppercase">{store.about.slogan}</p>}
                </div>
              </div>
              <div className="hidden md:block relative overflow-hidden">
                <img src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt="" className="w-full aspect-[16/5] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-serif-luxe text-5xl lg:text-6xl text-white mb-3">{store.name}</h2>
                  {store.about?.slogan && <p className="text-white/80 text-sm tracking-[0.3em] uppercase">{store.about.slogan}</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 md:py-32 text-center" style={{ backgroundColor: darkBg }}>
              <div className="max-w-4xl mx-auto px-6">
                <div className="w-16 h-px mx-auto mb-8" style={{ backgroundColor: gold }} />
                <h1 className="font-serif-luxe text-5xl md:text-7xl text-white mb-6">{store.name}</h1>
                {store.about?.slogan && <p className="text-white/60 text-sm tracking-[0.3em] uppercase">{store.about.slogan}</p>}
                <div className="w-16 h-px mx-auto mt-8" style={{ backgroundColor: gold }} />
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
