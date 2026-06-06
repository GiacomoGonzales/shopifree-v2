/**
 * RECEIPT THEME - "TICKET DE COMPRA"
 *
 * Filosofia: toda la tienda ES un recibo termico de caja.
 * - Papel blanco con borde dentado (perforado) sobre un escritorio kraft
 * - Tipografia 100% monoespaciada, lineas punteadas como separadores
 * - Sello rojo, meta-linea de caja, codigo de barras + "GRACIAS" al pie
 * - Concepto puro de comercio: el catalogo se imprime como ticket
 * - Ideal para: cualquier tienda que quiera algo memorable y distinto
 */

import { useState } from 'react'
import type { CSSProperties } from 'react'
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

const desk = '#DDD7CB'
const ink = '#1A1A1A'
const stampRed = '#C0362C'
const mono = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace"

const receiptTheme: ThemeConfig = {
  colors: {
    background: desk,
    surface: '#FFFFFF',
    surfaceHover: '#F4F2EC',
    text: ink,
    textMuted: '#7A766C',
    textInverted: '#FFFFFF',
    primary: ink,
    primaryHover: '#000000',
    accent: stampRed,
    border: '#D7D2C6',
    badge: ink,
    badgeText: '#FFFFFF',
  },
  radius: {
    sm: '0.125rem',
    md: '0.125rem',
    lg: '0.25rem',
    xl: '0.25rem',
    full: '9999px',
  },
  fonts: {
    heading: mono,
    body: mono,
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.06)',
    md: '0 2px 6px rgba(0,0,0,0.10)',
    lg: '0 14px 30px rgba(0,0,0,0.18)',
  },
  effects: {
    cardHover: 'translateY(-2px)',
    buttonHover: 'scale-105',
    headerBlur: false,
    darkMode: false,
  },
}

// Borde dentado (perforacion) arriba/abajo del papel
const sawTop: CSSProperties = {
  height: '12px',
  backgroundImage: 'linear-gradient(45deg, #ffffff 6px, transparent 0), linear-gradient(-45deg, #ffffff 6px, transparent 0)',
  backgroundSize: '12px 12px',
  backgroundRepeat: 'repeat-x',
  backgroundPosition: 'left top',
}
const sawBottom: CSSProperties = {
  height: '12px',
  backgroundImage: 'linear-gradient(-135deg, #ffffff 6px, transparent 0), linear-gradient(135deg, #ffffff 6px, transparent 0)',
  backgroundSize: '12px 12px',
  backgroundRepeat: 'repeat-x',
  backgroundPosition: 'left bottom',
}

const dashed: CSSProperties = {
  borderTop: `1.5px dashed ${ink}`,
  opacity: 0.35,
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

export default function ReceiptTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
    es: { collection: 'DETALLE DEL PEDIDO', thanks: 'GRACIAS POR TU VISITA', cashier: 'CAJA: WEB', items: 'ARTICULOS' },
    en: { collection: 'ORDER DETAILS', thanks: 'THANKS FOR VISITING', cashier: 'REGISTER: WEB', items: 'ITEMS' },
    pt: { collection: 'DETALHE DO PEDIDO', thanks: 'OBRIGADO PELA VISITA', cashier: 'CAIXA: WEB', items: 'ITENS' },
  }[lang]
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-ES')

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onProductView?.(product)
  }

  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => {
    addItem(product, extras)
    onCartAdd?.(product)
  }

  return (
    <ThemeProvider theme={receiptTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: desk, fontFamily: mono, color: ink }}>
        <AnnouncementBar />

        {/* Header sticky (barra de caja) */}
        <header className="sticky top-0 z-50" style={{ backgroundColor: ink, color: '#fff' }}>
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between text-xs tracking-widest">
            <div className="flex items-center gap-2 uppercase">
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span style={{ fontWeight: 700 }}>{store.name}</span>}
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-3 py-1 uppercase tracking-widest transition-colors hover:bg-white/15"
              style={{ border: '1px solid rgba(255,255,255,0.4)' }}
            >
              <span>{L.items}</span>
              <span style={{ backgroundColor: stampRed, padding: '0 6px', borderRadius: 2 }}>{totalItems}</span>
            </button>
          </div>
        </header>

        {/* Nav de categorias: hermano directo del header (asi mide su altura)
            y full-width para quedar pegado bajo el, sin gap al hacer scroll. */}
        <CategoryCarousel
          categories={categories}
          activeCategory={activeFilters.categoryId}
          onCategoryChange={(id) => setFilter('categoryId', id)}
          products={products}
          onSelectProduct={handleSelectProduct}
          stickyTop="top-12"
        />

        {/* PAPEL: todo el catalogo impreso como ticket */}
        <div className="px-3 sm:px-4 py-6 md:py-10">
          <div className="max-w-5xl mx-auto">
            <div style={sawTop} />
            <div style={{ backgroundColor: '#fff', boxShadow: receiptTheme.shadows.lg }}>
              <div className="px-5 sm:px-8 md:px-12 py-8">

                {/* Encabezado del ticket */}
                <div className="text-center relative">
                  <div
                    className="absolute right-0 top-0 hidden sm:block text-[10px] font-bold px-2 py-1 uppercase tracking-widest -rotate-6"
                    style={{ color: stampRed, border: `2px solid ${stampRed}`, borderRadius: 3 }}
                  >
                    ★ {today} ★
                  </div>
                  <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-[0.2em]">{store.name}</h1>
                  {store.about?.slogan && (
                    <p className="mt-2 text-xs md:text-sm uppercase tracking-widest" style={{ color: receiptTheme.colors.textMuted }}>
                      {store.about.slogan}
                    </p>
                  )}
                  <p className="mt-3 text-[11px] tracking-widest" style={{ color: receiptTheme.colors.textMuted }}>
                    {today} &nbsp;·&nbsp; {L.cashier}
                  </p>
                </div>

                <div className="my-6" style={dashed} />

                {/* Hero opcional */}
                {hasHero && (
                  <>
                    <div className="overflow-hidden" style={{ border: `1px solid ${receiptTheme.colors.border}` }}>
                      <HeroImg
                        src={store.heroImage || store.heroImageMobile}
                        alt=""
                        className="w-full max-h-[360px] object-cover grayscale-[15%]"
                      />
                    </div>
                    <div className="my-6" style={dashed} />
                  </>
                )}

                {/* Etiqueta de seccion */}
                <p className="text-center text-sm font-bold uppercase tracking-[0.3em] mb-1">{L.collection}</p>
                <p className="text-center text-[11px] mb-5" style={{ color: receiptTheme.colors.textMuted }}>
                  {'>'} {filteredProducts.length} {L.items.toLowerCase()}
                </p>

                <TrustBar />
                <FlashSaleBar />

                <div className="flex flex-wrap items-center justify-between gap-3 my-5">
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
                      text: ink,
                      textMuted: receiptTheme.colors.textMuted,
                      border: ink,
                      background: '#fff',
                      primary: ink,
                      surface: receiptTheme.colors.surfaceHover,
                    }}
                  />
                  <SortDropdown
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    language={store.language}
                    colors={{ text: ink, border: ink, background: '#fff', primary: ink }}
                    className="ml-auto"
                  />
                </div>

                <ProductGrid
                  products={filteredProducts}
                  onSelectProduct={handleSelectProduct}
                  onQuickAdd={handleAddToCart}
                  categories={categories}
                />

                {/* Pie del ticket: total + codigo de barras + gracias */}
                <div className="my-6" style={dashed} />
                <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest">
                  <span>{L.items}</span>
                  <span>{filteredProducts.length}</span>
                </div>
                <div className="my-6" style={dashed} />

                <p className="text-center text-base md:text-lg font-bold uppercase tracking-[0.25em] my-5">
                  *** {L.thanks} ***
                </p>

                {/* Codigo de barras falso */}
                <div className="flex items-end justify-center gap-[2px] h-12 mb-2" aria-hidden>
                  {Array.from({ length: 56 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i % 5 === 0 ? '3px' : i % 3 === 0 ? '2px' : '1px',
                        height: '100%',
                        backgroundColor: ink,
                      }}
                    />
                  ))}
                </div>
                <p className="text-center text-[11px] tracking-[0.3em]" style={{ color: receiptTheme.colors.textMuted }}>
                  {store.subdomain ? store.subdomain.toUpperCase() : store.name.toUpperCase()}
                </p>
              </div>
            </div>
            <div style={sawBottom} />
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
