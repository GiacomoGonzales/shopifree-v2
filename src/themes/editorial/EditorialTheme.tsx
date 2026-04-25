/**
 * EDITORIAL THEME - "REVISTA DE MODA"
 *
 * Filosofia: Vogue, Harper's Bazaar — tipografia gigante serif, mucho espacio negativo,
 * blanco y negro con un acento rojo. Layout editorial con secciones tipo "ISSUE 01".
 * Ideal para: moda, fotografia, arte, perfumeria de autor, curaduria.
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

const editorialTheme: ThemeConfig = {
  colors: {
    background: '#FAFAF7',
    surface: '#FFFFFF',
    surfaceHover: '#F2F2EC',
    text: '#0A0A0A',
    textMuted: '#5C5C5C',
    textInverted: '#FAFAF7',
    primary: '#0A0A0A',
    primaryHover: '#1A1A1A',
    accent: '#C8102E',
    border: '#0A0A0A',
    badge: '#0A0A0A',
    badgeText: '#FAFAF7',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'Playfair Display', 'Times New Roman', serif",
    body: "'DM Sans', system-ui, sans-serif",
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
    productLayout: 'magazine',
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

export default function EditorialTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName } = useHeaderLogo(store, { squareStyle: 'rounded' })
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

  const issueDate = new Date().toLocaleDateString(store.language === 'en' ? 'en-US' : 'es-ES', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase()

  return (
    <ThemeProvider theme={editorialTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#0A0A0A' }}>

        <AnnouncementBar />

        {/* Editorial top strip — issue number + date */}
        <div className="hidden md:block border-y border-black/10">
          <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between text-[10px] tracking-[0.25em] uppercase" style={{ color: '#5C5C5C' }}>
            <span>Issue Nº 01</span>
            <span>{issueDate}</span>
            <span>{store.location?.country || '—'}</span>
          </div>
        </div>

        {/* Header — masthead */}
        <header className={`sticky top-0 z-50 transition-colors ${scrolled ? 'bg-[#FAFAF7]/95 backdrop-blur border-b border-black/10' : 'bg-[#FAFAF7]'}`}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-7">
            <div className="grid grid-cols-3 items-center gap-4">
              <div className="text-[10px] tracking-[0.3em] uppercase hidden md:block" style={{ color: '#5C5C5C' }}>
                {store.about?.slogan || (store.language === 'en' ? 'A curated edit' : 'Edicion curada')}
              </div>
              <div className="col-span-3 md:col-span-1 flex items-center justify-start md:justify-center gap-3">
                {headerLogo && <img src={headerLogo} alt={store.name} className="h-10 w-auto object-contain" />}
                {showName && (
                  <h1
                    className={`tracking-tight font-bold leading-none transition-all`}
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: scrolled ? '1.5rem' : '2rem',
                      color: '#0A0A0A',
                    }}
                  >
                    {store.name}
                  </h1>
                )}
              </div>
              <div className="hidden md:flex items-center justify-end gap-4 text-[11px] tracking-[0.2em] uppercase">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline underline-offset-4"
                    style={{ color: '#0A0A0A' }}
                  >
                    Instagram
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="hover:underline underline-offset-4"
                  style={{ color: '#0A0A0A' }}
                >
                  {(store.language === 'en' ? 'Bag' : 'Bolsa')} ({totalItems})
                </button>
              </div>
              <div className="flex md:hidden items-center justify-end col-start-3 row-start-1">
                <button onClick={() => setIsCartOpen(true)} className="text-xs tracking-[0.2em] uppercase">
                  {(store.language === 'en' ? 'Bag' : 'Bolsa')} ({totalItems})
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero — split editorial */}
        <section className="border-y border-black/10">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-24">
            {(store.heroImage || store.heroImageMobile) ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-end">
                <div className="md:col-span-5">
                  <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: '#C8102E' }}>
                    {store.language === 'en' ? 'The cover' : 'Portada'}
                  </p>
                  <h2
                    className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight"
                    style={{ fontFamily: "'Playfair Display', serif", color: '#0A0A0A' }}
                  >
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="mt-6 text-lg md:text-xl italic" style={{ fontFamily: "'Playfair Display', serif", color: '#0A0A0A' }}>
                      &ldquo;{store.about.slogan}&rdquo;
                    </p>
                  )}
                </div>
                <div className="md:col-span-7">
                  <div className="aspect-[4/5] md:aspect-[5/6] overflow-hidden">
                    <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-4xl mx-auto py-10">
                <p className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: '#C8102E' }}>
                  {store.language === 'en' ? 'In this issue' : 'En esta edicion'}
                </p>
                <h2
                  className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {store.name}
                </h2>
                {store.about?.slogan && (
                  <p className="mt-8 text-lg md:text-2xl italic max-w-2xl mx-auto" style={{ fontFamily: "'Playfair Display', serif" }}>
                    &ldquo;{store.about.slogan}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section label above categories */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-2">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-black/15" />
            <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: '#5C5C5C' }}>
              {store.language === 'en' ? 'The edit' : 'La seleccion'}
            </p>
            <div className="h-px flex-1 bg-black/15" />
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
