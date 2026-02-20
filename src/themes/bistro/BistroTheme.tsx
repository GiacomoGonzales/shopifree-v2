/**
 * BISTRO THEME - "ELEGANCIA GASTRONOMICA"
 *
 * Filosofia: Sofisticado, intimo, exclusivo.
 * - Paleta: Charcoal oscuro, cobre/bronce, crema, vino
 * - Tipografia: Playfair Display serif elegante
 * - Layout tipo menu de restaurante fino
 * - Transiciones suaves y refinadas
 * - Ideal para: Restaurantes finos, wine bars, bistros, alta cocina
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

// Bistro colors
const charcoal = '#1C1917'
const darkBrown = '#292524'
const copper = '#B87333'
const cream = '#FAF7F2'
const wine = '#722F37'

// Bistro theme configuration
const bistroTheme: ThemeConfig = {
  colors: {
    background: charcoal,
    surface: darkBrown,
    surfaceHover: '#3D3835',
    text: cream,
    textMuted: '#A8A29E',
    textInverted: charcoal,
    primary: copper,
    primaryHover: '#CD853F',
    accent: wine,
    border: `${copper}30`,
    badge: copper,
    badgeText: charcoal,
  },
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.4)',
    lg: '0 20px 40px -8px rgb(0 0 0 / 0.5)',
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
  initialProduct?: Product | null
}

export default function BistroTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
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

  return (
    <ThemeProvider theme={bistroTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: charcoal }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
          .font-serif-bistro { font-family: 'Playfair Display', Georgia, serif; }
          .font-sans-bistro { font-family: 'Inter', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-5'}`}
          style={{
            backgroundColor: scrolled ? `${charcoal}f8` : charcoal,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${copper}${scrolled ? '20' : '10'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo && (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div>
                <h1 className="font-serif-bistro text-2xl md:text-3xl font-semibold" style={{ color: cream }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs tracking-[0.2em] uppercase mt-0.5" style={{ color: copper }}>
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
                style={{
                  backgroundColor: `${copper}20`,
                  border: `1px solid ${copper}40`
                }}
              >
                <svg className="w-5 h-5" style={{ color: copper }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs font-medium flex items-center justify-center rounded-full animate-scaleIn"
                  style={{ backgroundColor: copper, color: charcoal }}
                >
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
              {/* Mobile Hero */}
              <div className="md:hidden relative max-h-[450px] overflow-hidden" style={{ backgroundColor: darkBrown }}>
                <img
                  src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                  alt=""
                  className="w-full h-auto max-h-[450px] object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                  <div className="w-12 h-px mx-auto mb-4" style={{ backgroundColor: copper }} />
                  <h2 className="font-serif-bistro text-3xl mb-2" style={{ color: cream }}>{store.name}</h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.15em] uppercase" style={{ color: copper }}>
                      {store.about.slogan}
                    </p>
                  )}
                  <div className="w-12 h-px mx-auto mt-4" style={{ backgroundColor: copper }} />
                </div>
              </div>

              {/* Desktop Hero */}
              <div className="hidden md:block relative overflow-hidden">
                <img
                  src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')}
                  alt=""
                  className="w-full aspect-[16/5] object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-16 text-center">
                  <div className="w-20 h-px mx-auto mb-6" style={{ backgroundColor: copper }} />
                  <h2 className="font-serif-bistro text-5xl lg:text-6xl mb-4" style={{ color: cream }}>{store.name}</h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.25em] uppercase" style={{ color: copper }}>
                      {store.about.slogan}
                    </p>
                  )}
                  <div className="w-20 h-px mx-auto mt-6" style={{ backgroundColor: copper }} />
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Elegant Fallback */
            <div className="py-24 md:py-32 text-center relative overflow-hidden" style={{ backgroundColor: darkBrown }}>
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(${copper} 1px, transparent 1px)`,
                  backgroundSize: '30px 30px'
                }} />
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Top decoration */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="w-16 h-px" style={{ backgroundColor: copper }} />
                  <svg className="w-6 h-6" style={{ color: copper }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
                  </svg>
                  <div className="w-16 h-px" style={{ backgroundColor: copper }} />
                </div>

                <h1 className="font-serif-bistro text-5xl md:text-7xl mb-6" style={{ color: cream }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-sm tracking-[0.3em] uppercase mb-8" style={{ color: copper }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-sans-bistro text-base max-w-xl mx-auto leading-relaxed" style={{ color: `${cream}99` }}>
                    {store.about.description}
                  </p>
                )}

                {/* Bottom decoration */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <div className="w-16 h-px" style={{ backgroundColor: copper }} />
                  <svg className="w-6 h-6" style={{ color: copper }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
                  </svg>
                  <div className="w-16 h-px" style={{ backgroundColor: copper }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Menu Title */}
        <div className="py-8 text-center" style={{ backgroundColor: charcoal }}>
          <p className="text-xs tracking-[0.3em] uppercase font-sans-bistro" style={{ color: copper }}>
            {lang === 'en' ? 'Our Menu' : lang === 'pt' ? 'Nosso Cardapio' : 'Nuestra Carta'}
          </p>
        </div>


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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: charcoal }}>
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
