/**
 * BAUHAUS THEME - "GEOMETRIA PRIMARIA"
 *
 * Filosofia: Bauhaus / De Stijl. Geometria pura: circulo + cuadrado + triangulo,
 * en colores primarios rojo/amarillo/azul + negro y blanco. Mucho aire.
 * - Blanco puro de fondo, bloques solidos de color
 * - Tipografia: Inter Tight bold (display) + Inter (body)
 * - Hero como composicion mondrianesca
 * - Sin sombras, sin gradientes — solo planos solidos
 * Ideal para: diseno, mobiliario contemporaneo, accesorios geometricos, objeto de autor.
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

const bauhausTheme: ThemeConfig = {
  colors: {
    background: '#FFFFFF',
    surface: '#FAFAF8',
    surfaceHover: '#F2F2EE',
    text: '#0E0E0E',
    textMuted: '#5A5A56',
    textInverted: '#FFFFFF',
    primary: '#0E0E0E',
    primaryHover: '#1A1A1A',
    accent: '#E63E3E',
    border: '#0E0E0E',
    badge: '#FFD500',
    badgeText: '#0E0E0E',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'Inter Tight', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
  },
  effects: {
    cardHover: 'scale-[1.01]',
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

export default function BauhausTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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

  const RED = '#E63E3E'
  const YELLOW = '#FFD500'
  const BLUE = '#1A4DCC'

  return (
    <ThemeProvider theme={bauhausTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF', fontFamily: "'Inter', system-ui, sans-serif", color: '#0E0E0E' }}>
        <AnnouncementBar />

        {/* Top number strip */}
        <div className="border-b-2 border-black">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between text-[10px] tracking-widest uppercase font-bold">
            <span>01 / {(products.length || 1).toString().padStart(2, '0')}</span>
            <span className="hidden md:inline">{store.language === 'en' ? 'FORM FOLLOWS FUNCTION' : 'LA FORMA SIGUE A LA FUNCION'}</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(255,255,255,0.95)' : '#FFFFFF',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '2px solid #0E0E0E',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-9 w-auto object-contain" />}
              {showName && (
                <h1
                  className="text-2xl md:text-3xl tracking-tight uppercase"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, color: '#0E0E0E', letterSpacing: '-0.02em' }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-3 py-2 text-sm uppercase tracking-wider transition-all hover:bg-black hover:text-white"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontWeight: 700,
                border: '2px solid #0E0E0E',
                color: '#0E0E0E',
              }}
            >
              {(store.language === 'en' ? 'Bag' : 'Bolsa')} ({totalItems})
            </button>
          </div>
        </header>

        {/* Hero — geometric composition */}
        <section className="relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
            {/* Mondrian-like grid */}
            <div className="grid grid-cols-12 grid-rows-6 gap-3 md:gap-4 h-[460px] md:h-[560px]">
              {/* Big red block (top-left) */}
              <div
                className="col-span-7 row-span-3 relative flex items-end p-6 md:p-10"
                style={{ backgroundColor: RED }}
              >
                <div>
                  <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase font-bold mb-3 text-white opacity-80">
                    {store.language === 'en' ? 'Composition' : 'Composicion'} N°1
                  </p>
                  <h2
                    className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] uppercase tracking-tight text-white"
                    style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 900, letterSpacing: '-0.03em' }}
                  >
                    {store.name}
                  </h2>
                </div>
                {/* Triangle */}
                <svg className="absolute top-4 right-4 w-12 h-12 md:w-16 md:h-16" viewBox="0 0 50 50">
                  <polygon points="25,4 46,46 4,46" fill="#0E0E0E" />
                </svg>
              </div>

              {/* Yellow circle block (top-right) */}
              <div
                className="col-span-5 row-span-2 relative flex items-center justify-center"
                style={{ backgroundColor: YELLOW }}
              >
                <div className="w-2/3 aspect-square rounded-full" style={{ backgroundColor: '#0E0E0E' }} />
              </div>

              {/* Black slogan block (right middle) */}
              <div
                className="col-span-5 row-span-2 p-5 md:p-7 flex items-center"
                style={{ backgroundColor: '#0E0E0E' }}
              >
                <p
                  className="text-sm md:text-lg leading-tight uppercase text-white"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, letterSpacing: '-0.01em' }}
                >
                  {store.about?.slogan || (store.language === 'en' ? 'Less, but better.' : 'Menos, pero mejor.')}
                </p>
              </div>

              {/* Hero image (or blue fallback) */}
              <div
                className="col-span-7 row-span-3 relative overflow-hidden"
                style={{ backgroundColor: BLUE }}
              >
                {(store.heroImage || store.heroImageMobile) ? (
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <>
                    {/* Geometric composition fallback */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 400" preserveAspectRatio="none">
                      <rect x="40" y="60" width="180" height="180" fill="#FFD500" />
                      <circle cx="380" cy="220" r="100" fill="#FFFFFF" />
                      <polygon points="500,60 580,200 420,200" fill="#0E0E0E" />
                      <line x1="0" y1="320" x2="600" y2="320" stroke="#FFFFFF" strokeWidth="4" />
                    </svg>
                  </>
                )}
              </div>

              {/* Bottom small color blocks for texture */}
              <div className="col-span-2 row-span-1" style={{ backgroundColor: '#FFD500' }} />
              <div className="col-span-2 row-span-1" style={{ backgroundColor: '#0E0E0E' }} />
              <div className="col-span-1 row-span-1" style={{ backgroundColor: RED }} />
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section header */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-2 flex items-center gap-4">
          <h3
            className="text-2xl md:text-3xl uppercase tracking-tight"
            style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            {store.language === 'en' ? 'Catalogue' : 'Catalogo'}
            <span className="ml-2 inline-block w-3 h-3 rounded-full align-middle" style={{ backgroundColor: RED }} />
          </h3>
          <div className="h-1 flex-1 bg-black" />
          <span className="text-xs uppercase tracking-widest font-bold">{filteredProducts.length}</span>
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
