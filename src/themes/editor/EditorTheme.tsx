/**
 * EDITOR THEME - "EDITOR DE CODIGO / IDE" (tech)
 *
 * La tienda es un editor de codigo: barra de titulo con semaforo, sidebar
 * EXPLORER con las categorias como archivos, pestanas y barra de estado.
 * El catalogo vive en el panel del editor. Distinto a Terminal (shell).
 */

import { useState } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import {
  ThemeProvider, ProductGrid, ProductDrawer, CartDrawer, CartBar, CategoryCarousel,
  WhatsAppButton, StoreFooter, CheckoutDrawer, AnnouncementBar, TrustBar, FlashSaleBar, SocialProofToast,
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'
import { useHeaderLogo } from '../shared/useHeaderLogo'
import { useProductFilters } from '../shared/useProductFilters'
import SortDropdown from '../shared/SortDropdown'
import FilterPanel from '../shared/FilterPanel'

const edBg = '#1E1E2E'
const edSide = '#181825'
const edPanel = '#11111B'
const edText = '#CDD6F4'
const edBlue = '#89B4FA'
const edGreen = '#A6E3A1'
const edPink = '#F38BA8'

const editorTheme: ThemeConfig = {
  colors: {
    background: edBg, surface: '#252537', surfaceHover: '#2E2E44', text: edText, textMuted: '#9399B2',
    textInverted: '#1E1E2E', primary: edBlue, primaryHover: '#74A0F0', accent: edGreen, border: '#313244',
    badge: edBlue, badgeText: '#1E1E2E',
  },
  radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.5rem', full: '9999px' },
  fonts: { heading: "'JetBrains Mono', ui-monospace, monospace", body: "'Inter', system-ui, sans-serif" },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.4)', md: '0 6px 18px rgba(0,0,0,0.5)', lg: '0 20px 44px rgba(0,0,0,0.55)' },
  effects: { cardHover: 'translateY(-2px)', buttonHover: 'scale-105', headerBlur: false, darkMode: true },
}

interface Props {
  store: Store; products: Product[]; categories: Category[]
  onWhatsAppClick?: () => void; onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void; initialProduct?: Product | null
}

export default function EditorTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })
  const { filteredProducts, availableFilters, activeFilters, setFilter, setVariationFilter, clearFilters, hasActiveFilters, sortBy, setSortBy } = useProductFilters(products, categories)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const lang = store.language === 'en' ? 'en' : store.language === 'pt' ? 'pt' : 'es'
  const L = {
    es: { explorer: 'EXPLORADOR', items: 'productos', cart: 'carrito', problems: 'Sin problemas', open: 'catalogo.tsx' },
    en: { explorer: 'EXPLORER', items: 'products', cart: 'cart', problems: 'No problems', open: 'catalog.tsx' },
    pt: { explorer: 'EXPLORADOR', items: 'produtos', cart: 'carrinho', problems: 'Sem problemas', open: 'catalogo.tsx' },
  }[lang]
  const files = categories.slice(0, 8)

  const handleSelectProduct = (p: Product) => { setSelectedProduct(p); onProductView?.(p) }
  const handleAddToCart = (p: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(p, extras); onCartAdd?.(p) }

  return (
    <ThemeProvider theme={editorTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ backgroundColor: edBg, fontFamily: editorTheme.fonts.body, color: edText }}>
        <AnnouncementBar />

        {/* Barra de titulo (semaforo) */}
        <header className="sticky top-0 z-50" style={{ backgroundColor: edPanel, borderBottom: `1px solid ${editorTheme.colors.border}` }}>
          <div className="px-4 h-11 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F38BA8' }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F9E2AF' }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#A6E3A1' }} />
              </span>
              {headerLogo && <img src={headerLogo} alt={store.name} className={logoClassName} />}
              {showName && <span className="truncate text-sm" style={{ fontFamily: editorTheme.fonts.heading, color: edText }}>{store.name} — {L.open}</span>}
            </div>
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-1 rounded text-xs transition-colors hover:opacity-90" style={{ backgroundColor: edBlue, color: edBg, fontFamily: editorTheme.fonts.heading }}>
              {L.cart}({totalItems})
            </button>
          </div>
        </header>

        <CategoryCarousel categories={categories} activeCategory={activeFilters.categoryId} onCategoryChange={(id) => setFilter('categoryId', id)} products={products} onSelectProduct={handleSelectProduct} stickyTop="top-11" />

        <div className="max-w-6xl mx-auto px-2 sm:px-3 py-5 md:py-8">
          <div className="flex" style={{ border: `1px solid ${editorTheme.colors.border}`, borderRadius: '0.5rem', overflow: 'hidden', boxShadow: editorTheme.shadows.lg }}>
            {/* Sidebar EXPLORER (decorativo) */}
            <aside className="hidden md:block w-48 flex-shrink-0 p-3" style={{ backgroundColor: edSide }}>
              <p className="text-[11px] tracking-widest mb-2" style={{ color: editorTheme.colors.textMuted, fontFamily: editorTheme.fonts.heading }}>{L.explorer}</p>
              <p className="text-xs mb-1" style={{ color: edText, fontFamily: editorTheme.fonts.heading }}>▾ {store.subdomain || 'store'}</p>
              <ul className="text-xs space-y-1 ml-3" style={{ fontFamily: editorTheme.fonts.heading }}>
                {files.map((c, i) => (
                  <li key={c.id} className="truncate" style={{ color: i === 0 ? edBlue : editorTheme.colors.textMuted }}>
                    <span style={{ color: edPink }}>{'</>'}</span> {c.name.toLowerCase().replace(/\s+/g, '-')}.tsx
                  </li>
                ))}
                <li className="truncate" style={{ color: edGreen }}><span style={{ color: edGreen }}>◆</span> {L.open}</li>
              </ul>
            </aside>

            {/* Panel del editor */}
            <div className="flex-1 min-w-0" style={{ backgroundColor: edBg }}>
              {/* Pestana */}
              <div className="flex items-center gap-2 px-3 h-9 text-xs border-b" style={{ borderColor: editorTheme.colors.border, backgroundColor: edPanel, fontFamily: editorTheme.fonts.heading }}>
                <span className="px-2 py-1 rounded-t" style={{ backgroundColor: edBg, color: edText }}>◆ {L.open}</span>
                <span style={{ color: editorTheme.colors.textMuted }}>{filteredProducts.length} {L.items}</span>
              </div>
              <div className="p-3 sm:p-4">
                {store.about?.slogan && (
                  <p className="text-sm mb-4" style={{ color: editorTheme.colors.textMuted, fontFamily: editorTheme.fonts.heading }}>
                    <span style={{ color: edPink }}>const</span> <span style={{ color: edBlue }}>store</span> = <span style={{ color: edGreen }}>&quot;{store.about.slogan}&quot;</span>
                  </p>
                )}
                <TrustBar />
                <FlashSaleBar />
                <div className="flex flex-wrap items-center justify-between gap-3 my-4">
                  <FilterPanel availableFilters={availableFilters} activeFilters={activeFilters} onFilterChange={setFilter} onVariationChange={setVariationFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} language={store.language} currency={store.currency}
                    colors={{ text: edText, textMuted: editorTheme.colors.textMuted, border: editorTheme.colors.border, background: editorTheme.colors.surface, primary: edBlue, surface: editorTheme.colors.surfaceHover }} />
                  <SortDropdown sortBy={sortBy} onSortChange={setSortBy} language={store.language} colors={{ text: edText, border: editorTheme.colors.border, background: editorTheme.colors.surface, primary: edBlue }} className="ml-auto" />
                </div>
                <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} onQuickAdd={handleAddToCart} categories={categories} />
              </div>
            </div>
          </div>
          {/* Barra de estado */}
          <div className="flex items-center justify-between px-3 py-1 mt-2 text-[11px] rounded" style={{ backgroundColor: edBlue, color: edBg, fontFamily: editorTheme.fonts.heading }}>
            <span>⎇ main ● {L.problems}</span>
            <span>UTF-8 · TSX · {filteredProducts.length} {L.items}</span>
          </div>
        </div>

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
