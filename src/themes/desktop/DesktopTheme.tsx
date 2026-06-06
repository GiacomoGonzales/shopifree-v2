/**
 * DESKTOP THEME - "SISTEMA OPERATIVO RETRO"
 *
 * Filosofia: la tienda ES un escritorio de sistema operativo clasico.
 * - Barra de menu superior (nombre + menus + reloj) tipo Mac OS clasico
 * - Escritorio teal con iconos de carpeta decorativos
 * - El catalogo vive dentro de una "ventana" con barra de titulo a rayas,
 *   caja de cierre y zoom, borde negro y sombra dura
 * - Concepto de interfaz skeuomorfica, distinto a ticket o chat
 * - Ideal para: tech, retro, marcas con personalidad nerd/creativa
 */

import { useState } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
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

const deskTeal = '#6E8CA0'
const osInk = '#1A1A1A'
const osBlue = '#2C5AA0'
const pixel = "'Pixelify Sans', ui-monospace, monospace"

const desktopTheme: ThemeConfig = {
  colors: {
    background: deskTeal,
    surface: '#FFFFFF',
    surfaceHover: '#ECECEC',
    text: osInk,
    textMuted: '#5A5A5A',
    textInverted: '#FFFFFF',
    primary: osBlue,
    primaryHover: '#234A85',
    accent: osBlue,
    border: '#9A9A9A',
    badge: osBlue,
    badgeText: '#FFFFFF',
  },
  radius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.25rem',
    xl: '0.375rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Chivo', system-ui, sans-serif",
    body: "'Chivo', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.15)',
    md: '2px 2px 0 rgba(0,0,0,0.25)',
    lg: '4px 4px 0 rgba(0,0,0,0.35)',
  },
  effects: {
    cardHover: 'translateY(-2px)',
    buttonHover: 'scale-105',
    headerBlur: false,
    darkMode: false,
  },
}

// Rayas de la barra de titulo (estilo Mac OS clasico)
const titleStripes = 'repeating-linear-gradient(#c8c8c8, #c8c8c8 1px, #e8e8e8 1px, #e8e8e8 3px)'
// Sutil textura de escritorio
const deskDots = 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)'

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
  onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void
  initialProduct?: Product | null
}

export default function DesktopTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })

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
  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { menus: ['Archivo', 'Edicion', 'Ver', 'Tienda'], catalog: 'Catalogo', icons: ['Ofertas', 'Novedades', 'Carrito'], items: 'Articulos' },
    en: { menus: ['File', 'Edit', 'View', 'Store'], catalog: 'Catalog', icons: ['Deals', 'New', 'Cart'], items: 'Items' },
    pt: { menus: ['Arquivo', 'Editar', 'Ver', 'Loja'], catalog: 'Catalogo', icons: ['Ofertas', 'Novidades', 'Carrinho'], items: 'Itens' },
  }[lang]
  const clock = new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-ES', { hour: '2-digit', minute: '2-digit' })

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onProductView?.(product)
  }

  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => {
    addItem(product, extras)
    onCartAdd?.(product)
  }

  return (
    <ThemeProvider theme={desktopTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;500;700&family=Pixelify+Sans:wght@500;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: deskTeal, backgroundImage: deskDots, backgroundSize: '16px 16px', fontFamily: desktopTheme.fonts.body, color: osInk }}>
        <AnnouncementBar />

        {/* Barra de menu (es <header> para que el carousel mida su alto) */}
        <header className="sticky top-0 z-50" style={{ backgroundColor: '#F2F2F2', borderBottom: `2px solid ${osInk}` }}>
          <div className="px-3 h-8 flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-3 min-w-0">
              {headerLogo
                ? <img src={headerLogo} alt={store.name} className={logoClassName} />
                : <span className="w-4 h-4 inline-block" style={{ backgroundColor: osBlue }} />}
              {showName && <span className="font-bold truncate" style={{ fontFamily: pixel }}>{store.name}</span>}
              <nav className="hidden md:flex items-center gap-3 ml-2" style={{ color: '#333' }}>
                {L.menus.map(m => <span key={m} className="cursor-default hover:bg-black hover:text-white px-1">{m}</span>)}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 transition-colors hover:bg-black hover:text-white"
                style={{ border: `1.5px solid ${osInk}` }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="font-semibold">{totalItems}</span>
              </button>
              <span className="hidden sm:inline tabular-nums" style={{ fontFamily: pixel }}>{clock}</span>
            </div>
          </div>
        </header>

        {/* Categorias como barra de herramientas (hermano del header => sticky flush) */}
        <CategoryCarousel
          categories={categories}
          activeCategory={activeFilters.categoryId}
          onCategoryChange={(id) => setFilter('categoryId', id)}
          products={products}
          onSelectProduct={handleSelectProduct}
          stickyTop="top-8"
        />

        {/* Escritorio + ventana */}
        <div className="relative px-3 sm:px-5 py-6 md:py-10">
          {/* Iconos de escritorio (decorativos) */}
          <div className="hidden lg:flex flex-col gap-5 absolute left-4 top-8 select-none">
            {L.icons.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1 w-16 text-center">
                <div className="w-12 h-10 relative" style={{ filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.25))' }}>
                  <div className="absolute inset-x-0 bottom-0 h-8 border-2" style={{ backgroundColor: i === 2 ? '#F4C430' : '#EBD27A', borderColor: osInk }} />
                  <div className="absolute left-0 top-0 w-7 h-3 border-2 border-b-0" style={{ backgroundColor: i === 2 ? '#F4C430' : '#EBD27A', borderColor: osInk }} />
                </div>
                <span className="text-[11px] px-1 text-white" style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.4)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Ventana del catalogo */}
          <div className="max-w-5xl mx-auto" style={{ border: `2px solid ${osInk}`, boxShadow: desktopTheme.shadows.lg, backgroundColor: '#fff' }}>
            {/* Barra de titulo a rayas */}
            <div className="flex items-center h-7 px-2 border-b-2" style={{ background: titleStripes, borderColor: osInk }}>
              <span className="w-3.5 h-3.5 border-2 bg-white" style={{ borderColor: osInk }} aria-hidden />
              <span className="mx-auto px-3 text-xs font-bold" style={{ backgroundColor: '#e8e8e8', fontFamily: pixel }}>
                {store.name} — {L.catalog}
              </span>
              <span className="w-3.5 h-3.5 border-2 bg-white relative" style={{ borderColor: osInk }} aria-hidden>
                <span className="absolute inset-[2px] border" style={{ borderColor: osInk }} />
              </span>
            </div>

            {/* Contenido de la ventana */}
            <div className="p-4 sm:p-6">
              {/* Hero */}
              {hasHero && (
                <div className="mb-5 overflow-hidden" style={{ border: `2px solid ${osInk}` }}>
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full max-h-[320px] object-cover" />
                </div>
              )}
              {!hasHero && (
                <div className="mb-5 text-center py-8 border-2 border-dashed" style={{ borderColor: desktopTheme.colors.border }}>
                  <h1 className="text-3xl md:text-5xl font-bold" style={{ fontFamily: pixel }}>{store.name}</h1>
                  {store.about?.slogan && <p className="mt-2 text-sm" style={{ color: desktopTheme.colors.textMuted }}>{store.about.slogan}</p>}
                </div>
              )}

              <TrustBar />
              <FlashSaleBar />

              {/* Toolbar de filtros */}
              <div className="flex flex-wrap items-center justify-between gap-3 my-4 p-2" style={{ border: `1.5px solid ${desktopTheme.colors.border}`, backgroundColor: '#F6F6F6' }}>
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
                    text: osInk,
                    textMuted: desktopTheme.colors.textMuted,
                    border: osInk,
                    background: '#fff',
                    primary: osBlue,
                    surface: desktopTheme.colors.surfaceHover,
                  }}
                />
                <SortDropdown
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  language={store.language}
                  colors={{ text: osInk, border: osInk, background: '#fff', primary: osBlue }}
                  className="ml-auto"
                />
              </div>

              <ProductGrid
                products={filteredProducts}
                onSelectProduct={handleSelectProduct}
                onQuickAdd={handleAddToCart}
                categories={categories}
              />

              {/* Barra de estado de la ventana */}
              <div className="mt-5 px-2 py-1 text-[11px] flex items-center justify-between" style={{ borderTop: `1.5px solid ${desktopTheme.colors.border}`, color: desktopTheme.colors.textMuted }}>
                <span>{filteredProducts.length} {L.items.toLowerCase()}</span>
                <span style={{ fontFamily: pixel }}>{store.subdomain ? `${store.subdomain}.shopifree.app` : 'shopifree'}</span>
              </div>
            </div>
          </div>
        </div>

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
