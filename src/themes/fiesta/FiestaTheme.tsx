/**
 * FIESTA THEME - "MORADO Y DORADO, REDONDO Y FESTIVO"
 *
 * Filosofia: mascota de caricatura, gruesa y alegre.
 * - Paleta: morado profundo + amarillo dorado sobre crema tibio
 * - Tipografia: Fredoka, redonda y con cuerpo, como una etiqueta de sticker
 * - El rasgo que define el estilo es el CONTORNO BLANCO grueso: en los logos
 *   de este tipo cada forma va delineada en blanco antes del color, y eso es
 *   lo que separa el aire "sticker" del degradado generico. Se replica con
 *   `outlined()` en los elementos que mandan (logo, carrito, botones).
 * - Bordes muy redondeados, casi pildora, y sombras tenidas de morado.
 * - Ideal para: pizzerias, heladerias, comida para compartir, delivery.
 */

import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import { getThemeTranslations } from '../shared/translations'
import { useHeaderLogo } from '../shared/useHeaderLogo'
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
import HeroImg from '../../components/catalog/HeroImg'
import { useProductFilters } from '../shared/useProductFilters'
import SortDropdown from '../shared/SortDropdown'
import FilterPanel from '../shared/FilterPanel'

// Paleta tomada del logo: morado saturado, dorado calido, crema de fondo.
const MORADO = '#6D21CE'
const MORADO_OSCURO = '#4E1497'
const DORADO = '#FFC42E'
const CREMA = '#FFF7E6'
const TINTA = '#3D1170'

const fiestaTheme: ThemeConfig = {
  colors: {
    background: CREMA,
    surface: '#ffffff',
    surfaceHover: '#FBF3FF',
    text: TINTA,
    textMuted: '#8A6BB1',
    textInverted: '#ffffff',
    primary: MORADO,
    primaryHover: MORADO_OSCURO,
    accent: DORADO,
    border: '#EADCF9',
    // Insignia dorada con texto morado: el amarillo con texto blanco no llega
    // a contraste suficiente, y en las etiquetas de descuento eso se nota.
    badge: DORADO,
    badgeText: TINTA,
  },
  radius: {
    sm: '0.75rem',
    md: '1.125rem',
    lg: '1.75rem',
    xl: '2.25rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 8px rgba(109, 33, 206, 0.12)',
    md: '0 6px 22px rgba(109, 33, 206, 0.16)',
    lg: '0 14px 42px rgba(109, 33, 206, 0.20)',
  },
  effects: {
    cardHover: 'translateY(-5px)',
    buttonHover: 'scale-105',
    headerBlur: true,
    darkMode: false,
  },
}

/** Contorno blanco grueso, el rasgo que define este estilo. */
const outlined = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  border: '3px solid #ffffff',
  boxShadow: fiestaTheme.shadows.sm,
  ...extra,
})

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
  onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void
  initialProduct?: Product | null
}

export default function FiestaTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const t = getThemeTranslations(store.language)
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store)

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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
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

  const filtroColores = {
    text: fiestaTheme.colors.text,
    textMuted: fiestaTheme.colors.textMuted,
    border: fiestaTheme.colors.border,
    background: fiestaTheme.colors.background,
    primary: fiestaTheme.colors.primary,
    surface: fiestaTheme.colors.surfaceHover,
  }

  return (
    <ThemeProvider theme={fiestaTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: CREMA, fontFamily: fiestaTheme.fonts.body }}>
        {/* Fondo: un arco dorado difuso arriba, como el del logo detras de la
            mascota, y dos manchas moradas suaves. Muy tenue a proposito: la
            foto del producto tiene que seguir siendo lo que se mira. */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full opacity-[0.18]"
               style={{ background: `radial-gradient(circle, ${DORADO} 0%, transparent 62%)` }} />
          <div className="absolute top-1/3 -left-24 w-72 h-72 rounded-full opacity-[0.10]"
               style={{ background: `radial-gradient(circle, ${MORADO} 0%, transparent 65%)` }} />
          <div className="absolute bottom-0 -right-20 w-80 h-80 rounded-full opacity-[0.10]"
               style={{ background: `radial-gradient(circle, ${MORADO} 0%, transparent 65%)` }} />
        </div>

        <AnnouncementBar />

        <header
          className="sticky top-0 z-50 transition-all duration-300"
          style={{
            backgroundColor: scrolled ? `${CREMA}f2` : CREMA,
            backdropFilter: scrolled ? 'blur(12px)' : undefined,
            borderBottom: `3px solid ${scrolled ? MORADO : 'transparent'}1f`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-[70px] gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {headerLogo && (
                  <img
                    src={headerLogo}
                    alt={store.name}
                    className={logoClassName}
                    style={outlined({ borderRadius: '9999px', background: '#fff' })}
                  />
                )}
                {showName && (
                  <h1 className="text-[1.35rem] leading-none truncate"
                      style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 700, color: MORADO }}>
                    {store.name}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-11 h-11 flex items-center justify-center rounded-full transition-transform hover:scale-105"
                    style={outlined({ background: '#fff', color: MORADO })}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  aria-label={t.cart}
                  className="relative flex items-center gap-2 h-11 px-4 rounded-full transition-transform hover:scale-105"
                  style={outlined({
                    background: totalItems > 0 ? MORADO : '#fff',
                    color: totalItems > 0 ? '#fff' : MORADO,
                  })}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {totalItems > 0 && (
                    <span className="text-sm" style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 700 }}>
                      {totalItems}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {(store.heroImage || store.heroImageMobile) ? (
          <section className="relative px-4 sm:px-6 pt-4">
            <div className="max-w-7xl mx-auto overflow-hidden"
                 style={outlined({ borderRadius: fiestaTheme.radius.xl, boxShadow: fiestaTheme.shadows.md })}>
              <div className="md:hidden">
                <HeroImg src={store.heroImageMobile || store.heroImage} alt={store.name} className="w-full h-auto max-h-[380px] object-cover" />
              </div>
              <div className="hidden md:block aspect-[16/5]">
                <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        ) : (
          <section className="py-14 md:py-20 text-center relative">
            <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-[2.5rem] md:text-[3.75rem] leading-[1.05]"
                  style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 700, color: MORADO }}>
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-4 text-lg font-semibold" style={{ color: fiestaTheme.colors.textMuted }}>
                  {store.about.slogan}
                </p>
              )}
              {store.whatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onWhatsAppClick?.()}
                  className="inline-flex items-center gap-2 mt-7 px-7 py-3.5 rounded-full transition-transform hover:scale-105"
                  style={outlined({ background: '#25D366', color: '#fff', boxShadow: '0 6px 22px rgba(37,211,102,0.35)' })}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 600 }}>{t.hitUsUp}</span>
                </a>
              )}
            </div>
          </section>
        )}

        <TrustBar />
        <FlashSaleBar />

        <CategoryCarousel
          categories={categories}
          activeCategory={activeFilters.categoryId}
          onCategoryChange={(id) => setFilter('categoryId', id)}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="py-8 md:py-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                colors={filtroColores}
              />
              <SortDropdown
                sortBy={sortBy}
                onSortChange={setSortBy}
                language={store.language}
                colors={{
                  text: fiestaTheme.colors.text,
                  border: fiestaTheme.colors.border,
                  background: fiestaTheme.colors.background,
                  primary: fiestaTheme.colors.primary,
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
