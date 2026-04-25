/**
 * CARTOGRAPHY THEME - "MAPA ANTIGUO"
 *
 * Filosofia: Mapa cartografico antiguo de explorador / atlas vintage.
 * - Papel papiro / sepia con leve textura
 * - Rosa de los vientos en hero
 * - Lineas de latitud/longitud sutiles cruzando el fondo
 * - Tipografia: IM Fell English (display irregular antiguo) + Lora (body)
 * - Sello de cera y "x marks the spot"
 * Ideal para: marcas de viaje, gourmet de exportacion, libros, bebidas espirituosas, expediciones.
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

const cartographyTheme: ThemeConfig = {
  colors: {
    background: '#E8DBB8',
    surface: '#F2E7C9',
    surfaceHover: '#EDE0BE',
    text: '#2A1F0F',
    textMuted: '#6B5638',
    textInverted: '#F2E7C9',
    primary: '#5C3A1E',
    primaryHover: '#6E4624',
    accent: '#9B2D2D',
    border: '#A88B5A',
    badge: '#5C3A1E',
    badgeText: '#F2E7C9',
  },
  radius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'IM Fell English', 'Times New Roman', serif",
    body: "'Lora', Georgia, serif",
  },
  shadows: {
    sm: '0 1px 0 rgba(42,31,15,0.10)',
    md: '0 4px 12px rgba(42,31,15,0.14)',
    lg: '0 10px 30px rgba(42,31,15,0.18)',
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

function CompassRose({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="92" stroke="#5C3A1E" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="100" cy="100" r="78" stroke="#5C3A1E" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="50" stroke="#5C3A1E" strokeWidth="1" />

      {/* Cardinal points (large) */}
      <polygon points="100,10 108,100 100,90 92,100" fill="#5C3A1E" />
      <polygon points="100,190 108,100 100,110 92,100" fill="#9B2D2D" />
      <polygon points="10,100 100,92 90,100 100,108" fill="#5C3A1E" />
      <polygon points="190,100 100,92 110,100 100,108" fill="#5C3A1E" />

      {/* Intercardinal points (smaller) */}
      <polygon points="35,35 100,98 102,102 98,98" fill="#5C3A1E" opacity="0.7" />
      <polygon points="165,35 100,98 102,98 102,102" fill="#5C3A1E" opacity="0.7" />
      <polygon points="35,165 100,102 98,102 98,98" fill="#5C3A1E" opacity="0.7" />
      <polygon points="165,165 100,102 102,102 102,98" fill="#5C3A1E" opacity="0.7" />

      {/* Central decoration */}
      <circle cx="100" cy="100" r="6" fill="#5C3A1E" />
      <circle cx="100" cy="100" r="2.5" fill="#F2E7C9" />

      {/* Letters */}
      <text x="100" y="6" textAnchor="middle" fontFamily="'IM Fell English', serif" fontSize="14" fill="#2A1F0F" fontWeight="700">N</text>
      <text x="100" y="200" textAnchor="middle" fontFamily="'IM Fell English', serif" fontSize="14" fill="#2A1F0F" fontWeight="700">S</text>
      <text x="6" y="105" textAnchor="middle" fontFamily="'IM Fell English', serif" fontSize="14" fill="#2A1F0F" fontWeight="700">W</text>
      <text x="194" y="105" textAnchor="middle" fontFamily="'IM Fell English', serif" fontSize="14" fill="#2A1F0F" fontWeight="700">E</text>
    </svg>
  )
}

export default function CartographyTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
    <ThemeProvider theme={cartographyTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#E8DBB8',
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' /%3E%3CfeColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.27 0 0 0 0 0.10 0 0 0 0.13 0' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E"),
            linear-gradient(rgba(168,139,90,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,139,90,0.10) 1px, transparent 1px)
          `,
          backgroundSize: 'auto, 60px 60px, 60px 60px',
          fontFamily: "'Lora', Georgia, serif",
          color: '#2A1F0F',
        }}
      >
        <AnnouncementBar />

        {/* Top strip */}
        <div className="border-b" style={{ borderColor: '#A88B5A' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between text-[10px] tracking-[0.25em] uppercase" style={{ color: '#6B5638' }}>
            <span>{store.language === 'en' ? 'CHART OF' : 'CARTA DE'}</span>
            <span className="hidden md:inline italic" style={{ fontFamily: "'IM Fell English', serif" }}>
              {store.language === 'en' ? 'a curious selection of wares' : 'una curiosa coleccion de mercaderias'}
            </span>
            <span>LAT. {(Math.random() * 60).toFixed(2)}°</span>
          </div>
        </div>

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(232,219,184,0.94)' : '#E8DBB8',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '2px solid #A88B5A',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-10 w-auto object-contain" style={{ filter: 'sepia(0.4)' }} />}
              {showName && (
                <h1
                  className="text-2xl md:text-3xl tracking-wide italic"
                  style={{ fontFamily: "'IM Fell English', serif", color: '#2A1F0F' }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-4 py-2 transition-all"
              style={{
                fontFamily: "'IM Fell English', serif",
                fontSize: '0.95rem',
                fontStyle: 'italic',
                backgroundColor: '#5C3A1E',
                color: '#F2E7C9',
                border: '1px solid #2A1F0F',
                boxShadow: '2px 2px 0 0 #2A1F0F',
              }}
            >
              <span>{store.language === 'en' ? 'Provisions' : 'Provisiones'}</span>
              <span>·</span>
              <span>{totalItems}</span>
            </button>
          </div>
        </header>

        {/* Hero — chart with compass */}
        <section className="relative py-12 md:py-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div
              className="relative p-6 md:p-12"
              style={{
                backgroundColor: 'rgba(242,231,201,0.65)',
                border: '1px solid #A88B5A',
                boxShadow: '0 6px 20px rgba(42,31,15,0.16)',
              }}
            >
              {/* Inner decorative border */}
              <div className="absolute inset-3 md:inset-5 pointer-events-none" style={{ border: '1px dashed #A88B5A', opacity: 0.7 }} />

              <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
                <div className="md:col-span-7">
                  <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#9B2D2D' }}>
                    {store.language === 'en' ? '✦ Chart No. I ✦' : '✦ Carta No. I ✦'}
                  </p>
                  <h2
                    className="text-5xl md:text-7xl leading-[1.05] italic"
                    style={{ fontFamily: "'IM Fell English', serif", color: '#2A1F0F' }}
                  >
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="mt-5 text-base md:text-lg italic" style={{ fontFamily: "'IM Fell English', serif", color: '#5C3A1E' }}>
                      &mdash; {store.about.slogan}
                    </p>
                  )}
                  {/* Wax seal */}
                  <div className="mt-8 inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full" style={{
                    background: 'radial-gradient(circle at 35% 30%, #C84141 0%, #9B2D2D 50%, #6B1A1A 100%)',
                    boxShadow: '0 4px 8px rgba(42,31,15,0.3), inset 0 -3px 6px rgba(0,0,0,0.3)',
                    transform: 'rotate(-8deg)',
                  }}>
                    <span style={{ fontFamily: "'IM Fell English', serif", color: '#F2E7C9', fontSize: '1.5rem', fontStyle: 'italic', textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}>
                      {store.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-5 flex justify-center">
                  {(store.heroImage || store.heroImageMobile) ? (
                    <div className="relative">
                      <div className="aspect-square w-full max-w-sm overflow-hidden rounded-full" style={{ border: '4px double #5C3A1E', filter: 'sepia(0.3) contrast(1.05)', boxShadow: '0 6px 20px rgba(42,31,15,0.3)' }}>
                        <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                      </div>
                      {/* X marks the spot */}
                      <span className="absolute top-4 right-6 text-3xl" style={{ fontFamily: "'IM Fell English', serif", color: '#9B2D2D', fontWeight: 700, transform: 'rotate(15deg)', display: 'inline-block' }}>×</span>
                    </div>
                  ) : (
                    <CompassRose size={240} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section header */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2">
          <div className="flex items-center justify-center gap-4">
            <span className="hidden md:block flex-1 h-px" style={{ backgroundColor: '#A88B5A' }} />
            <span className="text-base md:text-lg italic px-3" style={{ fontFamily: "'IM Fell English', serif", color: '#5C3A1E' }}>
              ✦ {store.language === 'en' ? 'The Manifest of Wares' : 'Manifiesto de Mercaderias'} ✦
            </span>
            <span className="hidden md:block flex-1 h-px" style={{ backgroundColor: '#A88B5A' }} />
          </div>
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
