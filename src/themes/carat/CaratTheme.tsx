/**
 * CARAT THEME - "JOYERIA FINA"
 *
 * Filosofia: Boutique de joyeria de lujo, editorial y luminoso.
 * - Paleta: Marfil calido, carbon suave, dorado antiguo (no brillante)
 * - Tipografia: Serif elegante (Cormorant) para titulos + Jost para texto
 * - Hairlines doradas, mucho aire, foco total en la foto del producto
 * - Ideal para: Joyeria, relojes, accesorios finos, perfumes, lujo discreto
 */

import { useState, useEffect } from 'react'
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

// Paleta de joyeria fina
const ivory = '#FAF6EF'
const charcoal = '#2B2622'
const gold = '#B8945F'

const caratTheme: ThemeConfig = {
  colors: {
    background: ivory,
    surface: '#FFFFFF',
    surfaceHover: '#F3ECE0',
    text: charcoal,
    textMuted: '#8A8178',
    textInverted: '#FFFFFF',
    primary: charcoal,
    primaryHover: '#3A322A',
    accent: gold,
    border: '#E7DECF',
    badge: charcoal,
    badgeText: '#F5E9D6',
  },
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Cormorant Garamond', 'Playfair Display', serif",
    body: "'Jost', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(43, 38, 34, 0.04)',
    md: '0 6px 20px -8px rgba(43, 38, 34, 0.12)',
    lg: '0 24px 40px -16px rgba(43, 38, 34, 0.18)',
  },
  effects: {
    cardHover: 'translateY(-3px)',
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

export default function CaratTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
  const [scrolled, setScrolled] = useState(false)

  const hasHero = !!(store.heroImage || store.heroImageMobile)
  const collectionLabel = store.language === 'en' ? 'Collection' : store.language === 'pt' ? 'Coleção' : 'Colección'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onProductView?.(product)
  }

  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => {
    addItem(product, extras)
    onCartAdd?.(product)
  }

  return (
    <ThemeProvider theme={caratTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: ivory, fontFamily: caratTheme.fonts.body, color: charcoal }}>
        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-all duration-500"
          style={{
            backgroundColor: scrolled ? `${ivory}f2` : ivory,
            backdropFilter: scrolled ? 'blur(12px)' : 'none',
            borderBottom: `1px solid ${scrolled ? caratTheme.colors.border : 'transparent'}`,
          }}
        >
          <div className="max-w-6xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && (
                <span
                  className="transition-all duration-300"
                  style={{
                    fontFamily: caratTheme.fonts.heading,
                    fontSize: scrolled ? '1.25rem' : '1.5rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: charcoal,
                  }}
                >
                  {store.name}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
            >
              <svg className="w-[22px] h-[22px]" fill="none" stroke={charcoal} strokeWidth={1.4} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              {totalItems > 0 && (
                <span
                  className="absolute top-0 right-0 w-5 h-5 text-[10px] font-medium rounded-full flex items-center justify-center animate-scaleIn"
                  style={{ backgroundColor: gold, color: '#fff' }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero */}
        {hasHero ? (
          <section className="px-4 md:px-6 pt-4 pb-8">
            <div className="max-w-6xl mx-auto">
              <div className="md:hidden relative overflow-hidden rounded-lg flex justify-center" style={{ backgroundColor: '#F3ECE0' }}>
                <HeroImg src={store.heroImageMobile || store.heroImage} alt="" className="w-full h-auto max-h-[420px] object-cover" />
              </div>
              <div className="hidden md:block relative overflow-hidden rounded-lg">
                <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full aspect-[16/6] object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(43,38,34,0.45))' }} />
                {store.about?.slogan && (
                  <p
                    className="absolute bottom-6 left-8 text-white max-w-md"
                    style={{ fontFamily: caratTheme.fonts.heading, fontSize: '1.6rem', fontStyle: 'italic', letterSpacing: '0.02em' }}
                  >
                    {store.about.slogan}
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="text-center pt-16 pb-12 md:pt-24 md:pb-16 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="mx-auto mb-6 h-px w-16" style={{ backgroundColor: gold }} />
              <h1
                style={{ fontFamily: caratTheme.fonts.heading, color: charcoal, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                className="text-4xl md:text-6xl font-medium"
              >
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="mt-4 text-base md:text-lg" style={{ color: caratTheme.colors.textMuted, fontStyle: 'italic', fontFamily: caratTheme.fonts.heading }}>
                  {store.about.slogan}
                </p>
              )}
              {store.whatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onWhatsAppClick?.()}
                  className="inline-flex items-center gap-2 mt-8 px-7 py-3 text-sm tracking-widest uppercase transition-all hover:opacity-90"
                  style={{ backgroundColor: charcoal, color: '#F5E9D6', letterSpacing: '0.18em' }}
                >
                  {t.hitUsUp}
                </a>
              )}
              <div className="mx-auto mt-10 h-px w-16" style={{ backgroundColor: gold }} />
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="flex items-center justify-center mb-8">
            <span className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: caratTheme.colors.border }} />
            <span
              className="px-4 text-xs tracking-[0.3em] uppercase"
              style={{ color: gold, fontFamily: caratTheme.fonts.body }}
            >
              {collectionLabel}
            </span>
            <span className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: caratTheme.colors.border }} />
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
                text: caratTheme.colors.text,
                textMuted: caratTheme.colors.textMuted,
                border: caratTheme.colors.border,
                background: caratTheme.colors.surface,
                primary: caratTheme.colors.primary,
                surface: caratTheme.colors.surfaceHover,
              }}
            />
            <SortDropdown
              sortBy={sortBy}
              onSortChange={setSortBy}
              language={store.language}
              colors={{
                text: caratTheme.colors.text,
                border: caratTheme.colors.border,
                background: caratTheme.colors.surface,
                primary: caratTheme.colors.primary,
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
