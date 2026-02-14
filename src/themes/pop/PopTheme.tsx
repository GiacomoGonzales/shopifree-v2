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

/**
 * POP THEME - "DIVERTIDO"
 * Colorido, energico, juvenil.
 * Colores vibrantes, bordes muy redondeados
 * Ideal para dulces, juguetes, accesorios juveniles
 */

// Pop colors
const yellow = '#FFE135'
const pink = '#FF6B9D'
const blue = '#4ECDC4'
const dark = '#2D2D2D'
const light = '#FFFDF7'

// Pop theme configuration
const popTheme: ThemeConfig = {
  colors: {
    background: light,
    surface: light,
    surfaceHover: '#FFF9E6',
    text: dark,
    textMuted: `${dark}70`,
    textInverted: light,
    primary: dark,
    primaryHover: '#1a1a1a',
    accent: pink,
    border: yellow,
    badge: pink,
    badgeText: light,
  },
  radius: {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Nunito', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: `3px 3px 0 ${dark}`,
    md: `4px 4px 0 ${dark}`,
    lg: `6px 6px 0 ${dark}`,
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

export default function PopTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  return (
    <ThemeProvider theme={popTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: light }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
          .font-pop { font-family: 'Nunito', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}
          style={{
            backgroundColor: scrolled ? `${light}f5` : light,
            backdropFilter: scrolled ? 'blur(12px)' : 'none',
            borderBottom: scrolled ? `3px solid ${yellow}` : '3px solid transparent'
          }}
        >
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ borderColor: pink, borderWidth: '3px', borderStyle: 'solid' }}>
                  <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-pop font-black text-xl" style={{ backgroundColor: pink, color: light }}>
                  {store.name.charAt(0)}
                </div>
              )}
              <h1 className="font-pop font-black text-xl md:text-2xl" style={{ color: dark }}>
                {store.name}
              </h1>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-105" style={{ backgroundColor: blue }}>
                <svg className="w-6 h-6" style={{ color: light }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 text-sm font-pop font-black rounded-full flex items-center justify-center animate-scaleIn" style={{ backgroundColor: pink, color: light }}>
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
              <div className="md:hidden relative max-h-[400px] overflow-hidden" style={{ backgroundColor: yellow }}>
                <img src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt="" className="w-full h-auto max-h-[400px] object-contain" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to top, ${dark}90 0%, transparent 60%)` }} />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-pop font-black text-3xl text-white mb-2 drop-shadow-lg">{store.name}</h2>
                  {store.about?.slogan && <p className="font-pop font-bold text-white/90">{store.about.slogan}</p>}
                </div>
              </div>
              <div className="hidden md:block relative overflow-hidden">
                <img src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt="" className="w-full aspect-[16/5] object-cover" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to top, ${dark}80 0%, transparent 50%)` }} />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-pop font-black text-5xl lg:text-6xl text-white mb-3 drop-shadow-lg">{store.name}</h2>
                  {store.about?.slogan && <p className="font-pop font-bold text-xl text-white/90">{store.about.slogan}</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 md:py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${yellow} 0%, ${pink} 50%, ${blue} 100%)` }}>
              <div className="absolute top-10 left-10 w-20 h-20 rounded-full opacity-30" style={{ backgroundColor: light }} />
              <div className="absolute bottom-10 right-10 w-32 h-32 rounded-3xl rotate-12 opacity-20" style={{ backgroundColor: light }} />
              <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-2xl -rotate-12 opacity-25" style={{ backgroundColor: light }} />
              <div className="relative max-w-4xl mx-auto px-6 text-center">
                <h1 className="font-pop font-black text-5xl md:text-7xl text-white mb-4 drop-shadow-lg">{store.name}</h1>
                {store.about?.slogan && <p className="font-pop font-bold text-xl md:text-2xl text-white/90">{store.about.slogan}</p>}
              </div>
            </div>
          )}
        </section>


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
        <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
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
