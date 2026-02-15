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

// Minimal theme configuration
const minimalTheme: ThemeConfig = {
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceHover: '#f9fafb',
    text: '#111827',
    textMuted: '#6b7280',
    textInverted: '#ffffff',
    primary: '#111827',
    primaryHover: '#1f2937',
    accent: '#111827',
    border: '#f3f4f6',
    badge: 'rgba(255,255,255,0.95)',
    badgeText: '#111827',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  effects: {
    cardHover: 'scale-105',
    buttonHover: 'scale-110',
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

export default function MinimalTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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
    <ThemeProvider theme={minimalTheme} store={store}>
      <div className="min-h-screen bg-white">
        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-white/90 backdrop-blur-lg shadow-[0_1px_0_rgba(0,0,0,0.05)]' : 'bg-white'
        }`}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo && <img src={store.logo} alt={store.name} className="h-9 w-9 object-contain rounded-lg" />}
              <span className={`font-medium tracking-tight transition-all duration-300 ${scrolled ? 'text-base' : 'text-lg'}`}>
                {store.name}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors"
            >
              <svg className="w-[22px] h-[22px] text-gray-800" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-gray-900 text-white text-[10px] font-semibold rounded-full flex items-center justify-center animate-scaleIn">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 md:px-6 pt-4 pb-8">
          <div className="max-w-6xl mx-auto">
            {(store.heroImage || store.heroImageMobile) && (
              <>
                <div className="md:hidden relative overflow-hidden rounded-2xl mb-8 flex justify-center bg-gray-100">
                  <img src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt="" className="w-full h-auto max-h-[400px] object-contain" />
                </div>
                <div className="hidden md:block relative overflow-hidden rounded-3xl mb-8">
                  <img src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt="" className="w-full aspect-[16/5] object-cover" />
                </div>
              </>
            )}
            <div className={`${(store.heroImage || store.heroImageMobile) ? 'text-left' : 'text-center py-8 md:py-16'}`}>
              {!(store.heroImage || store.heroImageMobile) && (
                <h1 className="text-4xl md:text-6xl font-light tracking-tight text-gray-900 mb-4">{store.name}</h1>
              )}
              {store.about?.slogan && (
                <p className={`text-gray-500 ${(store.heroImage || store.heroImageMobile) ? 'text-base md:text-lg' : 'text-lg md:text-xl'} max-w-2xl ${(store.heroImage || store.heroImageMobile) ? '' : 'mx-auto'}`}>
                  {store.about.slogan}
                </p>
              )}
            </div>
          </div>
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
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
