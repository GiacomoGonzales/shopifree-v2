/**
 * BOTANICAL THEME - "JARDIN BOTANICO"
 *
 * Filosofia: Lamina botanica vintage / herbario. Hojas y ramas dibujadas a mano,
 * verde salvia, crema, sello con caracter botanico latino.
 * - Sage green + cream + soft terracotta
 * - SVG hojas creciendo en esquinas (sin animar para no distraer)
 * - Tipografia: Lora (display serif) + Inter (body)
 * - Sello redondo "Selva·Verde·Naturalia" en hero
 * - Borde con dibujo botanico inferior
 * Ideal para: cosmetica natural, herboristeria, te, jardineria, productos artesanales saludables.
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

const botanicalTheme: ThemeConfig = {
  colors: {
    background: '#F2EBDA',
    surface: '#FBF7EC',
    surfaceHover: '#F6F0DD',
    text: '#2C3A2A',
    textMuted: '#6B7A5A',
    textInverted: '#FBF7EC',
    primary: '#5C7754',
    primaryHover: '#4A6244',
    accent: '#B8694A',
    border: '#D8CFB6',
    badge: '#5C7754',
    badgeText: '#FBF7EC',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Lora', 'Times New Roman', serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 2px rgba(44,58,42,0.06)',
    md: '0 4px 12px rgba(44,58,42,0.08)',
    lg: '0 10px 30px rgba(44,58,42,0.10)',
  },
  effects: {
    cardHover: 'translateY(-3px)',
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

// Hand-drawn leaf SVG decoration (used in corners of hero)
function LeafSprig({ className, style, mirror }: { className?: string; style?: React.CSSProperties; mirror?: boolean }) {
  return (
    <svg
      className={className}
      style={{ ...style, transform: `${style?.transform || ''} ${mirror ? 'scaleX(-1)' : ''}`.trim() }}
      viewBox="0 0 220 320"
      fill="none"
      stroke="#5C7754"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M 110 320 Q 110 200 80 100 T 60 10" />
      {/* Pairs of leaves along the stem */}
      <g fill="#7A9974" stroke="#5C7754">
        <path d="M 105 280 Q 75 270 50 285 Q 70 295 105 290 Z" />
        <path d="M 115 280 Q 145 270 170 285 Q 150 295 115 290 Z" />
        <path d="M 100 230 Q 65 220 35 235 Q 60 250 100 240 Z" />
        <path d="M 110 230 Q 145 220 175 235 Q 150 250 110 240 Z" />
        <path d="M 92 175 Q 60 165 35 180 Q 60 190 92 185 Z" />
        <path d="M 102 175 Q 135 165 160 180 Q 135 190 102 185 Z" />
        <path d="M 80 120 Q 50 110 30 125 Q 55 135 80 130 Z" />
        <path d="M 90 120 Q 120 110 145 125 Q 120 135 90 130 Z" />
        <path d="M 68 70 Q 45 60 28 75 Q 50 85 68 80 Z" />
        <path d="M 76 70 Q 100 60 120 75 Q 100 85 76 80 Z" />
      </g>
    </svg>
  )
}

export default function BotanicalTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
    <ThemeProvider theme={botanicalTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#F2EBDA',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.7' /%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.5 0 0 0 0 0.3 0 0 0 0.07 0' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#2C3A2A',
        }}
      >
        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(242,235,218,0.95)' : '#F2EBDA',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '1px solid #D8CFB6',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-10 w-auto object-contain" />}
              {showName && (
                <h1
                  className="text-xl md:text-2xl tracking-wide italic"
                  style={{ fontFamily: "'Lora', serif", color: '#2C3A2A' }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-4 py-2 transition-all hover:opacity-90"
              style={{
                backgroundColor: '#5C7754',
                color: '#FBF7EC',
                borderRadius: '999px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>{totalItems > 0 ? totalItems : (store.language === 'en' ? 'Bag' : 'Bolsa')}</span>
            </button>
          </div>
        </header>

        {/* Hero — botanical plate */}
        <section className="relative py-12 md:py-20 overflow-hidden">
          {/* Side leaves */}
          <LeafSprig className="absolute -left-6 top-0 w-32 md:w-44 opacity-70 pointer-events-none" />
          <LeafSprig className="absolute -right-6 top-0 w-32 md:w-44 opacity-70 pointer-events-none" mirror />

          <div className="max-w-4xl mx-auto px-6 text-center relative">
            {/* Round seal */}
            <div
              className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 mb-6 mx-auto rounded-full"
              style={{
                border: '2px double #5C7754',
                color: '#5C7754',
                fontFamily: "'Lora', serif",
                fontStyle: 'italic',
                fontSize: '0.7rem',
                lineHeight: 1.1,
              }}
            >
              <span className="text-center px-2 leading-tight">
                EX <br />HORTO
              </span>
            </div>

            <h1
              className="text-5xl md:text-7xl leading-[1.05] italic"
              style={{ fontFamily: "'Lora', serif", color: '#2C3A2A' }}
            >
              {store.name}
            </h1>
            {store.about?.slogan && (
              <p className="mt-6 text-base md:text-lg max-w-xl mx-auto leading-relaxed" style={{ color: '#6B7A5A' }}>
                {store.about.slogan}
              </p>
            )}
            <div className="mt-8 inline-flex items-center gap-3 text-[10px] md:text-xs tracking-[0.3em] uppercase" style={{ color: '#B8694A' }}>
              <span className="w-8 h-px" style={{ backgroundColor: '#B8694A' }} />
              <span>{store.language === 'en' ? 'Naturae · Herbarium' : 'Naturae · Herbarium'}</span>
              <span className="w-8 h-px" style={{ backgroundColor: '#B8694A' }} />
            </div>
          </div>

          {(store.heroImage || store.heroImageMobile) && (
            <div className="max-w-5xl mx-auto px-6 mt-12">
              <div className="aspect-[3/2] overflow-hidden rounded-lg" style={{ border: '1px solid #D8CFB6' }}>
                <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </section>

        <TrustBar />
        <FlashSaleBar />

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-2 text-center">
          <p className="text-xs tracking-[0.3em] uppercase italic" style={{ fontFamily: "'Lora', serif", color: '#B8694A' }}>
            {store.language === 'en' ? '— Catalogus plantarum —' : '— Catalogus plantarum —'}
          </p>
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
