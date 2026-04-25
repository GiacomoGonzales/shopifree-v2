/**
 * COMIC THEME - "COMIC BOOK / POP ART"
 *
 * Filosofia: Pagina de comic clasico — paneles, halftone, speech bubbles, ZAP/POW.
 * - Amarillo + rojo + azul + negro
 * - Halftone overlay sobre fondo cream
 * - Hero con burst de comic ("KAPOW!")
 * - Header como titulo de comic con borde grueso
 * - Tipografia: Bangers (display) + Comic Neue (body)
 * Ideal para: jugueteria, coleccionables, comics, merchandise infantil/jovenes.
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

const comicTheme: ThemeConfig = {
  colors: {
    background: '#FFF6D9',
    surface: '#FFFFFF',
    surfaceHover: '#FEFAE6',
    text: '#0F0F0F',
    textMuted: '#4A4A4A',
    textInverted: '#FFFFFF',
    primary: '#E63946',
    primaryHover: '#D62828',
    accent: '#1D4ED8',
    border: '#0F0F0F',
    badge: '#FFE600',
    badgeText: '#0F0F0F',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Bangers', 'Impact', sans-serif",
    body: "'Comic Neue', 'Comic Sans MS', system-ui, sans-serif",
  },
  shadows: {
    sm: '3px 3px 0 0 #0F0F0F',
    md: '5px 5px 0 0 #0F0F0F',
    lg: '8px 8px 0 0 #0F0F0F',
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

export default function ComicTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
    <ThemeProvider theme={comicTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#FFF6D9',
          backgroundImage: `radial-gradient(circle, rgba(15,15,15,0.08) 1px, transparent 1.5px)`,
          backgroundSize: '14px 14px',
          fontFamily: "'Comic Neue', system-ui, sans-serif",
          color: '#0F0F0F',
        }}
      >
        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-all"
          style={{
            backgroundColor: scrolled ? 'rgba(255,246,217,0.94)' : '#FFF6D9',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '4px solid #0F0F0F',
            boxShadow: scrolled ? '0 4px 0 0 #0F0F0F' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-10 w-auto object-contain" />}
              {showName && (
                <span
                  className="text-2xl md:text-3xl tracking-wider"
                  style={{ fontFamily: "'Bangers', sans-serif", color: '#E63946', WebkitTextStroke: '1.5px #0F0F0F', textShadow: '3px 3px 0 #0F0F0F' }}
                >
                  {store.name.toUpperCase()}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{
                fontFamily: "'Bangers', sans-serif",
                backgroundColor: '#FFE600',
                color: '#0F0F0F',
                border: '3px solid #0F0F0F',
                boxShadow: '4px 4px 0 0 #0F0F0F',
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
              }}
            >
              CART · {totalItems}
            </button>
          </div>
        </header>

        {/* Hero panel */}
        <section className="relative py-10 md:py-16">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div
              className="relative bg-white p-6 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10"
              style={{
                border: '4px solid #0F0F0F',
                boxShadow: '10px 10px 0 0 #0F0F0F',
              }}
            >
              {/* Burst badge */}
              <div
                className="absolute -top-6 -right-6 md:-top-10 md:-right-10 z-10 flex items-center justify-center text-center"
                style={{
                  width: '120px',
                  height: '120px',
                  background: '#FFE600',
                  color: '#0F0F0F',
                  fontFamily: "'Bangers', sans-serif",
                  fontSize: '1.5rem',
                  letterSpacing: '0.05em',
                  border: '4px solid #0F0F0F',
                  clipPath: 'polygon(50% 0%, 60% 18%, 80% 5%, 75% 25%, 95% 22%, 80% 40%, 100% 50%, 80% 60%, 95% 78%, 75% 75%, 80% 95%, 60% 82%, 50% 100%, 40% 82%, 20% 95%, 25% 75%, 5% 78%, 20% 60%, 0% 50%, 20% 40%, 5% 22%, 25% 25%, 20% 5%, 40% 18%)',
                  transform: 'rotate(-12deg)',
                }}
              >
                NEW!
              </div>

              <div className="flex flex-col justify-center order-2 md:order-1">
                <p className="text-sm md:text-base uppercase tracking-widest mb-3" style={{ fontFamily: "'Bangers', sans-serif", color: '#1D4ED8', letterSpacing: '0.2em' }}>
                  {store.language === 'en' ? '· ISSUE 01 ·' : '· EDICION 01 ·'}
                </p>
                <h1
                  className="text-5xl md:text-7xl leading-[0.95] tracking-wide"
                  style={{
                    fontFamily: "'Bangers', sans-serif",
                    color: '#0F0F0F',
                    textShadow: '5px 5px 0 #FFE600',
                  }}
                >
                  {store.name.toUpperCase()}
                </h1>
                {store.about?.slogan && (
                  <div
                    className="mt-6 inline-block self-start relative px-5 py-3 max-w-md"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '3px solid #0F0F0F',
                      borderRadius: '24px 24px 24px 0',
                      boxShadow: '4px 4px 0 0 #0F0F0F',
                    }}
                  >
                    <p className="text-base md:text-lg" style={{ color: '#0F0F0F' }}>
                      {store.about.slogan}
                    </p>
                  </div>
                )}
              </div>

              <div className="order-1 md:order-2">
                {(store.heroImage || store.heroImageMobile) ? (
                  <div className="aspect-square overflow-hidden" style={{ border: '3px solid #0F0F0F' }}>
                    <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="aspect-square flex items-center justify-center"
                    style={{
                      background: 'repeating-linear-gradient(45deg, #1D4ED8 0px, #1D4ED8 12px, #FFE600 12px, #FFE600 24px)',
                      border: '3px solid #0F0F0F',
                    }}
                  >
                    <span
                      className="text-6xl md:text-8xl"
                      style={{
                        fontFamily: "'Bangers', sans-serif",
                        color: '#FFFFFF',
                        WebkitTextStroke: '3px #0F0F0F',
                      }}
                    >
                      POW!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-2 flex items-center gap-3">
          <span
            className="px-3 py-1 text-xl tracking-wider inline-block"
            style={{
              fontFamily: "'Bangers', sans-serif",
              backgroundColor: '#E63946',
              color: '#FFFFFF',
              border: '3px solid #0F0F0F',
              boxShadow: '3px 3px 0 0 #0F0F0F',
              transform: 'rotate(-2deg)',
            }}
          >
            {store.language === 'en' ? 'CHAPTER 1' : 'CAPITULO 1'}
          </span>
          <div className="h-1 flex-1 bg-[#0F0F0F]" />
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
