/**
 * WATERCOLOR THEME - "ACUARELA / TINTA"
 *
 * Filosofia: Pintura en acuarela y tinta sobre papel suave. Manchas de color
 * que se mezclan, salpicaduras y trazos finos. Aire delicado, romantico, hecho a mano.
 * - Crema con manchas de acuarela rosa/melocoton/azul
 * - Tipografia: Cormorant Garamond italica + Inter ligero
 * - SVG ink blots y brush strokes en hero
 * - Sin bordes duros, todo difuminado
 * Ideal para: bodas, eventos, florerias, cosmetica artesanal, regaleria, perfumeria.
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

const watercolorTheme: ThemeConfig = {
  colors: {
    background: '#FCFAF5',
    surface: '#FFFFFF',
    surfaceHover: '#FAF6EE',
    text: '#3D2F2A',
    textMuted: '#9A877F',
    textInverted: '#FCFAF5',
    primary: '#C97A8E',
    primaryHover: '#B96B7E',
    accent: '#7DA8B2',
    border: 'rgba(201,122,142,0.30)',
    badge: '#C97A8E',
    badgeText: '#FFFFFF',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1.5rem',
    xl: '2rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Cormorant Garamond', 'Times New Roman', serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 8px rgba(61,47,42,0.05)',
    md: '0 6px 18px rgba(61,47,42,0.07)',
    lg: '0 14px 40px rgba(61,47,42,0.10)',
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

// SVG watercolor stain — using turbulence + displaced soft circles
function WatercolorBlob({ color, className, style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 400 400" fill="none">
      <defs>
        <filter id={`wc-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence baseFrequency="0.025" numOctaves="3" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="40" />
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g filter={`url(#wc-${color.replace('#', '')})`}>
        <circle cx="200" cy="200" r="160" fill={color} opacity="0.45" />
        <circle cx="220" cy="180" r="120" fill={color} opacity="0.55" />
        <circle cx="180" cy="220" r="140" fill={color} opacity="0.40" />
      </g>
    </svg>
  )
}

export default function WatercolorTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
    <ThemeProvider theme={watercolorTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#FCFAF5',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.7' /%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0 0.40 0 0 0 0.05 0' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#3D2F2A',
        }}
      >
        {/* Background watercolor stains — contained in their own absolute layer
            with overflow-hidden so the off-screen halves are clipped without
            having to put `overflow-hidden` on the root wrapper (which would
            break the sticky header). */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <WatercolorBlob color="#F4C7D0" className="absolute -top-20 -left-32 w-[600px] h-[600px] opacity-50" />
          <WatercolorBlob color="#C8DDE2" className="absolute top-[20%] -right-40 w-[600px] h-[600px] opacity-40" />
          <WatercolorBlob color="#F2D8B8" className="absolute top-[60%] -left-20 w-[500px] h-[500px] opacity-35" />
        </div>

        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors relative"
          style={{
            backgroundColor: scrolled ? 'rgba(252,250,245,0.85)' : 'transparent',
            backdropFilter: scrolled ? 'blur(12px)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && (
                <h1
                  className="text-2xl md:text-3xl italic tracking-wide"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: '#3D2F2A' }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-4 py-2 transition-all hover:opacity-90"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '0.95rem',
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #C97A8E 0%, #B96B7E 100%)',
                borderRadius: '999px',
                boxShadow: '0 4px 14px rgba(201,122,142,0.35)',
              }}
            >
              {(store.language === 'en' ? 'Bag' : 'Bolsa')} · {totalItems}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 md:px-6 text-center relative">
            <p className="text-xs md:text-sm tracking-[0.3em] uppercase mb-6" style={{ color: '#7DA8B2' }}>
              {store.language === 'en' ? '~ painted by hand ~' : '~ pintado a mano ~'}
            </p>
            <h2
              className="text-6xl md:text-8xl lg:text-9xl italic leading-[1.05]"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: '#3D2F2A', fontWeight: 500 }}
            >
              {store.name}
            </h2>

            {/* Underline brush stroke */}
            <svg className="mx-auto mt-2 -mb-2" width="220" height="14" viewBox="0 0 220 14" fill="none">
              <path d="M 4 8 Q 60 4 110 7 T 216 6" stroke="#C97A8E" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
              <path d="M 8 11 Q 70 9 120 11 T 210 11" stroke="#C97A8E" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
            </svg>

            {store.about?.slogan && (
              <p className="mt-6 text-base md:text-xl italic max-w-xl mx-auto leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif", color: '#9A877F' }}>
                {store.about.slogan}
              </p>
            )}
          </div>

          {(store.heroImage || store.heroImageMobile) && (
            <div className="max-w-4xl mx-auto px-4 md:px-6 mt-16 relative">
              <div
                className="aspect-[16/8] overflow-hidden mx-auto"
                style={{
                  borderRadius: '50% 30% 40% 60% / 40% 50% 50% 60%',
                  boxShadow: '0 20px 60px rgba(61,47,42,0.15)',
                }}
              >
                <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </section>

        <TrustBar />
        <FlashSaleBar />

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2 text-center relative">
          <p className="text-xs tracking-[0.3em] uppercase italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: '#C97A8E' }}>
            ~ {store.language === 'en' ? 'the collection' : 'la coleccion'} ~
          </p>
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-16 md:pb-24 relative">
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
