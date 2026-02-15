/**
 * AURA THEME - "COSMETICS SUAVE"
 *
 * Filosofia: Suave, delicado, lavanda.
 * - Paleta: Violeta sobre lavanda claro
 * - Tipografia: Tenor Sans (heading) + DM Sans (body)
 * - Bordes grandes y suaves
 * - Sombras con tinte violeta
 * - Ideal para: Cosmeticos, skincare, aromaterapia, spa
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

// Aura colors
const violet = '#8B5CF6'
const violetHover = '#7C3AED'
const lavender = '#FAF5FF'
const softLavender = '#F3E8FF'
const plum = '#6D28D9'
const darkText = '#1E1033'
const mutedText = '#7C6F94'
const white = '#FFFFFF'

// Aura theme configuration - soft lavender cosmetics
const auraTheme: ThemeConfig = {
  colors: {
    background: lavender,
    surface: white,
    surfaceHover: softLavender,
    text: darkText,
    textMuted: mutedText,
    textInverted: white,
    primary: violet,
    primaryHover: violetHover,
    accent: plum,
    border: '#E9D5FF',
    badge: violet,
    badgeText: white,
  },
  radius: {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Tenor Sans', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(139 92 246 / 0.06)',
    md: '0 4px 12px -2px rgb(139 92 246 / 0.1)',
    lg: '0 20px 40px -8px rgb(139 92 246 / 0.15)',
  },
  effects: {
    cardHover: 'scale-105',
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
}

export default function AuraTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
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

  // Sparkle/drop icon
  const AuraIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2zM12 6.24l1.39 4.17.2.59.59.2L18.35 12.6l-4.17 1.39-.59.2-.2.59L12 18.95l-1.39-4.17-.2-.59-.59-.2L5.65 12.6l4.17-1.39.59-.2.2-.59L12 6.24z"/>
    </svg>
  )

  return (
    <ThemeProvider theme={auraTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: lavender }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Tenor+Sans&family=DM+Sans:wght@300;400;500;600&display=swap');
          .font-aura { font-family: 'Tenor Sans', Georgia, serif; }
          .font-aura-body { font-family: 'DM Sans', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />



        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-5'}`}
          style={{
            backgroundColor: scrolled ? `${white}f8` : white,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#E9D5FF' : 'transparent'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: softLavender }}
                >
                  <AuraIcon className="w-6 h-6" style={{ color: violet }} />
                </div>
              )}
              <div>
                <h1 className="font-aura text-2xl md:text-3xl tracking-wide" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs tracking-[0.12em] uppercase mt-0.5 font-aura-body" style={{ color: violet }}>
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
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: softLavender }}
              >
                <svg className="w-5 h-5" style={{ color: violet }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 text-xs font-medium flex items-center justify-center rounded-full animate-scaleIn font-aura-body"
                  style={{ backgroundColor: violet, color: white }}
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
              <div className="md:hidden relative max-h-[450px] overflow-hidden">
                <img
                  src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                  alt=""
                  className="w-full h-auto max-h-[450px] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${lavender} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                  <h2 className="font-aura text-3xl tracking-wide" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.1em] uppercase mt-2 font-aura-body" style={{ color: mutedText }}>
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
                  style={{ background: `linear-gradient(to top, ${lavender} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-16 text-center">
                  <h2 className="font-aura text-5xl lg:text-6xl tracking-wide" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm tracking-[0.2em] uppercase mt-4 font-aura-body" style={{ color: mutedText }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Soft Aura Fallback */
            <div className="py-20 md:py-28 text-center relative overflow-hidden" style={{ backgroundColor: softLavender }}>
              {/* Decorative sparkles */}
              <div className="absolute inset-0 overflow-hidden opacity-10">
                <div className="absolute top-12 left-16">
                  <AuraIcon className="w-16 h-16" style={{ color: violet }} />
                </div>
                <div className="absolute bottom-16 right-12">
                  <AuraIcon className="w-20 h-20" style={{ color: plum }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                <div className="flex items-center justify-center gap-6 mb-8">
                  <div className="w-16 h-px" style={{ backgroundColor: `${violet}40` }} />
                  <AuraIcon className="w-5 h-5" style={{ color: violet }} />
                  <div className="w-16 h-px" style={{ backgroundColor: `${violet}40` }} />
                </div>

                <h1 className="font-aura text-5xl md:text-7xl tracking-wide" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="text-sm tracking-[0.2em] uppercase mt-6 font-aura-body" style={{ color: mutedText }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-aura-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: `${darkText}88` }}>
                    {store.about.description}
                  </p>
                )}

                <div className="flex items-center justify-center gap-6 mt-10">
                  <div className="w-16 h-px" style={{ backgroundColor: `${violet}40` }} />
                  <AuraIcon className="w-5 h-5" style={{ color: violet }} />
                  <div className="w-16 h-px" style={{ backgroundColor: `${violet}40` }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Collection Title */}
        <div className="py-10 text-center" style={{ backgroundColor: lavender }}>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-px" style={{ backgroundColor: `${violet}40` }} />
            <p className="font-aura text-sm tracking-[0.3em] uppercase" style={{ color: violet }}>
              {lang === 'en' ? 'Collection' : lang === 'pt' ? 'Colecao' : 'Coleccion'}
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: `${violet}40` }} />
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: lavender }}>
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
