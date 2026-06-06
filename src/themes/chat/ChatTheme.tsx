/**
 * CHAT THEME - "CONVERSACION CON LA TIENDA"
 *
 * Filosofia: toda la vitrina ES un chat con la tienda (DNA de Shopifree:
 * venta por WhatsApp). El cliente "habla" con el negocio.
 * - Fondo wallpaper de chat, burbujas entrantes (tienda) y salientes (acento)
 * - Header tipo chat: avatar + nombre + "en linea" + "responde al instante"
 * - Saludo en burbuja, indicador "escribiendo...", catalogo "compartido"
 * - Categorias como respuestas rapidas, barra de input decorativa al pie
 * - Ideal para: cualquier tienda; brilla en negocios conversacionales
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
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

const wallpaper = '#E7E2DA'
const ink = '#1F2A30'
const teal = '#0FA98F'
const bubbleOut = '#D7F2EC'

const chatTheme: ThemeConfig = {
  colors: {
    background: wallpaper,
    surface: '#FFFFFF',
    surfaceHover: '#F1EFEA',
    text: ink,
    textMuted: '#6B7A80',
    textInverted: '#FFFFFF',
    primary: teal,
    primaryHover: '#0E9580',
    accent: teal,
    border: '#D8D2C8',
    badge: teal,
    badgeText: '#FFFFFF',
  },
  radius: {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 1.5px rgba(0,0,0,0.10)',
    md: '0 2px 6px rgba(0,0,0,0.10)',
    lg: '0 12px 28px rgba(0,0,0,0.14)',
  },
  effects: {
    cardHover: 'translateY(-3px)',
    buttonHover: 'scale-105',
    headerBlur: false,
    darkMode: false,
  },
}

// Patron sutil de "wallpaper" de chat (puntos tenues)
const wallpaperPattern =
  'radial-gradient(circle at 25% 15%, rgba(15,169,143,0.05) 0 2px, transparent 2px),' +
  'radial-gradient(circle at 75% 65%, rgba(31,42,48,0.04) 0 2px, transparent 2px)'

// Burbuja entrante (de la tienda). A nivel de modulo para no recrearla en cada render.
function InBubble({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-block px-4 py-2.5 text-[15px] leading-snug shadow-sm"
      style={{ backgroundColor: '#fff', color: ink, borderRadius: '1.1rem', borderTopLeftRadius: '0.25rem', maxWidth: '85%' }}
    >
      {children}
    </div>
  )
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

export default function ChatTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'circle' })

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
    es: { online: 'en linea', status: 'normalmente responde al instante', today: 'HOY', hi: 'Hola! 👋', welcome: `Bienvenido a ${store.name}`, catalog: 'Aqui esta nuestro catalogo 🛍️ Toca un producto para ver mas.', input: 'Escribe un mensaje...', items: 'ARTICULOS' },
    en: { online: 'online', status: 'usually replies instantly', today: 'TODAY', hi: 'Hi there! 👋', welcome: `Welcome to ${store.name}`, catalog: "Here's our catalog 🛍️ Tap a product to see more.", input: 'Type a message...', items: 'ITEMS' },
    pt: { online: 'online', status: 'normalmente responde na hora', today: 'HOJE', hi: 'Ola! 👋', welcome: `Bem-vindo a ${store.name}`, catalog: 'Aqui esta nosso catalogo 🛍️ Toque num produto para ver mais.', input: 'Escreva uma mensagem...', items: 'ITENS' },
  }[lang]

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onProductView?.(product)
  }

  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => {
    addItem(product, extras)
    onCartAdd?.(product)
  }

  return (
    <ThemeProvider theme={chatTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ backgroundColor: wallpaper, backgroundImage: wallpaperPattern, backgroundSize: '120px 120px', fontFamily: chatTheme.fonts.body, color: ink }}>
        <AnnouncementBar />

        {/* Header tipo chat */}
        <header className="sticky top-0 z-50" style={{ backgroundColor: teal, color: '#fff' }}>
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {headerLogo
                ? <img src={headerLogo} alt={store.name} className={logoClassName} />
                : <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>{store.name.charAt(0).toUpperCase()}</div>}
              <div className="min-w-0">
                {showName && <p className="font-semibold leading-tight truncate">{store.name}</p>}
                <span className="flex items-center gap-1.5 text-[11px] opacity-90">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9DF5B4' }} />
                  {L.online} · {L.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors hover:bg-white/15"
              style={{ border: '1px solid rgba(255,255,255,0.45)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {totalItems > 0 && <span className="min-w-[18px] text-center" style={{ color: '#fff' }}>{totalItems}</span>}
            </button>
          </div>
        </header>

        {/* Categorias como "respuestas rapidas" (hermano del header => sticky flush) */}
        <CategoryCarousel
          categories={categories}
          activeCategory={activeFilters.categoryId}
          onCategoryChange={(id) => setFilter('categoryId', id)}
          products={products}
          onSelectProduct={handleSelectProduct}
          stickyTop="top-16"
        />

        {/* Conversacion */}
        <main className="max-w-3xl mx-auto px-3 sm:px-4 py-5">
          {/* Day divider */}
          <div className="flex justify-center mb-5">
            <span className="px-3 py-1 text-[11px] font-medium rounded-full shadow-sm" style={{ backgroundColor: '#FFFFFFcc', color: chatTheme.colors.textMuted }}>
              {L.today}
            </span>
          </div>

          {/* Saludo de la tienda */}
          <div className="space-y-2 mb-4">
            <InBubble><strong>{L.hi}</strong></InBubble>
            <div><InBubble>{store.about?.slogan || L.welcome}</InBubble></div>
          </div>

          {/* Hero como imagen "compartida" */}
          {hasHero && (
            <div className="mb-4">
              <div className="inline-block overflow-hidden shadow-sm" style={{ borderRadius: '1.1rem', borderTopLeftRadius: '0.25rem', maxWidth: '85%', backgroundColor: '#fff', padding: '4px' }}>
                <HeroImg src={store.heroImage || store.heroImageMobile} alt="" className="w-full max-h-[300px] object-cover" style={{ borderRadius: '0.9rem' }} />
              </div>
            </div>
          )}

          {/* Indicador "escribiendo" -> deja paso al catalogo */}
          <div className="mb-4">
            <InBubble>{L.catalog}</InBubble>
          </div>

          <TrustBar />
          <FlashSaleBar />

          {/* Barra de filtros/orden estilo chat */}
          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
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
                textMuted: chatTheme.colors.textMuted,
                border: chatTheme.colors.border,
                background: '#fff',
                primary: teal,
                surface: chatTheme.colors.surfaceHover,
              }}
            />
            <SortDropdown
              sortBy={sortBy}
              onSortChange={setSortBy}
              language={store.language}
              colors={{ text: ink, border: chatTheme.colors.border, background: '#fff', primary: teal }}
              className="ml-auto"
            />
          </div>

          {/* Catalogo: el grid va dentro del hilo, como contenido compartido */}
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
            categories={categories}
          />

          {/* Burbuja saliente (cliente) de cierre */}
          <div className="flex justify-end mt-5">
            <div
              className="inline-block px-4 py-2.5 text-[15px] shadow-sm"
              style={{ backgroundColor: bubbleOut, color: ink, borderRadius: '1.1rem', borderTopRightRadius: '0.25rem', maxWidth: '85%' }}
            >
              👀✨
            </div>
          </div>
        </main>

        {/* Barra de input decorativa (completa la ilusion de chat) */}
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-6">
          <div className="flex items-center gap-2 p-2 rounded-full shadow-sm" style={{ backgroundColor: '#fff' }}>
            <span className="flex-1 px-3 text-sm" style={{ color: chatTheme.colors.textMuted }}>{L.input}</span>
            <a
              href={store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/\D/g, '')}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onWhatsAppClick?.()}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
              style={{ backgroundColor: teal, color: '#fff' }}
              aria-label="WhatsApp"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
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
