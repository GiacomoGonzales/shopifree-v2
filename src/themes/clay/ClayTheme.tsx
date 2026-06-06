/**
 * CLAY THEME - "CLAYMORPHISM"
 *
 * Filosofia: Plastilina digital. Todo se siente inflado, blando y tactil.
 * - Doble sombra (oscura externa + highlight blanco interno) = volumen "clay"
 * - Esquinas muy redondeadas, paleta pastel lila/menta/coral
 * - Botones que parecen fisicos y se "hunden" al presionar
 * - Tipografia redonda (Fredoka / Nunito)
 * - Ideal para: ninos, dulces, hecho a mano, accesorios, marcas juguetonas
 */

import { useState } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import { getThemeTranslations } from '../shared/translations'
import {
  ThemeProvider,
  ProductGrid,
  ProductDrawer,
  CartDrawer,
  CartBar,
  CategoryCarousel,
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
import { useProductFilters } from '../shared/useProductFilters'
import SortDropdown from '../shared/SortDropdown'
import FilterPanel from '../shared/FilterPanel'

// Paleta pastel + sombras "clay" (doble sombra: oscura externa + luz interna)
const clayBg = '#ECE9FB'
const claySurface = '#F4F2FE'
const clayInk = '#4A4458'
const clayPurple = '#8B7CF0'
const clayPink = '#FF9EB3'

// Sombra inflada reutilizable (estilo plastilina)
const claySoft = '8px 8px 18px rgba(150,140,205,0.30), -7px -7px 16px rgba(255,255,255,0.95)'
const clayPressed = 'inset 5px 5px 12px rgba(150,140,205,0.35), inset -5px -5px 12px rgba(255,255,255,0.9)'

const clayTheme: ThemeConfig = {
  colors: {
    background: clayBg,
    surface: claySurface,
    surfaceHover: '#E5E1FA',
    text: clayInk,
    textMuted: '#9A93AE',
    textInverted: '#FFFFFF',
    primary: clayPurple,
    primaryHover: '#7A6AE6',
    accent: clayPink,
    border: '#DCD7F5',
    badge: clayPurple,
    badgeText: '#FFFFFF',
  },
  radius: {
    sm: '0.875rem',
    md: '1.25rem',
    lg: '1.75rem',
    xl: '2.25rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '6px 6px 12px rgba(150,140,205,0.25), -6px -6px 12px rgba(255,255,255,0.9)',
    md: claySoft,
    lg: '16px 16px 38px rgba(150,140,205,0.35), -12px -12px 26px rgba(255,255,255,0.92)',
  },
  effects: {
    cardHover: 'translateY(-4px)',
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

export default function ClayTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const t = getThemeTranslations(store.language)

  const {
    filteredProducts,
    availableFilters,
    activeFilters,
    setFilter,
    setVariationFilter,
    clearFilters,
    hasActiveFilters,
    sortBy,
    setSortBy,
  } = useProductFilters(products, categories)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const collectionLabel = store.language === 'en' ? 'Our picks' : store.language === 'pt' ? 'Seleção' : 'Selección'

  const [cartPressed, setCartPressed] = useState(false)
  const [ctaPressed, setCtaPressed] = useState(false)

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onProductView?.(product)
  }

  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => {
    addItem(product, extras)
    onCartAdd?.(product)
  }

  return (
    <ThemeProvider theme={clayTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: clayBg, fontFamily: clayTheme.fonts.body, color: clayInk }}>
        <AnnouncementBar />

        {/* Header */}
        <header className="sticky top-0 z-50" style={{ backgroundColor: clayBg }}>
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3">
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-full"
              style={{ backgroundColor: claySurface, boxShadow: claySoft }}
            >
              <div className="flex items-center gap-3 pl-1">
                {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
                {showName && (
                  <span style={{ fontFamily: clayTheme.fonts.heading, fontWeight: 600, fontSize: '1.25rem', color: clayInk }}>
                    {store.name}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                onMouseDown={() => setCartPressed(true)}
                onMouseUp={() => setCartPressed(false)}
                onMouseLeave={() => setCartPressed(false)}
                className="relative w-11 h-11 flex items-center justify-center rounded-full transition-transform active:scale-95"
                style={{ backgroundColor: claySurface, boxShadow: cartPressed ? clayPressed : claySoft }}
              >
                <svg className="w-5 h-5" fill="none" stroke={clayPurple} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center animate-scaleIn"
                    style={{ backgroundColor: clayPink, color: '#fff' }}
                  >
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Hero */}
        {hasHero ? (
          <section className="px-4 md:px-6 pt-3 pb-8">
            <div className="max-w-6xl mx-auto">
              <div
                className="md:hidden relative overflow-hidden flex justify-center"
                style={{ borderRadius: clayTheme.radius.xl, boxShadow: clayTheme.shadows.lg, backgroundColor: claySurface }}
              >
                <HeroImg src={store.heroImageMobile || store.heroImage} alt="" className="w-full h-auto max-h-[420px] object-cover" />
              </div>
              <div
                className="hidden md:block relative overflow-hidden"
                style={{ borderRadius: '2.25rem', boxShadow: clayTheme.shadows.lg }}
              >
                <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full aspect-[16/6] object-cover" />
              </div>
              {store.about?.slogan && (
                <p className="text-center mt-6 text-lg md:text-xl" style={{ color: clayTheme.colors.textMuted, fontFamily: clayTheme.fonts.heading }}>
                  {store.about.slogan}
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="px-4 md:px-6 pt-8 pb-10">
            <div
              className="max-w-3xl mx-auto text-center px-8 py-14 relative overflow-hidden"
              style={{ backgroundColor: claySurface, borderRadius: '2.25rem', boxShadow: clayTheme.shadows.lg }}
            >
              {/* Blobs decorativos */}
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-40" style={{ backgroundColor: clayPink }} />
              <div className="absolute -bottom-12 -right-8 w-40 h-40 rounded-full opacity-30" style={{ backgroundColor: clayPurple }} />
              <div className="relative">
                <h1 style={{ fontFamily: clayTheme.fonts.heading, fontWeight: 700, color: clayInk }} className="text-4xl md:text-6xl">
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="mt-4 text-base md:text-lg" style={{ color: clayTheme.colors.textMuted }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()}
                    onMouseDown={() => setCtaPressed(true)}
                    onMouseUp={() => setCtaPressed(false)}
                    onMouseLeave={() => setCtaPressed(false)}
                    className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 font-semibold transition-transform active:scale-95"
                    style={{
                      backgroundColor: clayPurple,
                      color: '#fff',
                      borderRadius: clayTheme.radius.full,
                      boxShadow: ctaPressed ? 'inset 4px 4px 10px rgba(80,60,160,0.5)' : '6px 6px 14px rgba(139,124,240,0.45)',
                      fontFamily: clayTheme.fonts.heading,
                    }}
                  >
                    {t.hitUsUp}
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        <TrustBar />
        <FlashSaleBar />

        {/* Categories */}
        <CategoryCarousel
          categories={categories}
          activeCategory={activeFilters.categoryId}
          onCategoryChange={(id) => setFilter('categoryId', id)}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="flex justify-center mb-8">
            <span
              className="px-6 py-2.5 text-sm font-bold"
              style={{
                backgroundColor: claySurface,
                color: clayPurple,
                borderRadius: clayTheme.radius.full,
                boxShadow: clayTheme.shadows.sm,
                fontFamily: clayTheme.fonts.heading,
              }}
            >
              {collectionLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <FilterPanel
              availableFilters={availableFilters}
              activeFilters={activeFilters}
              onFilterChange={setFilter}
              onVariationChange={setVariationFilter}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
              language={store.language}
              currency={store.currency}
              colors={{
                text: clayTheme.colors.text,
                textMuted: clayTheme.colors.textMuted,
                border: clayTheme.colors.border,
                background: clayTheme.colors.surface,
                primary: clayTheme.colors.primary,
                surface: clayTheme.colors.surfaceHover,
              }}
            />
            <SortDropdown
              sortBy={sortBy}
              onSortChange={setSortBy}
              language={store.language}
              colors={{
                text: clayTheme.colors.text,
                border: clayTheme.colors.border,
                background: clayTheme.colors.surface,
                primary: clayTheme.colors.primary,
              }}
              className="ml-auto"
            />
          </div>

          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
            categories={categories}
          />
        </main>

        <StoreFooter onWhatsAppClick={onWhatsAppClick} />
        <SocialProofToast />

        <WhatsAppButton
          whatsapp={store.whatsapp || ''}
          storeName={store.name}
          onClick={onWhatsAppClick}
          visible={totalItems === 0}
        />

        <CartBar
          totalItems={totalItems}
          totalPrice={totalPrice}
          onViewCart={() => setIsCartOpen(true)}
          onCheckout={() => setIsCheckoutOpen(true)}
        />

        {selectedProduct && (
          <ProductDrawer
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}

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
