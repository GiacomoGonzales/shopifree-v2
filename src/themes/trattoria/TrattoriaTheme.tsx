/**
 * TRATTORIA THEME - "CUCINA ITALIANA"
 *
 * Filosofia: Calido, rustico, autentico.
 * - Paleta: Terracota, verde oliva, crema, rojo tomate
 * - Tipografia: Serif clasica italiana, elegante pero acogedora
 * - Layout estilo menu tradicional italiano
 * - Detalles rusticos, texturas de madera
 * - Ideal para: Pizzerias, pasta, trattorias, cocina mediterranea
 */

import { useState, useEffect, useMemo } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
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

// Trattoria colors
const terracotta = '#C2410C'
const olive = '#65A30D'
const cream = '#FFFBEB'
const warmWhite = '#FEF7ED'
const tomato = '#DC2626'
const darkBrown = '#451A03'

// Trattoria theme configuration
const trattoriaTheme: ThemeConfig = {
  colors: {
    background: warmWhite,
    surface: cream,
    surfaceHover: '#FEF3C7',
    text: darkBrown,
    textMuted: '#92400E',
    textInverted: warmWhite,
    primary: terracotta,
    primaryHover: '#9A3412',
    accent: olive,
    border: '#FDE68A',
    badge: tomato,
    badgeText: '#ffffff',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Lato', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(0 0 0 / 0.08)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.12)',
    lg: '0 20px 40px -8px rgb(0 0 0 / 0.18)',
  },
  effects: {
    cardHover: 'scale-103',
    buttonHover: 'scale-105',
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

export default function TrattoriaTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const lang = (store.language as 'es' | 'en' | 'pt') || 'es'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
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
    <ThemeProvider theme={trattoriaTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: warmWhite }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Lato:wght@300;400;500;700&display=swap');
          .font-trattoria { font-family: 'Playfair Display', Georgia, serif; }
          .font-trattoria-body { font-family: 'Lato', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${warmWhite}f5` : warmWhite,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `2px solid ${terracotta}30` : '2px solid transparent'
          }}
        >
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo ? (
                <div className="w-14 h-14 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                /* Italian-style emblem */
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: terracotta, backgroundColor: cream }}
                >
                  <span className="text-2xl">🍕</span>
                </div>
              )}
              <div>
                <h1 className="font-trattoria text-2xl md:text-3xl font-semibold italic" style={{ color: darkBrown }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-trattoria-body tracking-wide" style={{ color: terracotta }}>
                    {store.about.slogan}
                  </p>
                )}
              </div>
            </div>

            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative group"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105 border-2"
                style={{ borderColor: terracotta, backgroundColor: cream }}
              >
                <svg className="w-5 h-5" style={{ color: terracotta }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn"
                  style={{ backgroundColor: tomato, color: 'white' }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          {(store.heroImage || store.heroImageMobile) ? (
            <>
              {/* Mobile Hero */}
              <div className="md:hidden relative max-h-[400px] overflow-hidden">
                <img
                  src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                  alt=""
                  className="w-full h-auto max-h-[400px] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${warmWhite} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-trattoria text-3xl font-semibold italic" style={{ color: darkBrown }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-trattoria-body text-sm mt-1" style={{ color: terracotta }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>

              {/* Desktop Hero */}
              <div className="hidden md:block relative overflow-hidden">
                <img
                  src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')}
                  alt=""
                  className="w-full aspect-[16/5] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${warmWhite} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-trattoria text-5xl lg:text-6xl font-semibold italic" style={{ color: darkBrown }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-trattoria-body text-lg mt-3" style={{ color: terracotta }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Italian Rustic Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: cream }}>
              {/* Checkered pattern overlay */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `
                    linear-gradient(45deg, ${terracotta} 25%, transparent 25%),
                    linear-gradient(-45deg, ${terracotta} 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, ${terracotta} 75%),
                    linear-gradient(-45deg, transparent 75%, ${terracotta} 75%)
                  `,
                  backgroundSize: '40px 40px',
                  backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px'
                }} />
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Decorative olive branches */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <span className="text-3xl transform -scale-x-100">🌿</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: olive }} />
                  <span className="text-3xl">🌿</span>
                </div>

                <p className="font-trattoria text-sm tracking-[0.3em] uppercase mb-4" style={{ color: olive }}>
                  {lang === 'en' ? 'Welcome to' : lang === 'pt' ? 'Bem-vindo a' : 'Benvenuti a'}
                </p>

                <h1 className="font-trattoria text-5xl md:text-7xl font-semibold italic" style={{ color: darkBrown }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="font-trattoria-body text-lg mt-4" style={{ color: terracotta }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-trattoria-body text-base max-w-xl mx-auto mt-4 leading-relaxed" style={{ color: `${darkBrown}cc` }}>
                    {store.about.description}
                  </p>
                )}

                {/* Italian decorative elements */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <span className="text-2xl">🍅</span>
                  <span className="text-2xl">🧀</span>
                  <span className="text-2xl">🌿</span>
                  <span className="text-2xl">🍷</span>
                  <span className="text-2xl">🫒</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Menu Title */}
        <div className="py-8 text-center" style={{ backgroundColor: warmWhite }}>
          <div className="inline-block relative">
            {/* Decorative line left */}
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center gap-2 pr-4">
              <div className="w-12 h-px" style={{ backgroundColor: terracotta }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: olive }} />
            </div>

            <div className="px-8">
              <p className="font-trattoria text-sm tracking-[0.2em] uppercase" style={{ color: olive }}>
                {lang === 'en' ? 'Our' : lang === 'pt' ? 'Nosso' : 'Il Nostro'}
              </p>
              <p className="font-trattoria text-2xl italic" style={{ color: darkBrown }}>
                Menu
              </p>
            </div>

            {/* Decorative line right */}
            <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 flex items-center gap-2 pl-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: olive }} />
              <div className="w-12 h-px" style={{ backgroundColor: terracotta }} />
            </div>
          </div>
        </div>


        <TrustBar />
        <FlashSaleBar />

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12" style={{ backgroundColor: warmWhite }}>
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
            categories={categories}
          />
        </main>

        {/* Footer */}
        <StoreFooter onWhatsAppClick={onWhatsAppClick} />

        {/* WhatsApp Float */}
        <SocialProofToast />


        <WhatsAppButton
          whatsapp={store.whatsapp || ''}
          storeName={store.name}
          onClick={onWhatsAppClick}
          visible={totalItems === 0}
        />

        {/* Cart Bar */}
        <CartBar
          totalItems={totalItems}
          totalPrice={totalPrice}
          onViewCart={() => setIsCartOpen(true)}
          onCheckout={() => setIsCheckoutOpen(true)}
        />

        {/* Product Drawer */}
        {selectedProduct && (
          <ProductDrawer
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Cart Drawer */}
        {isCartOpen && (
          <CartDrawer
            items={items}
            totalPrice={totalPrice}
            onClose={() => setIsCartOpen(false)}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={() => {
              setIsCartOpen(false)
              setIsCheckoutOpen(true)
            }}
          />
        )}

        {/* Checkout Drawer */}
        {isCheckoutOpen && (
          <CheckoutDrawer
            items={items}
            totalPrice={totalPrice}
            store={store}
            onClose={() => setIsCheckoutOpen(false)}
            onOrderComplete={() => {
              clearCart()
              setIsCheckoutOpen(false)
            }}
          />
        )}
      </div>
    </ThemeProvider>
  )
}
