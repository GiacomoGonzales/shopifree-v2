/**
 * TOYLAND THEME - "MUNDO DE JUEGOS"
 *
 * Filosofia: Divertido, colorido, infantil.
 * - Paleta: Amarillo, turquesa, coral, colores primarios
 * - Tipografia: Rounded, bold, juvenil
 * - Layout jugueton con bordes redondeados
 * - Transiciones alegres y rebotantes
 * - Ideal para: Jugueterias, ropa de bebe, articulos infantiles
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
  CheckoutDrawer,
  AnnouncementBar,
  TrustBar,
  FlashSaleBar,
  SocialProofToast,
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

// Toyland colors
const yellow = '#FDE047'
// reserved: warmYellow '#FACC15'
const turquoise = '#06B6D4'
const deepTurquoise = '#0891B2'
const coral = '#FB7185'
// reserved: deepCoral '#F43F5E'
const lavender = '#A78BFA'
const white = '#FFFFFF'
const softWhite = '#FEFCE8'
const darkText = '#1E1B4B'
// reserved: mutedText '#6366F1'

// Toyland theme configuration
const toylandTheme: ThemeConfig = {
  colors: {
    background: softWhite,
    surface: white,
    surfaceHover: '#FEF9C3',
    text: darkText,
    textMuted: '#64748B',
    textInverted: white,
    primary: turquoise,
    primaryHover: deepTurquoise,
    accent: coral,
    border: '#E0E7FF',
    badge: coral,
    badgeText: white,
  },
  radius: {
    sm: '1rem',
    md: '1.25rem',
    lg: '1.5rem',
    xl: '2rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Nunito', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 8px 0 rgb(99 102 241 / 0.08)',
    md: '0 4px 16px -2px rgb(99 102 241 / 0.12)',
    lg: '0 20px 40px -8px rgb(99 102 241 / 0.15)',
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
  initialProduct?: Product | null
}

export default function ToylandTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const lang = (store.language as 'es' | 'en' | 'pt') || 'es'

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

  // Star icon
  const StarIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )

  // Toy block icon
  const BlockIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H9V5h6v2z" />
    </svg>
  )

  return (
    <ThemeProvider theme={toylandTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: softWhite }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
          .font-toyland { font-family: 'Nunito', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${white}f5` : white,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `3px solid ${turquoise}` : '3px solid transparent'
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
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: yellow }}
                >
                  <BlockIcon className="w-7 h-7" style={{ color: darkText }} />
                </div>
              )}
              <div>
                <h1 className="font-toyland text-2xl md:text-3xl font-extrabold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-bold font-toyland" style={{ color: turquoise }}>
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
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ backgroundColor: turquoise }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-extrabold flex items-center justify-center rounded-full animate-scaleIn font-toyland"
                  style={{ backgroundColor: coral, color: white }}
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
                  style={{ background: `linear-gradient(to top, ${softWhite} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-toyland text-3xl font-extrabold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-toyland font-bold mt-1" style={{ color: turquoise }}>
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
                  style={{ background: `linear-gradient(to top, ${softWhite} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-toyland text-5xl lg:text-6xl font-extrabold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-toyland text-xl font-bold mt-2" style={{ color: turquoise }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Playful Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${yellow}30 0%, ${turquoise}15 50%, ${coral}20 100%)`
              }}
            >
              {/* Decorative shapes */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-6 left-8 opacity-10">
                  <StarIcon className="w-20 h-20 rotate-12" style={{ color: coral }} />
                </div>
                <div className="absolute top-16 right-12 opacity-10">
                  <BlockIcon className="w-16 h-16 -rotate-12" style={{ color: turquoise }} />
                </div>
                <div className="absolute bottom-8 left-1/4 opacity-10">
                  <StarIcon className="w-24 h-24 rotate-[-20deg]" style={{ color: yellow }} />
                </div>
                <div className="absolute bottom-12 right-1/4 opacity-10">
                  <div className="w-16 h-16 rounded-full" style={{ backgroundColor: lavender }} />
                </div>
                <div className="absolute top-1/2 left-12 opacity-10">
                  <div className="w-10 h-10 rounded-lg rotate-45" style={{ backgroundColor: coral }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-extrabold mb-6 font-toyland"
                  style={{ backgroundColor: coral, color: white }}
                >
                  <StarIcon className="w-4 h-4" />
                  {lang === 'en' ? 'Fun for Everyone!' : lang === 'pt' ? 'Diversao para Todos!' : 'Diversion para Todos!'}
                </div>

                <h1 className="font-toyland text-4xl md:text-6xl font-extrabold" style={{ color: darkText }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-lg md:text-xl font-bold mt-4 font-toyland" style={{ color: turquoise }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-toyland text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: '#64748B' }}>
                    {store.about.description}
                  </p>
                )}

                {/* Decorative colored dots */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: coral }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: yellow }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: turquoise }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: lavender }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: coral }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: softWhite }}>
          <div className="flex items-center justify-center gap-3">
            <StarIcon className="w-5 h-5" style={{ color: yellow }} />
            <p className="font-toyland text-sm font-extrabold tracking-wider uppercase" style={{ color: turquoise }}>
              {lang === 'en' ? 'Our Products' : lang === 'pt' ? 'Nossos Produtos' : 'Nuestros Productos'}
            </p>
            <StarIcon className="w-5 h-5" style={{ color: yellow }} />
          </div>
        </div>


        <TrustBar />
        <FlashSaleBar />

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: softWhite }}>
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
        <SocialProofToast />


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
