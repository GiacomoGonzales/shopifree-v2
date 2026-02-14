/**
 * BARISTA THEME - "AROMA Y SABOR"
 *
 * Filosofia: Calido, acogedor, artesanal.
 * - Paleta: Marron cafe, crema, terracota
 * - Tipografia: Serif elegante para titulos, sans para body
 * - Layout acogedor con detalles de cafe
 * - Transiciones suaves y calidas
 * - Ideal para: Cafeterias, panaderias, chocolaterias
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

// Barista colors
const coffee = '#6F4E37'
const darkCoffee = '#4A3423'
const cream = '#FFF8F0'
const warmCream = '#F5E6D3'
const terracota = '#C2956B'
const espresso = '#2C1810'
const white = '#FFFFFF'
const mutedBrown = '#8B7355'

// Barista theme configuration
const baristaTheme: ThemeConfig = {
  colors: {
    background: cream,
    surface: white,
    surfaceHover: warmCream,
    text: espresso,
    textMuted: mutedBrown,
    textInverted: cream,
    primary: coffee,
    primaryHover: darkCoffee,
    accent: terracota,
    border: '#E8D5C0',
    badge: coffee,
    badgeText: cream,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(111 78 55 / 0.08)',
    md: '0 4px 12px -2px rgb(111 78 55 / 0.12)',
    lg: '0 20px 40px -8px rgb(111 78 55 / 0.15)',
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

export default function BaristaTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Coffee cup icon
  const CoffeeIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" />
    </svg>
  )

  // Coffee bean icon
  const BeanIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.74 0 3.34.56 4.65 1.5C15.55 8.54 13.88 10 12 10s-3.55-1.46-4.65-3.5C8.66 5.56 10.26 5 12 5zm0 14c-1.74 0-3.34-.56-4.65-1.5C8.45 15.46 10.12 14 12 14s3.55 1.46 4.65 3.5C15.34 18.44 13.74 19 12 19z" />
    </svg>
  )

  return (
    <ThemeProvider theme={baristaTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: cream }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@400;500;600;700&display=swap');
          .font-barista-heading { font-family: 'Playfair Display', Georgia, serif; }
          .font-barista-body { font-family: 'DM Sans', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${cream}f5` : cream,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `2px solid ${terracota}` : '2px solid transparent'
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
                  style={{ backgroundColor: coffee }}
                >
                  <CoffeeIcon className="w-7 h-7" style={{ color: cream }} />
                </div>
              )}
              <div>
                <h1 className="font-barista-heading text-2xl md:text-3xl font-bold" style={{ color: espresso }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-medium font-barista-heading italic" style={{ color: terracota }}>
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
                style={{ backgroundColor: coffee }}
              >
                <svg className="w-6 h-6" fill="none" stroke={cream} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn font-barista-body"
                  style={{ backgroundColor: terracota, color: cream }}
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
                  style={{ background: `linear-gradient(to top, ${cream} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-barista-heading text-3xl font-bold" style={{ color: espresso }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-barista-heading italic font-medium mt-1" style={{ color: terracota }}>
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
                  style={{ background: `linear-gradient(to top, ${cream} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-barista-heading text-5xl lg:text-6xl font-bold" style={{ color: espresso }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-barista-heading text-xl italic font-medium mt-2" style={{ color: terracota }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Warm Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: warmCream }}>
              {/* Decorative coffee beans */}
              <div className="absolute inset-0 overflow-hidden opacity-[0.06]">
                <div className="absolute top-8 left-12 rotate-[-20deg]">
                  <BeanIcon className="w-20 h-20" style={{ color: coffee }} />
                </div>
                <div className="absolute top-20 right-16 rotate-[15deg]">
                  <BeanIcon className="w-16 h-16" style={{ color: terracota }} />
                </div>
                <div className="absolute bottom-12 left-1/4 rotate-[-5deg]">
                  <BeanIcon className="w-24 h-24" style={{ color: coffee }} />
                </div>
                <div className="absolute bottom-16 right-1/3 rotate-[25deg]">
                  <BeanIcon className="w-14 h-14" style={{ color: terracota }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium mb-6 font-barista-body"
                  style={{ backgroundColor: coffee, color: cream }}
                >
                  <CoffeeIcon className="w-4 h-4" />
                  {lang === 'en' ? 'Freshly Brewed' : lang === 'pt' ? 'Feito na Hora' : 'Recien Preparado'}
                </div>

                <h1 className="font-barista-heading text-4xl md:text-6xl font-bold" style={{ color: espresso }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-lg md:text-xl font-medium mt-4 font-barista-heading italic" style={{ color: terracota }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-barista-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: mutedBrown }}>
                    {store.about.description}
                  </p>
                )}

                {/* Decorative divider */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <div className="w-16 h-px" style={{ backgroundColor: terracota }} />
                  <BeanIcon className="w-4 h-4" style={{ color: coffee }} />
                  <div className="w-16 h-px" style={{ backgroundColor: terracota }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: cream }}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-px" style={{ backgroundColor: terracota }} />
            <p className="font-barista-heading text-sm font-medium tracking-wider italic" style={{ color: coffee }}>
              {lang === 'en' ? 'Our Menu' : lang === 'pt' ? 'Nosso Cardapio' : 'Nuestro Menu'}
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: terracota }} />
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: cream }}>
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
