/**
 * ARCADE THEME - "RETRO ARCADE / 8-BIT"
 *
 * Filosofia: Cabina de arcade ochentera, pixel art, CRT scanlines, neon brillante.
 * - Tipografia pixel (Press Start 2P) para titulos y montos
 * - Fondo negro con scanlines y vignette CRT
 * - Cards con borde chunky tipo "level card", hover hace flicker
 * - Cart como contador de score "00012"
 * - Acentos magenta + cyan + amarillo
 * Ideal para: gaming, merchandising, retro electronica, juguetes coleccionables.
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

const arcadeTheme: ThemeConfig = {
  colors: {
    background: '#0A0014',
    surface: '#170028',
    surfaceHover: '#22003D',
    text: '#F4F4F8',
    textMuted: '#9C8FB8',
    textInverted: '#0A0014',
    primary: '#FF00C8',
    primaryHover: '#FF33D6',
    accent: '#00FFE5',
    border: '#FF00C8',
    badge: '#FFE600',
    badgeText: '#0A0014',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'Press Start 2P', 'Courier New', monospace",
    body: "'VT323', 'Courier New', monospace",
  },
  shadows: {
    sm: '4px 4px 0 0 #FF00C8',
    md: '6px 6px 0 0 #00FFE5',
    lg: '0 0 40px rgba(255,0,200,0.4)',
  },
  effects: {
    cardHover: 'translate(-2px,-2px)',
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
  initialProduct?: Product | null
}

export default function ArcadeTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName } = useHeaderLogo(store)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)
    const blinkInterval = setInterval(() => setBlink(b => !b), 530)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(blinkInterval)
    }
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

  const score = String(totalItems).padStart(5, '0')

  return (
    <ThemeProvider theme={arcadeTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes arcade-flicker {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.96 }
        }
        @keyframes arcade-marquee {
          from { transform: translateX(0) }
          to { transform: translateX(-50%) }
        }
        .arcade-scanlines::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px);
          z-index: 9990;
        }
        .arcade-vignette::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
          z-index: 9991;
        }
        .arcade-glow {
          text-shadow: 0 0 8px currentColor, 0 0 16px currentColor;
        }
      `}</style>

      <div
        className="min-h-screen arcade-scanlines arcade-vignette relative"
        style={{
          backgroundColor: '#0A0014',
          backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(255,0,200,0.18), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,255,229,0.12), transparent 55%)`,
          fontFamily: "'VT323', monospace",
          color: '#F4F4F8',
          animation: 'arcade-flicker 4s infinite',
        }}
      >
        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(10,0,20,0.92)' : '#0A0014',
            borderBottom: '2px solid #FF00C8',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-9 w-auto object-contain" style={{ imageRendering: 'pixelated' }} />}
              {showName && (
                <span
                  className="arcade-glow text-xs sm:text-sm tracking-widest"
                  style={{ fontFamily: "'Press Start 2P', monospace", color: '#00FFE5' }}
                >
                  {store.name.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-[9px] tracking-widest" style={{ fontFamily: "'Press Start 2P', monospace", color: '#FFE600' }}>
                  SCORE
                </span>
                <span className="text-base tabular-nums tracking-widest arcade-glow" style={{ fontFamily: "'Press Start 2P', monospace", color: '#FFE600' }}>
                  {score}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="px-3 py-2 text-[10px] tracking-widest transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  backgroundColor: '#FF00C8',
                  color: '#0A0014',
                  boxShadow: '4px 4px 0 0 #00FFE5',
                  border: '2px solid #00FFE5',
                }}
              >
                P1 · {totalItems}
              </button>
            </div>
          </div>
        </header>

        {/* Marquee ticker */}
        <div className="overflow-hidden border-b-2 py-2" style={{ borderColor: '#00FFE5', backgroundColor: '#170028' }}>
          <div className="flex whitespace-nowrap" style={{ animation: 'arcade-marquee 30s linear infinite' }}>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 pr-8 text-sm tracking-widest" style={{ fontFamily: "'Press Start 2P', monospace", color: '#FFE600' }}>
                <span>★ INSERT COIN ★</span>
                <span style={{ color: '#FF00C8' }}>HIGH SCORE: {(products.length || 0).toString().padStart(4, '0')}</span>
                <span style={{ color: '#00FFE5' }}>NEW STAGE</span>
                <span>★ {store.name.toUpperCase()} ★</span>
                <span style={{ color: '#FF00C8' }}>READY?</span>
                <span style={{ color: '#00FFE5' }}>{(store.about?.slogan || 'PLAY ON').toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundColor: '#0A0014' }}>
          {(store.heroImage || store.heroImageMobile) && (
            <>
              <div className="md:hidden">
                <HeroImg src={store.heroImageMobile || store.heroImage} alt={store.name} className="w-full h-auto max-h-[400px] object-cover" />
              </div>
              <div className="hidden md:block aspect-[16/5]">
                <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(10,0,20,0.3) 0%, rgba(10,0,20,0.85) 100%)' }} />
            </>
          )}
          <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
            <p className="text-xs md:text-sm tracking-widest mb-6 arcade-glow" style={{ fontFamily: "'Press Start 2P', monospace", color: '#FF00C8' }}>
              {blink ? '▶ PRESS START' : '▷ PRESS START'}
            </p>
            <h1
              className="text-4xl md:text-6xl lg:text-7xl tracking-widest leading-tight arcade-glow"
              style={{ fontFamily: "'Press Start 2P', monospace", color: '#FFE600' }}
            >
              {store.name.toUpperCase()}
            </h1>
            {store.about?.slogan && (
              <p className="mt-8 text-2xl md:text-3xl tracking-wide" style={{ color: '#9C8FB8' }}>
                {`> ${store.about.slogan}_`}
              </p>
            )}
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Stage label */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-2 flex items-center gap-3">
          <span className="text-[10px] tracking-widest px-2 py-1" style={{ fontFamily: "'Press Start 2P', monospace", backgroundColor: '#FFE600', color: '#0A0014' }}>
            STAGE 01
          </span>
          <div className="h-px flex-1" style={{ backgroundImage: 'linear-gradient(90deg, #FF00C8 0%, transparent 100%)' }} />
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
