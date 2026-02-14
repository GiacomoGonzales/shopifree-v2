/**
 * CRAFT THEME - "ARTESANAL"
 *
 * Filosofia: Calido, organico, hecho a mano.
 * - Paleta: Tonos tierra, beige, terracota
 * - Tipografia organica y calida
 * - Bordes redondeados suaves
 * - Textura sutil de papel/kraft
 * - Ideal para productos artesanales, ceramica, jabones, madera
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
  CheckoutDrawer
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

// Craft theme configuration - rustic and handmade
const craftTheme: ThemeConfig = {
  colors: {
    background: '#FBF8F4',       // Cream
    surface: '#FBF8F4',
    surfaceHover: '#F5F0E8',     // Paper
    text: '#3D3228',             // Dark text
    textMuted: '#8B6F4E',        // Warm brown
    textInverted: '#FBF8F4',
    primary: '#C17F59',          // Terracotta
    primaryHover: '#A86B48',
    accent: '#C17F59',
    border: 'rgba(139, 111, 78, 0.15)',
    badge: '#C17F59',
    badgeText: '#FBF8F4',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
    md: '0 4px 8px -2px rgb(0 0 0 / 0.08)',
    lg: '0 16px 32px -8px rgb(0 0 0 / 0.12)',
  },
  effects: {
    cardHover: 'scale-105',
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
}

export default function CraftTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // Theme colors
  const { colors } = craftTheme
  const paper = '#F5F0E8'

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
    <ThemeProvider theme={craftTheme} store={store}>
      {/* Google Fonts for Craft theme */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Source+Sans+3:wght@300;400;500;600&display=swap');
        .font-craft-title { font-family: 'Playfair Display', Georgia, serif; }
        .font-craft-body { font-family: 'Source Sans 3', system-ui, sans-serif; }
      `}</style>

      <div className="min-h-screen font-craft-body" style={{ backgroundColor: colors.background }}>
        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || colors.primary,
              color: store.announcement?.textColor || colors.textInverted
            }}
          >
            {store.announcement?.link ? (
              <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {store.announcement.text}
              </a>
            ) : (
              <span>{store.announcement?.text}</span>
            )}
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3 shadow-sm' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${colors.background}f8` : colors.background,
            backdropFilter: scrolled ? 'blur(12px)' : 'none'
          }}
        >
          <div className="max-w-5xl mx-auto px-5 flex items-center justify-between">
            {/* Logo & Name */}
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-11 h-11 rounded-full overflow-hidden border-2" style={{ borderColor: `${colors.textMuted}30` }}>
                  <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${colors.primary}15` }}
                >
                  <span className="font-craft-title text-lg" style={{ color: colors.primary }}>{store.name.charAt(0)}</span>
                </div>
              )}
              <h1 className="font-craft-title text-xl md:text-2xl" style={{ color: colors.text }}>
                {store.name}
              </h1>
            </div>

            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ backgroundColor: `${colors.primary}12` }}
            >
              <svg className="w-5 h-5" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 text-[11px] font-medium rounded-full flex items-center justify-center animate-scaleIn"
                  style={{ backgroundColor: colors.primary, color: colors.textInverted }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative">
          {(store.heroImage || store.heroImageMobile) ? (
            <>
              {/* Mobile Hero */}
              <div className="md:hidden relative max-h-[400px] overflow-hidden" style={{ backgroundColor: paper }}>
                <img
                  src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                  alt=""
                  className="w-full h-auto max-h-[400px] object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-craft-title text-3xl text-white mb-2">{store.name}</h2>
                  {store.about?.slogan && (
                    <p className="font-craft-body text-white/85 text-base">{store.about.slogan}</p>
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-craft-title text-5xl text-white mb-3">{store.name}</h2>
                  {store.about?.slogan && (
                    <p className="font-craft-body text-white/85 text-lg">{store.about.slogan}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 md:py-24 text-center relative" style={{ backgroundColor: paper }}>
              {/* Decorative elements */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="w-12 h-px" style={{ backgroundColor: `${colors.textMuted}40` }} />
                <svg className="w-5 h-5" style={{ color: colors.primary }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
                </svg>
                <div className="w-12 h-px" style={{ backgroundColor: `${colors.textMuted}40` }} />
              </div>

              <div className="relative max-w-3xl mx-auto px-6 pt-8">
                <h1 className="font-craft-title text-4xl md:text-6xl mb-4" style={{ color: colors.text }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="font-craft-body text-lg md:text-xl" style={{ color: colors.textMuted }}>
                    {store.about.slogan}
                  </p>
                )}
              </div>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="w-12 h-px" style={{ backgroundColor: `${colors.textMuted}40` }} />
                <svg className="w-5 h-5" style={{ color: colors.primary }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
                </svg>
                <div className="w-12 h-px" style={{ backgroundColor: `${colors.textMuted}40` }} />
              </div>
            </div>
          )}
        </section>

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-5xl mx-auto px-4 py-10 md:py-14">
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
