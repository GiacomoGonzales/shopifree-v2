/**
 * POLAROID THEME - "FOTO INSTANTANEA"
 *
 * Filosofia: Tablero de corcho con fotos polaroid pegadas, scotch tape, escritura a mano.
 * - Fondo de corcho/papel kraft
 * - Cards inclinados con marcos blancos tipo polaroid
 * - Tipo handwritten (Caveat / Patrick Hand) para titulos
 * - Sombras realistas de papel
 * - Cinta adhesiva washi en hero
 * Ideal para: arte, manualidades, regalos, fotografia, productos artesanales.
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

const polaroidTheme: ThemeConfig = {
  colors: {
    background: '#E8DCC4',
    surface: '#FFFEF8',
    surfaceHover: '#FFFCF0',
    text: '#2B1F12',
    textMuted: '#7A6A52',
    textInverted: '#FFFEF8',
    primary: '#A0522D',
    primaryHover: '#8B4423',
    accent: '#5C8A6A',
    border: '#C7B891',
    badge: '#FFE9A8',
    badgeText: '#2B1F12',
  },
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Caveat', 'Patrick Hand', cursive",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '2px 4px 6px rgba(0,0,0,0.12)',
    md: '4px 8px 16px rgba(0,0,0,0.15)',
    lg: '6px 12px 24px rgba(0,0,0,0.18)',
  },
  effects: {
    cardHover: 'rotate-0 scale-105',
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

export default function PolaroidTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
    <ThemeProvider theme={polaroidTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Patrick+Hand&family=Nunito:wght@300;400;600;700&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#E8DCC4',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(139,108,69,0.18) 0%, transparent 4%),
            radial-gradient(circle at 80% 50%, rgba(139,108,69,0.14) 0%, transparent 5%),
            radial-gradient(circle at 40% 80%, rgba(139,108,69,0.12) 0%, transparent 4%),
            radial-gradient(circle at 90% 90%, rgba(139,108,69,0.10) 0%, transparent 3%),
            radial-gradient(circle at 10% 70%, rgba(139,108,69,0.16) 0%, transparent 4%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' /%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.4 0 0 0 0 0.25 0 0 0 0.18 0' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")
          `,
          fontFamily: "'Nunito', system-ui, sans-serif",
          color: '#2B1F12',
        }}
      >
        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-all"
          style={{
            backgroundColor: scrolled ? 'rgba(232,220,196,0.92)' : '#E8DCC4',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '1px dashed rgba(122,106,82,0.4)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-10 w-auto object-contain" />}
              {showName && (
                <h1
                  className="text-2xl md:text-3xl"
                  style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: '#2B1F12' }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-4 py-2 transition-transform hover:rotate-1"
              style={{
                backgroundColor: '#FFFEF8',
                color: '#2B1F12',
                fontFamily: "'Caveat', cursive",
                fontSize: '1.25rem',
                fontWeight: 600,
                boxShadow: '2px 3px 0 rgba(43,31,18,0.18)',
                transform: 'rotate(-1deg)',
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>{totalItems > 0 ? `${totalItems}` : '·'}</span>
            </button>
          </div>
        </header>

        {/* Hero — polaroid framed */}
        <section className="relative py-10 md:py-16">
          <div className="max-w-5xl mx-auto px-4">
            <div
              className="relative bg-white p-3 pb-16 mx-auto max-w-3xl"
              style={{
                boxShadow: '6px 12px 30px rgba(0,0,0,0.18)',
                transform: 'rotate(-1.5deg)',
              }}
            >
              {/* Washi tape */}
              <div
                className="absolute -top-3 left-12 w-24 h-6 opacity-90"
                style={{
                  background: 'repeating-linear-gradient(45deg, #F9C5C5, #F9C5C5 6px, #FCE5E5 6px, #FCE5E5 12px)',
                  transform: 'rotate(-6deg)',
                  boxShadow: '1px 2px 4px rgba(0,0,0,0.15)',
                }}
              />
              <div
                className="absolute -top-3 right-16 w-20 h-6 opacity-85"
                style={{
                  background: 'repeating-linear-gradient(-45deg, #B8DDB0, #B8DDB0 5px, #DCEFD4 5px, #DCEFD4 10px)',
                  transform: 'rotate(8deg)',
                  boxShadow: '1px 2px 4px rgba(0,0,0,0.15)',
                }}
              />

              {(store.heroImage || store.heroImageMobile) ? (
                <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="aspect-[4/3] flex items-center justify-center text-center px-6"
                  style={{ background: 'linear-gradient(135deg, #FFE9A8 0%, #F9C5C5 100%)' }}
                >
                  <h2
                    className="text-5xl md:text-7xl"
                    style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: '#2B1F12' }}
                  >
                    {store.name}
                  </h2>
                </div>
              )}
              {/* Hand-written caption */}
              <p
                className="absolute bottom-3 left-0 right-0 text-center text-2xl md:text-3xl"
                style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, color: '#2B1F12' }}
              >
                {store.about?.slogan || (store.language === 'en' ? '~ welcome ~' : '~ bienvenidos ~')}
              </p>
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section title */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2 text-center">
          <h2
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, color: '#2B1F12' }}
          >
            {store.language === 'en' ? '— our little collection —' : '— nuestra coleccion —'}
          </h2>
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
