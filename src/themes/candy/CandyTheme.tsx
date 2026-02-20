/**
 * CANDY THEME - "Y2K / BUBBLE GUM"
 *
 * Filosofia: Ultra Y2K, bubble gum, glossy, divertido.
 * - Paleta: Hot pink, lila, fondo rosado suave
 * - Tipografia: Redondeada, bold, playful
 * - Bordes gruesos redondeados, sombras coloridas
 * - Estetica Bratz/2000s/kawaii
 * - Ideal para: Accesorios, phone cases, stickers, moda trendy
 */

import { useState, useEffect, useMemo } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import { getThemeTranslations } from '../shared/translations'
import { optimizeImage } from '../../utils/cloudinary'
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

const candyTheme: ThemeConfig = {
  colors: {
    background: '#FFF0F5',
    surface: '#ffffff',
    surfaceHover: '#FFF5F8',
    text: '#4A154B',
    textMuted: '#9B59B6',
    textInverted: '#ffffff',
    primary: '#FF69B4',
    primaryHover: '#FF1493',
    accent: '#B967FF',
    border: '#F8C8DC',
    badge: '#FF69B4',
    badgeText: '#ffffff',
  },
  radius: {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Bubblegum Sans', 'Comic Neue', cursive, system-ui",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 8px rgba(255, 105, 180, 0.15)',
    md: '0 4px 20px rgba(255, 105, 180, 0.2)',
    lg: '0 8px 40px rgba(185, 103, 255, 0.2)',
  },
  effects: {
    cardHover: 'translateY(-6px) rotate(-1deg)',
    buttonHover: 'scale-110',
    headerBlur: true,
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

export default function CandyTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const t = getThemeTranslations(store.language)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const hotPink = '#FF69B4'
  const lilac = '#B967FF'
  const bgColor = '#FFF0F5'

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
    <ThemeProvider theme={candyTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Bubblegum+Sans&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen"
        style={{
          backgroundColor: bgColor,
          fontFamily: "'Nunito', system-ui, sans-serif"
        }}
      >
        {/* Decorative floating shapes */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-20 left-10 w-16 h-16 rounded-full" style={{ background: `linear-gradient(135deg, ${hotPink}, ${lilac})`, filter: 'blur(20px)' }} />
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full" style={{ background: `linear-gradient(135deg, ${lilac}, #01CDFE)`, filter: 'blur(30px)' }} />
          <div className="absolute bottom-40 left-1/4 w-20 h-20 rounded-full" style={{ background: `linear-gradient(135deg, #FFBE0B, ${hotPink})`, filter: 'blur(25px)' }} />
          <div className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full" style={{ background: `linear-gradient(135deg, #00F5D4, ${lilac})`, filter: 'blur(15px)' }} />
        </div>

        <AnnouncementBar />

        {/* Header - bubbly style */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${
            scrolled ? 'backdrop-blur-xl shadow-lg' : ''
          }`}
          style={{
            backgroundColor: scrolled ? `${bgColor}ee` : bgColor,
            borderBottom: `3px solid ${hotPink}30`
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                {store.logo && (
                  <img src={store.logo} alt={store.name} className="h-9 w-auto" />
                )}
                <h1
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "'Bubblegum Sans', cursive",
                    color: '#4A154B',
                  }}
                >
                  {store.name}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all hover:bg-pink-100"
                    style={{ color: hotPink }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all"
                  style={{
                    background: totalItems > 0 ? `linear-gradient(135deg, ${hotPink}, ${lilac})` : 'white',
                    color: totalItems > 0 ? 'white' : hotPink,
                    border: totalItems > 0 ? 'none' : `3px solid ${hotPink}`,
                    boxShadow: totalItems > 0 ? `0 4px 20px ${hotPink}40` : `0 2px 10px ${hotPink}15`
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {totalItems > 0 && <span>{totalItems}</span>}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        {(store.heroImage || store.heroImageMobile) ? (
          <section className="relative">
            <div className="md:hidden relative">
              <img src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt={store.name} className="w-full h-auto max-h-[400px] object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hotPink}20 0%, transparent 50%, ${lilac}20 100%)` }} />
            </div>
            <div className="hidden md:block relative aspect-[16/5] overflow-hidden">
              <img src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt={store.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hotPink}20 0%, transparent 50%, ${lilac}20 100%)` }} />
            </div>
          </section>
        ) : (
          <section className="py-16 md:py-24 text-center relative overflow-hidden">
            <div className="max-w-4xl mx-auto px-6 relative">
              <h2
                className="text-4xl md:text-6xl font-bold"
                style={{
                  fontFamily: "'Bubblegum Sans', cursive",
                  color: '#4A154B',
                }}
              >
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-4 text-lg font-medium" style={{ color: '#9B59B6' }}>{store.about.slogan}</p>
              )}
              {store.whatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onWhatsAppClick?.()}
                  className="inline-flex items-center gap-2 mt-6 px-7 py-3 rounded-full font-bold transition-all hover:scale-105"
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    boxShadow: '0 4px 20px #25D36640'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  {t.hitUsUp}
                </a>
              )}
            </div>
          </section>
        )}

        <TrustBar />
        <FlashSaleBar />

        <CategoryNav categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} products={products} onSelectProduct={handleSelectProduct} />

        <main className="py-10" style={{ backgroundColor: bgColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} onQuickAdd={handleAddToCart} categories={categories} />
          </div>
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
