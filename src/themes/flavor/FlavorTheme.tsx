/**
 * FLAVOR THEME - "GASTRONOMIA"
 *
 * Filosofia: Apetitoso, calido, acogedor.
 * - Paleta: Rojos, naranjas, amarillos calidos, crema
 * - Tipografia: Redondeada, amigable, legible
 * - Layout estilo menu, cards generosas
 * - Transiciones suaves, imagenes protagonistas
 * - Ideal para: Restaurantes, cafeterias, panaderias, delivery de comida
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
  TrustBar
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

// Flavor theme configuration - warm and appetizing
const flavorTheme: ThemeConfig = {
  colors: {
    background: '#FFFDF7',       // Light cream
    surface: '#ffffff',
    surfaceHover: '#FFF8E7',     // Warm cream hover
    text: '#4E342E',             // Warm brown
    textMuted: '#5D4037',        // Warm gray
    textInverted: '#ffffff',
    primary: '#E53935',          // Tomato red
    primaryHover: '#C62828',
    accent: '#FF6D00',           // Warm orange
    border: '#FFF8E7',
    badge: '#FF6D00',
    badgeText: '#ffffff',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    full: '9999px',
  },
  fonts: {
    heading: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
  },
  shadows: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.08)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.1)',
    lg: '0 20px 40px -8px rgb(0 0 0 / 0.15)',
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

export default function FlavorTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const t = getThemeTranslations(store.language)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Theme colors
  const { colors } = flavorTheme
  const cream = '#FFF8E7'

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
    <ThemeProvider theme={flavorTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'shadow-lg' : ''}`}
          style={{ backgroundColor: cream }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo + Name */}
              <div className="flex items-center gap-3">
                {store.logo && (
                  <img src={store.logo} alt={store.name} className="h-10 w-auto" />
                )}
                <h1 className="text-lg font-bold" style={{ color: colors.text }}>
                  {store.name}
                </h1>
              </div>

              {/* Nav Actions */}
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                    style={{ color: colors.textMuted }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}

                {/* Cart */}
                {totalItems > 0 && (
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-white transition-all hover:scale-105"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{totalItems}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        {(store.heroImage || store.heroImageMobile) && (
          <section className="relative">
            {/* Mobile Hero */}
            <div className="md:hidden relative">
              <img
                src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                alt={store.name}
                className="w-full h-auto max-h-[400px] object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' }}
              />
            </div>
            {/* Desktop Hero */}
            <div className="hidden md:block relative aspect-[16/5] overflow-hidden">
              <img
                src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')}
                alt={store.name}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' }}
              />
            </div>
          </section>
        )}

        {/* Store Info */}
        <section className="py-8" style={{ backgroundColor: cream }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
                  {store.name}
                </h2>
                {store.about?.slogan && (
                  <p className="mt-1" style={{ color: colors.textMuted }}>{store.about.slogan}</p>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-end gap-3">
                {store.location && (
                  <div className="flex items-center gap-1 text-sm" style={{ color: colors.textMuted }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{[store.location.city, store.location.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white transition-all hover:scale-105"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    {t.checkout}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>


        <TrustBar />

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="py-8" style={{ backgroundColor: colors.background }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ProductGrid
              products={filteredProducts}
              onSelectProduct={handleSelectProduct}
              onQuickAdd={handleAddToCart}
            categories={categories}
            />
          </div>
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
