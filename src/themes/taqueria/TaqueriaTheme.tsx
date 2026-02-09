/**
 * TAQUERIA THEME - "SABOR MEXICANO"
 *
 * Filosofia: Vibrante, festivo, autentico.
 * - Paleta: Amarillo mostaza, verde limon, naranja, fondo crema
 * - Tipografia: Bold, divertida, redondeada
 * - Layout festivo con patrones sutiles
 * - Transiciones energicas
 * - Ideal para: Taquerias, comida mexicana, food trucks, antojitos
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

// Taqueria colors
const mustard = '#E6A623'
const lime = '#84CC16'
const orange = '#F97316'
const cream = '#FFFBEB'
const darkBrown = '#451A03'
const terracotta = '#C2410C'

// Taqueria theme configuration
const taqueriaTheme: ThemeConfig = {
  colors: {
    background: cream,
    surface: '#ffffff',
    surfaceHover: '#FEF3C7',
    text: darkBrown,
    textMuted: '#92400E',
    textInverted: '#ffffff',
    primary: orange,
    primaryHover: terracotta,
    accent: lime,
    border: '#FDE68A',
    badge: mustard,
    badgeText: darkBrown,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Fredoka', 'Nunito', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.15)',
    lg: '0 20px 40px -8px rgb(0 0 0 / 0.2)',
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

export default function TaqueriaTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const lang = (store.language as 'es' | 'en' | 'pt') || 'es'

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

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
    <ThemeProvider theme={taqueriaTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: cream }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap');
          .font-taqueria { font-family: 'Fredoka', 'Nunito', system-ui, sans-serif; }
          .font-taqueria-body { font-family: 'Nunito', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm font-bold font-taqueria animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || orange,
              color: store.announcement?.textColor || '#ffffff'
            }}
          >
            <span className="mr-2">🌮</span>
            {store.announcement?.link ? (
              <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {store.announcement.text}
              </a>
            ) : (
              <span>{store.announcement?.text}</span>
            )}
            <span className="ml-2">🌮</span>
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${cream}f5` : cream,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `3px solid ${mustard}` : '3px solid transparent'
          }}
        >
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: mustard }}
                >
                  🌮
                </div>
              )}
              <div>
                <h1 className="font-taqueria text-2xl md:text-3xl font-bold" style={{ color: darkBrown }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-taqueria-body font-semibold" style={{ color: orange }}>
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
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ backgroundColor: orange }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn"
                  style={{ backgroundColor: lime, color: darkBrown }}
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
                  style={{ background: `linear-gradient(to top, ${cream} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-taqueria text-3xl font-bold" style={{ color: darkBrown }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-taqueria-body font-semibold mt-1" style={{ color: orange }}>
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
                  style={{ background: `linear-gradient(to top, ${cream} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-taqueria text-5xl lg:text-6xl font-bold" style={{ color: darkBrown }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-taqueria-body text-xl font-semibold mt-2" style={{ color: orange }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Festive Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${orange.slice(1)}' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Decorative elements */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className="text-4xl">🌶️</span>
                  <div className="w-16 h-1 rounded-full" style={{ backgroundColor: mustard }} />
                  <span className="text-4xl">🌮</span>
                  <div className="w-16 h-1 rounded-full" style={{ backgroundColor: mustard }} />
                  <span className="text-4xl">🌶️</span>
                </div>

                <h1 className="font-taqueria text-5xl md:text-7xl font-bold" style={{ color: darkBrown }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="font-taqueria-body text-xl font-semibold mt-4" style={{ color: orange }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-taqueria-body text-base max-w-xl mx-auto mt-4 leading-relaxed" style={{ color: `${darkBrown}cc` }}>
                    {store.about.description}
                  </p>
                )}

                {/* Bottom decoration */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  <span className="text-3xl">🥑</span>
                  <span className="text-3xl">🍋</span>
                  <span className="text-3xl">🧅</span>
                  <span className="text-3xl">🍅</span>
                  <span className="text-3xl">🫑</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Menu Title */}
        <div className="py-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full" style={{ backgroundColor: mustard }}>
            <span className="text-xl">🔥</span>
            <p className="font-taqueria text-lg font-bold" style={{ color: darkBrown }}>
              {lang === 'en' ? 'Our Menu' : lang === 'pt' ? 'Nosso Cardapio' : 'Nuestro Menu'}
            </p>
            <span className="text-xl">🔥</span>
          </div>
        </div>

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
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
