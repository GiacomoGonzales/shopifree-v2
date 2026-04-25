/**
 * ATELIER THEME - "GALERIA DE ARTE"
 *
 * Filosofia: Galeria/museo curado. Paredes color crema, mucho espacio negativo,
 * productos como obras enmarcadas con plaquita museografica abajo.
 * - Crema + carbon + acento dorado tenue
 * - Tipografia: Cormorant Garamond (display) + Inter (body)
 * - Header centrado tipo nombre de galeria
 * - Hero con numero de exhibicion y curaduria
 * - Lineas finas, espacio generoso
 * Ideal para: arte, joyeria de autor, escultura, perfumeria nicho, antiguedades.
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

const atelierTheme: ThemeConfig = {
  colors: {
    background: '#F5F1E8',
    surface: '#FFFFFF',
    surfaceHover: '#FAF7EE',
    text: '#1A1814',
    textMuted: '#6B6253',
    textInverted: '#F5F1E8',
    primary: '#1A1814',
    primaryHover: '#2A2620',
    accent: '#A48B58',
    border: 'rgba(26,24,20,0.18)',
    badge: '#1A1814',
    badgeText: '#F5F1E8',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'Cormorant Garamond', 'Times New Roman', serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 0 rgba(26,24,20,0.05)',
    md: '0 2px 0 rgba(26,24,20,0.08)',
    lg: '0 8px 24px rgba(26,24,20,0.10)',
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

export default function AtelierTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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

  const year = new Date().getFullYear()

  return (
    <ThemeProvider theme={atelierTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: '#F5F1E8', fontFamily: "'Inter', system-ui, sans-serif", color: '#1A1814' }}>

        <AnnouncementBar />

        {/* Top metadata */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-[10px] tracking-[0.3em] uppercase" style={{ color: '#6B6253' }}>
            <span>{store.language === 'en' ? 'EST.' : 'EST.'} {year}</span>
            <span>{store.language === 'en' ? 'BY APPOINTMENT' : 'CON CITA'}</span>
            <span>{store.location?.country || '—'}</span>
          </div>
        </div>

        {/* Header — gallery name. Mobile keeps the standard "logo+name | cart"
            split; desktop preserves the curatorial centered layout. */}
        <header className={`sticky top-0 z-50 transition-colors ${scrolled ? 'bg-[#F5F1E8]/95 backdrop-blur' : 'bg-[#F5F1E8]'}`} style={{ borderTop: '1px solid rgba(26,24,20,0.18)', borderBottom: '1px solid rgba(26,24,20,0.18)' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {/* Mobile */}
            <div className="md:hidden h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
                {showName && (
                  <h1
                    className="text-xl tracking-wide"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1A1814' }}
                  >
                    {store.name}
                  </h1>
                )}
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="text-xs tracking-[0.25em] uppercase hover:underline underline-offset-4"
                style={{ color: '#1A1814' }}
              >
                {(store.language === 'en' ? 'Bag' : 'Bolsa')} ({totalItems})
              </button>
            </div>

            {/* Desktop */}
            <div className="hidden md:grid grid-cols-3 items-center h-20">
              <button
                onClick={() => setIsCartOpen(true)}
                className="text-sm tracking-[0.25em] uppercase justify-self-start hover:underline underline-offset-4"
                style={{ color: '#1A1814' }}
              >
                {(store.language === 'en' ? 'Bag' : 'Bolsa')} ({totalItems})
              </button>

              <div className="flex items-center justify-center gap-3">
                {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
                {showName && (
                  <h1
                    className="text-3xl tracking-wide"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1A1814' }}
                  >
                    {store.name}
                  </h1>
                )}
              </div>

              <div className="justify-self-end">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs tracking-[0.25em] uppercase hover:underline underline-offset-4"
                    style={{ color: '#1A1814' }}
                  >
                    @{store.instagram.replace('@', '')}
                  </a>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero — exhibition card */}
        <section className="py-16 md:py-28 px-4 md:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase mb-6" style={{ color: '#A48B58' }}>
              {store.language === 'en' ? '— Current exhibition —' : '— Exhibicion actual —'}
            </p>
            <h2
              className="text-5xl md:text-7xl lg:text-8xl font-light leading-[1.05] italic"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1A1814' }}
            >
              {store.name}
            </h2>
            {store.about?.slogan && (
              <p className="mt-8 text-base md:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: '#6B6253' }}>
                {store.about.slogan}
              </p>
            )}
            <div className="mt-12 flex items-center justify-center gap-4 text-[10px] tracking-[0.3em] uppercase" style={{ color: '#6B6253' }}>
              <span>N°{(products.length || 0).toString().padStart(3, '0')}</span>
              <span className="w-12 h-px" style={{ backgroundColor: '#A48B58' }} />
              <span>{year}</span>
            </div>
          </div>

          {(store.heroImage || store.heroImageMobile) && (
            <div className="max-w-5xl mx-auto mt-16">
              <div className="aspect-[3/2] overflow-hidden" style={{ border: '1px solid rgba(26,24,20,0.18)' }}>
                <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-center mt-4 text-xs italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: '#6B6253' }}>
                {store.about?.slogan || store.name}, {year}
              </p>
            </div>
          )}
        </section>

        <TrustBar />
        <FlashSaleBar />

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2 text-center">
          <p className="text-[10px] tracking-[0.4em] uppercase" style={{ color: '#A48B58' }}>
            {store.language === 'en' ? '— The collection —' : '— La coleccion —'}
          </p>
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-16 md:pb-28">
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
