/**
 * BLUEPRINT THEME - "PLANO TECNICO"
 *
 * Filosofia: Plano de arquitecto/ingeniero. Lineas finas blancas sobre azul profundo,
 * cuadricula tecnica, cotas y dimensiones, tipografia monospace.
 * - Fondo azul cyan oscuro con grid SVG
 * - Toda la UI con outline blanco fino
 * - Tipografia mono (JetBrains Mono) y display tecnico (Space Grotesk)
 * - Decoracion de cross-hairs y rulers en hero
 * - Productos con etiquetas tipo "REF: A-001" "DIM: 30x30"
 * Ideal para: muebles, electronica, herramientas, productos de diseno, arquitectura.
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

const blueprintTheme: ThemeConfig = {
  colors: {
    background: '#0E2A47',
    surface: '#143358',
    surfaceHover: '#1A3D69',
    text: '#E8F2FF',
    textMuted: '#7FA4CC',
    textInverted: '#0E2A47',
    primary: '#FFFFFF',
    primaryHover: '#E8F2FF',
    accent: '#7DD3FC',
    border: 'rgba(255,255,255,0.4)',
    badge: '#7DD3FC',
    badgeText: '#0E2A47',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'JetBrains Mono', 'Courier New', monospace",
  },
  shadows: {
    sm: '0 0 0 1px rgba(255,255,255,0.2)',
    md: '0 0 0 1px rgba(255,255,255,0.3)',
    lg: '0 0 30px rgba(125,211,252,0.15)',
  },
  effects: {
    cardHover: 'scale-[1.02]',
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

export default function BlueprintTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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

  const sheetCode = `SHT-${(products.length || 1).toString().padStart(3, '0')}`
  const dateCode = new Date().toISOString().slice(0, 10)

  return (
    <ThemeProvider theme={blueprintTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#0E2A47',
          color: '#E8F2FF',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {/* Grid background */}
        <div
          className="fixed inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
          }}
        />

        {/* Cyan glow */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(125,211,252,0.10) 0%, transparent 60%)',
          }}
        />

        <AnnouncementBar />

        {/* Top metadata strip */}
        <div className="relative border-b" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between text-[10px] tracking-wider uppercase" style={{ color: '#7FA4CC' }}>
            <span>{`> ${sheetCode}`}</span>
            <span className="hidden sm:inline">{store.language === 'en' ? 'TECHNICAL CATALOG' : 'CATALOGO TECNICO'}</span>
            <span>{dateCode}</span>
          </div>
        </div>

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(14,42,71,0.92)' : '#0E2A47',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-9 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />}
              {showName && (
                <span
                  className="text-base md:text-lg font-medium tracking-wider"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#FFFFFF' }}
                >
                  {store.name}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-white hover:text-[#0E2A47]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                border: '1px solid rgba(255,255,255,0.6)',
                color: '#FFFFFF',
              }}
            >
              <span>{store.language === 'en' ? 'CART' : 'CESTA'}</span>
              <span style={{ color: '#7DD3FC' }}>[{totalItems.toString().padStart(2, '0')}]</span>
            </button>
          </div>
        </header>

        {/* Hero — technical drawing */}
        <section className="relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
            <div className="relative border" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
              {/* Corner brackets */}
              {[
                { top: '-1px', left: '-1px', borderTop: '2px solid #7DD3FC', borderLeft: '2px solid #7DD3FC' },
                { top: '-1px', right: '-1px', borderTop: '2px solid #7DD3FC', borderRight: '2px solid #7DD3FC' },
                { bottom: '-1px', left: '-1px', borderBottom: '2px solid #7DD3FC', borderLeft: '2px solid #7DD3FC' },
                { bottom: '-1px', right: '-1px', borderBottom: '2px solid #7DD3FC', borderRight: '2px solid #7DD3FC' },
              ].map((s, i) => (
                <div key={i} className="absolute w-4 h-4" style={s} />
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-6 md:p-12 flex flex-col justify-center" style={{ borderRight: '1px dashed rgba(255,255,255,0.2)' }}>
                  <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: '#7DD3FC' }}>
                    {store.language === 'en' ? '// MAIN VIEW' : '// VISTA PRINCIPAL'}
                  </p>
                  <h1
                    className="text-4xl md:text-6xl font-semibold leading-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#FFFFFF' }}
                  >
                    {store.name}
                  </h1>
                  {store.about?.slogan && (
                    <p className="mt-6 text-sm md:text-base leading-relaxed" style={{ color: '#7FA4CC' }}>
                      {store.about.slogan}
                    </p>
                  )}
                  <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] tracking-wider uppercase" style={{ color: '#7FA4CC' }}>
                    <div>
                      <p className="opacity-60">{store.language === 'en' ? 'ITEMS' : 'PIEZAS'}</p>
                      <p className="text-base mt-0.5" style={{ color: '#FFFFFF' }}>{products.length.toString().padStart(3, '0')}</p>
                    </div>
                    <div>
                      <p className="opacity-60">{store.language === 'en' ? 'SECTIONS' : 'SECCIONES'}</p>
                      <p className="text-base mt-0.5" style={{ color: '#FFFFFF' }}>{categories.length.toString().padStart(2, '0')}</p>
                    </div>
                    <div>
                      <p className="opacity-60">SCALE</p>
                      <p className="text-base mt-0.5" style={{ color: '#FFFFFF' }}>1 : 1</p>
                    </div>
                    <div>
                      <p className="opacity-60">REV</p>
                      <p className="text-base mt-0.5" style={{ color: '#FFFFFF' }}>A</p>
                    </div>
                  </div>
                </div>
                <div className="aspect-[4/3] md:aspect-auto md:min-h-[400px] relative overflow-hidden" style={{ background: 'rgba(20,51,88,0.5)' }}>
                  {(store.heroImage || store.heroImageMobile) ? (
                    <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" style={{ filter: 'saturate(0.65) brightness(0.85)' }} />
                  ) : (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" fill="none" stroke="#7DD3FC" strokeWidth="1">
                      <circle cx="200" cy="150" r="80" />
                      <circle cx="200" cy="150" r="50" />
                      <circle cx="200" cy="150" r="20" />
                      <line x1="0" y1="150" x2="400" y2="150" strokeDasharray="4 6" opacity="0.4" />
                      <line x1="200" y1="0" x2="200" y2="300" strokeDasharray="4 6" opacity="0.4" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section header */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-2 flex items-center gap-4">
          <span className="text-[10px] tracking-widest uppercase px-2 py-1" style={{ color: '#0E2A47', backgroundColor: '#7DD3FC' }}>
            {store.language === 'en' ? 'PARTS LIST' : 'INVENTARIO'}
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <span className="text-[10px] tracking-widest uppercase" style={{ color: '#7FA4CC' }}>
            {filteredProducts.length.toString().padStart(3, '0')} {store.language === 'en' ? 'UNITS' : 'UNIDADES'}
          </span>
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
