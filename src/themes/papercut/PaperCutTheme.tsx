/**
 * PAPER CUT THEME - "PAPEL TROQUELADO"
 *
 * Filosofia: Capas de papel recortado como ilustracion infantil (Eric Carle / Ghibli).
 * - Background con paper-cut layers (montanas, sol, hojas) en SVG
 * - Sombras suaves entre capas
 * - Paleta: crema + terracota + sage + sun-yellow
 * - Tipografia: Quicksand (curvas suaves) + Patrick Hand (display)
 * - Botones con sombra "lifted paper"
 * Ideal para: jugueteria, ropa infantil, eco-friendly, papeleria, libros ilustrados.
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

const paperCutTheme: ThemeConfig = {
  colors: {
    background: '#FFF6E5',
    surface: '#FFFDF7',
    surfaceHover: '#FFF8EC',
    text: '#2A2419',
    textMuted: '#7A6E5A',
    textInverted: '#FFFDF7',
    primary: '#E07856',
    primaryHover: '#D26643',
    accent: '#85A572',
    border: '#F0E2C0',
    badge: '#FFC857',
    badgeText: '#2A2419',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1.25rem',
    xl: '2rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Patrick Hand', 'Comic Sans MS', cursive",
    body: "'Quicksand', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 0 rgba(42,36,25,0.08)',
    md: '0 6px 0 rgba(42,36,25,0.10)',
    lg: '0 12px 24px rgba(42,36,25,0.12)',
  },
  effects: {
    cardHover: 'translateY(-4px)',
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

export default function PaperCutTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
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
    <ThemeProvider theme={paperCutTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative" style={{ backgroundColor: '#FFF6E5', fontFamily: "'Quicksand', system-ui, sans-serif", color: '#2A2419' }}>

        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(255,246,229,0.94)' : '#FFF6E5',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            boxShadow: scrolled ? '0 2px 0 rgba(42,36,25,0.08)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && (
                <h1
                  className="text-2xl md:text-3xl"
                  style={{ fontFamily: "'Patrick Hand', cursive", color: '#2A2419' }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 transition-all hover:translate-y-[-2px]"
              style={{
                backgroundColor: '#E07856',
                color: '#FFFDF7',
                borderRadius: '999px',
                fontFamily: "'Patrick Hand', cursive",
                fontSize: '1.15rem',
                boxShadow: '0 4px 0 rgba(42,36,25,0.18)',
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>{totalItems}</span>
            </button>
          </div>
        </header>

        {/* Hero — paper cut landscape */}
        <section className="relative overflow-hidden">
          <div className="relative h-[440px] md:h-[560px] flex items-center justify-center">
            {/* Sky gradient */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #FFF6E5 0%, #FFE5BC 60%, #FBC988 100%)' }} />

            {/* Sun */}
            <div className="absolute top-12 right-10 md:right-24 w-28 h-28 md:w-36 md:h-36 rounded-full" style={{ backgroundColor: '#FFC857', boxShadow: '0 6px 0 rgba(42,36,25,0.10), 0 0 80px rgba(255,200,87,0.4)' }} />

            {/* Far hills */}
            <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 400" preserveAspectRatio="none" style={{ height: '70%' }}>
              <defs>
                <filter id="papercut-shadow-1" x="-5%" y="-5%" width="110%" height="120%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#2A2419" floodOpacity="0.10" />
                </filter>
                <filter id="papercut-shadow-2" x="-5%" y="-5%" width="110%" height="120%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#2A2419" floodOpacity="0.14" />
                </filter>
                <filter id="papercut-shadow-3" x="-5%" y="-5%" width="110%" height="120%">
                  <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#2A2419" floodOpacity="0.18" />
                </filter>
              </defs>
              {/* Layer 1: distant hills */}
              <path d="M 0 220 Q 220 140 480 200 T 960 180 T 1440 220 L 1440 400 L 0 400 Z" fill="#D9C28F" filter="url(#papercut-shadow-1)" />
              {/* Layer 2: middle hills */}
              <path d="M 0 280 Q 200 200 460 250 T 920 240 T 1440 280 L 1440 400 L 0 400 Z" fill="#85A572" filter="url(#papercut-shadow-2)" />
              {/* Layer 3: near hills */}
              <path d="M 0 320 Q 240 270 520 310 T 1000 320 T 1440 340 L 1440 400 L 0 400 Z" fill="#4F7752" filter="url(#papercut-shadow-3)" />
            </svg>

            {/* Floating leaves */}
            <svg className="absolute top-24 left-6 md:left-16 w-12 h-12 md:w-16 md:h-16 opacity-90" viewBox="0 0 50 50" fill="#85A572">
              <path d="M 25 8 Q 8 18 12 38 Q 32 38 38 18 Q 32 12 25 8 Z" />
              <line x1="25" y1="8" x2="25" y2="38" stroke="#4F7752" strokeWidth="1" />
            </svg>
            <svg className="absolute top-40 left-1/3 w-10 h-10 md:w-12 md:h-12 opacity-80" viewBox="0 0 50 50" fill="#E07856">
              <path d="M 25 5 Q 10 20 14 40 Q 35 38 40 20 Q 33 8 25 5 Z" />
            </svg>

            {/* Title text */}
            <div className="relative z-10 text-center max-w-4xl px-6">
              <h2
                className="text-5xl md:text-7xl lg:text-8xl leading-tight"
                style={{ fontFamily: "'Patrick Hand', cursive", color: '#2A2419', textShadow: '0 4px 0 rgba(255,253,247,0.6)' }}
              >
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-4 text-lg md:text-2xl" style={{ fontFamily: "'Patrick Hand', cursive", color: '#5A4A30' }}>
                  {store.about.slogan}
                </p>
              )}
            </div>
          </div>

          {/* Hero image floating card */}
          {(store.heroImage || store.heroImageMobile) && (
            <div className="max-w-4xl mx-auto px-4 -mt-16 md:-mt-24 relative z-10">
              <div
                className="overflow-hidden mx-auto"
                style={{
                  borderRadius: '24px',
                  boxShadow: '0 12px 0 rgba(42,36,25,0.12), 0 24px 48px rgba(42,36,25,0.18)',
                  border: '4px solid #FFFDF7',
                }}
              >
                <div className="aspect-[16/8]">
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="pt-12">
          <TrustBar />
          <FlashSaleBar />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2 text-center">
          <h3 className="text-3xl md:text-4xl" style={{ fontFamily: "'Patrick Hand', cursive", color: '#2A2419' }}>
            {store.language === 'en' ? '✿ our little garden ✿' : '✿ nuestro jardin ✿'}
          </h3>
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
