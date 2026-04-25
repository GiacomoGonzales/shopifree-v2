/**
 * DINER THEME - "DINER AMERICANO 50s"
 *
 * Filosofia: Bolera/diner clasico de los 50: piso ajedrezado rojo y crema,
 * neon "OPEN", letrero script "Bert's Diner", malt-shop vibes.
 * - Rojo encendido + crema + cromo + acento turquesa
 * - Tipografia: Lobster (script) + Bebas Neue (display) + Inter (body)
 * - Hero con neon "OPEN" parpadeante
 * - Patron checkered en banda decorativa
 * - Receipt-tickets como pequenos detalles
 * Ideal para: hamburguesas, milkshakes, diners, retro Americana, pizzerias clasicas, candy stores.
 */

import { useState, useEffect, useMemo } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
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
import { useHeaderLogo } from '../shared/useHeaderLogo'
import HeroImg from '../../components/catalog/HeroImg'

const dinerTheme: ThemeConfig = {
  colors: {
    background: '#FFF8E8',
    surface: '#FFFFFF',
    surfaceHover: '#FFF2D5',
    text: '#1A0F0A',
    textMuted: '#6B4A38',
    textInverted: '#FFF8E8',
    primary: '#D7263D',
    primaryHover: '#B71C30',
    accent: '#2EC4B6',
    border: '#1A0F0A',
    badge: '#FFD93D',
    badgeText: '#1A0F0A',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Lobster', 'Brush Script MT', cursive",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '3px 3px 0 0 #1A0F0A',
    md: '5px 5px 0 0 #1A0F0A',
    lg: '8px 8px 0 0 #1A0F0A',
  },
  effects: {
    cardHover: 'translate(-3px,-3px)',
    buttonHover: 'scale-105',
    headerBlur: false,
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

export default function DinerTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName } = useHeaderLogo(store)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
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
    <ThemeProvider theme={dinerTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Lobster&family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes neon-blink {
          0%, 100% { opacity: 1; text-shadow: 0 0 10px currentColor, 0 0 24px currentColor, 0 0 36px currentColor; }
          50% { opacity: 0.92; text-shadow: 0 0 6px currentColor, 0 0 16px currentColor; }
          92% { opacity: 0.4; }
          93% { opacity: 1; }
        }
      `}</style>

      <div className="min-h-screen relative" style={{ backgroundColor: '#FFF8E8', fontFamily: "'Inter', system-ui, sans-serif", color: '#1A0F0A' }}>
        <AnnouncementBar />

        {/* Checkered band */}
        <div
          className="h-3 w-full"
          style={{
            background: `repeating-linear-gradient(90deg, #D7263D 0 24px, #FFF8E8 24px 48px)`,
          }}
        />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(255,248,232,0.96)' : '#FFF8E8',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '4px solid #1A0F0A',
            boxShadow: scrolled ? '0 4px 0 rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-10 w-auto object-contain" />}
              {showName && (
                <h1
                  className="text-3xl md:text-4xl"
                  style={{
                    fontFamily: "'Lobster', cursive",
                    color: '#D7263D',
                    textShadow: '2px 2px 0 #1A0F0A',
                  }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '1.05rem',
                letterSpacing: '0.15em',
                backgroundColor: '#FFD93D',
                color: '#1A0F0A',
                border: '3px solid #1A0F0A',
                boxShadow: '4px 4px 0 0 #1A0F0A',
              }}
            >
              ORDER · {totalItems}
            </button>
          </div>
        </header>

        {/* Hero — neon sign */}
        <section className="relative py-12 md:py-20 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div
              className="relative p-6 md:p-12"
              style={{
                background: '#1A0F0A',
                border: '4px solid #1A0F0A',
                boxShadow: '8px 8px 0 0 #D7263D',
                color: '#FFF8E8',
              }}
            >
              <div className="text-center">
                <p
                  className="text-3xl md:text-4xl mb-2"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    color: '#2EC4B6',
                    letterSpacing: '0.3em',
                    animation: 'neon-blink 4s infinite',
                  }}
                >
                  ★ OPEN ★
                </p>
                <h2
                  className="text-6xl md:text-8xl lg:text-9xl leading-none"
                  style={{
                    fontFamily: "'Lobster', cursive",
                    color: '#FFD93D',
                    textShadow: '0 0 14px rgba(255,217,61,0.7), 0 0 32px rgba(255,217,61,0.4), 4px 4px 0 #D7263D',
                  }}
                >
                  {store.name}
                </h2>
                {store.about?.slogan && (
                  <p
                    className="mt-6 text-lg md:text-2xl tracking-widest"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFF8E8', letterSpacing: '0.25em' }}
                  >
                    · {store.about.slogan.toUpperCase()} ·
                  </p>
                )}
              </div>

              {(store.heroImage || store.heroImageMobile) && (
                <div className="mt-8 aspect-[16/7] overflow-hidden" style={{ border: '3px solid #FFD93D' }}>
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Receipt ticket */}
            <div
              className="hidden md:block absolute -bottom-6 -right-2 max-w-[220px] p-4 rotate-6"
              style={{
                backgroundColor: '#FFFFFF',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.7rem',
                color: '#1A0F0A',
                boxShadow: '4px 4px 0 0 #1A0F0A',
                border: '2px solid #1A0F0A',
                lineHeight: 1.5,
              }}
            >
              <p className="text-center font-bold mb-1">{store.name.toUpperCase()}</p>
              <p className="text-center mb-2">— SINCE FOREVER —</p>
              <div className="border-t border-dashed border-black/40 my-1" />
              <p>{products.length.toString().padStart(3, '0')} ITEMS ON MENU</p>
              <p>★★★★★ — A+</p>
              <div className="border-t border-dashed border-black/40 my-1" />
              <p className="text-center">THANK YOU!</p>
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section header */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2 flex items-center gap-3">
          <span
            className="text-xl md:text-2xl px-4 py-1"
            style={{
              fontFamily: "'Lobster', cursive",
              color: '#FFF8E8',
              backgroundColor: '#D7263D',
              border: '3px solid #1A0F0A',
              boxShadow: '3px 3px 0 0 #1A0F0A',
              transform: 'rotate(-2deg)',
              display: 'inline-block',
            }}
          >
            {store.language === 'en' ? "Today's Menu" : 'Carta del dia'}
          </span>
          <div className="h-1 flex-1 bg-[#1A0F0A]" />
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-16 md:pb-24">
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
            categories={categories}
          />
        </main>

        {/* Bottom checkered band */}
        <div
          className="h-3 w-full"
          style={{
            background: `repeating-linear-gradient(90deg, #1A0F0A 0 24px, #FFD93D 24px 48px)`,
          }}
        />

        <StoreFooter onWhatsAppClick={onWhatsAppClick} />
        <SocialProofToast />
        <WhatsAppButton whatsapp={store.whatsapp || ''} storeName={store.name} onClick={onWhatsAppClick} visible={totalItems === 0} />
        <CartBar totalItems={totalItems} totalPrice={totalPrice} onViewCart={() => setIsCartOpen(true)} onCheckout={() => setIsCheckoutOpen(true)} />

        {selectedProduct && <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} />}
        {isCartOpen && <CartDrawer items={items} totalPrice={totalPrice} onClose={() => setIsCartOpen(false)} onUpdateQuantity={updateQuantity} onRemoveItem={removeItem} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true) }} />}
        {isCheckoutOpen && <CheckoutDrawer items={items} totalPrice={totalPrice} store={store} onClose={() => setIsCheckoutOpen(false)} onOrderComplete={() => { clearCart(); setIsCheckoutOpen(false) }} />}
      </div>
    </ThemeProvider>
  )
}
