/**
 * TERMINAL THEME - "CLI / HACKER"
 *
 * Filosofia: Pantalla de terminal verde sobre negro estilo Unix de los 80s.
 * - Negro absoluto + verde fosforescente + ambar para warnings
 * - Tipografia 100% monospace (JetBrains Mono / Fira Code)
 * - Cursor parpadeante, prompt $, output tipo `uname -a`
 * - ASCII art en separadores, bordes con guiones/pipes
 * - Distinto de Arcade (que es pixel/CRT) — esto es text-mode puro
 * Ideal para: dev tools, ciber security, hacker culture, productos de codigo, gaming PC.
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

const terminalTheme: ThemeConfig = {
  colors: {
    background: '#020A04',
    surface: '#08160C',
    surfaceHover: '#0E2014',
    text: '#7CFFB2',
    textMuted: '#3A8A55',
    textInverted: '#020A04',
    primary: '#7CFFB2',
    primaryHover: '#A8FFCB',
    accent: '#FFB800',
    border: 'rgba(124,255,178,0.35)',
    badge: '#7CFFB2',
    badgeText: '#020A04',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'JetBrains Mono', 'Courier New', monospace",
    body: "'JetBrains Mono', 'Courier New', monospace",
  },
  shadows: {
    sm: '0 0 12px rgba(124,255,178,0.10)',
    md: '0 0 20px rgba(124,255,178,0.18)',
    lg: '0 0 40px rgba(124,255,178,0.20)',
  },
  effects: {
    cardHover: 'translateY(-2px)',
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

export default function TerminalTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName } = useHeaderLogo(store)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [cursorOn, setCursorOn] = useState(true)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)
    const cursorInterval = setInterval(() => setCursorOn(c => !c), 530)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(cursorInterval)
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

  const slug = (store.name || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const time = new Date().toLocaleTimeString(store.language === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <ThemeProvider theme={terminalTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes terminal-flicker { 0%,100% { opacity: 1 } 50% { opacity: 0.97 } }
        .terminal-scanlines::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(0deg, rgba(124,255,178,0.04) 0px, rgba(124,255,178,0.04) 1px, transparent 1px, transparent 3px);
          z-index: 9990;
        }
        .terminal-glow { text-shadow: 0 0 6px currentColor; }
      `}</style>

      <div
        className="min-h-screen relative terminal-scanlines"
        style={{
          backgroundColor: '#020A04',
          backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(124,255,178,0.06) 0%, transparent 60%)`,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#7CFFB2',
          animation: 'terminal-flicker 6s infinite',
        }}
      >
        <AnnouncementBar />

        {/* Top "uname" strip */}
        <div className="border-b" style={{ borderColor: 'rgba(124,255,178,0.20)' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between text-xs" style={{ color: '#3A8A55' }}>
            <span>$ uname -n {slug}.shopifree</span>
            <span className="hidden md:inline">PID 1 · {time}</span>
            <span>STATUS <span style={{ color: '#7CFFB2' }}>● ONLINE</span></span>
          </div>
        </div>

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(2,10,4,0.94)' : '#020A04',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '1px dashed rgba(124,255,178,0.35)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm md:text-base">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-8 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(124,255,178,0.4))' }} />}
              {showName && (
                <span className="terminal-glow" style={{ color: '#7CFFB2' }}>
                  <span style={{ color: '#3A8A55' }}>~/</span>{slug}
                  <span className="ml-1" style={{ color: '#FFB800' }}>$</span>
                  <span className={`ml-1 ${cursorOn ? 'opacity-100' : 'opacity-0'}`}>▊</span>
                </span>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="text-xs md:text-sm px-3 py-1.5 transition-all hover:bg-[#7CFFB2] hover:text-[#020A04]"
              style={{
                border: '1px solid #7CFFB2',
                color: '#7CFFB2',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ./cart --items={totalItems.toString().padStart(2, '0')}
            </button>
          </div>
        </header>

        {/* Hero — ascii / cli */}
        <section className="relative py-12 md:py-20">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            {/* Welcome box — using CSS borders instead of fixed-width ASCII so it
                scales with the viewport and doesn't push horizontal scroll. */}
            <div
              className="inline-block mb-6 px-3 py-1.5 max-w-full"
              style={{
                border: '1px dashed rgba(124,255,178,0.45)',
                color: '#3A8A55',
              }}
            >
              <span className="text-xs md:text-sm whitespace-nowrap overflow-hidden text-ellipsis block max-w-full">
                &gt; welcome {slug}@v1
              </span>
            </div>
            <p className="text-sm md:text-base mb-2" style={{ color: '#3A8A55' }}>
              <span style={{ color: '#FFB800' }}>$</span> cat /etc/motd
            </p>
            <h1
              className="text-4xl md:text-7xl tracking-tight terminal-glow leading-tight"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#7CFFB2' }}
            >
              {store.name}<span className={`${cursorOn ? 'opacity-100' : 'opacity-0'}`}>_</span>
            </h1>
            {store.about?.slogan && (
              <p className="mt-4 text-base md:text-lg leading-relaxed max-w-3xl" style={{ color: '#3A8A55' }}>
                <span style={{ color: '#7CFFB2' }}>// </span>
                {store.about.slogan}
              </p>
            )}

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { k: 'ITEMS', v: products.length.toString().padStart(3, '0') },
                { k: 'CATS', v: categories.length.toString().padStart(2, '0') },
                { k: 'LOC', v: store.location?.country || '--' },
                { k: 'BUILD', v: '1.0.0' },
              ].map(({ k, v }) => (
                <div
                  key={k}
                  className="px-3 py-2"
                  style={{ border: '1px solid rgba(124,255,178,0.35)' }}
                >
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: '#3A8A55' }}>{k}</p>
                  <p className="terminal-glow" style={{ color: '#FFB800' }}>{v}</p>
                </div>
              ))}
            </div>

            {(store.heroImage || store.heroImageMobile) && (
              <div className="mt-10 relative" style={{ border: '1px solid rgba(124,255,178,0.35)' }}>
                <div className="absolute -top-3 left-3 px-2 text-xs" style={{ backgroundColor: '#020A04', color: '#3A8A55' }}>
                  /img/hero.png
                </div>
                <div className="aspect-[16/8]" style={{ filter: 'hue-rotate(80deg) saturate(0.5) brightness(0.65) contrast(1.2)' }}>
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2">
          <p className="text-sm md:text-base" style={{ color: '#3A8A55' }}>
            <span style={{ color: '#FFB800' }}>$</span> ls -la /products/<span className={`${cursorOn ? 'opacity-100' : 'opacity-0'}`}>_</span>
          </p>
          <p className="text-xs mt-1" style={{ color: '#3A8A55' }}>
            total {filteredProducts.length}
          </p>
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 pb-16 md:pb-24">
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
