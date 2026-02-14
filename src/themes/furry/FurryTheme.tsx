/**
 * FURRY THEME - "PETS JUGUETON"
 *
 * Filosofia: Jugueton, vibrante, amigable.
 * - Paleta: Teal con rosa sobre mint
 * - Tipografia: Baloo 2 (heading) + Nunito (body)
 * - Bordes grandes y amigables
 * - Sombras con tinte teal
 * - Ideal para: Veterinarias, grooming, accesorios de mascotas, alimento premium
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

// Furry colors
const teal = '#0D9488'
const tealHover = '#0F766E'
const pink = '#EC4899'
const mint = '#F0FDFA'
const softMint = '#CCFBF1'
const darkText = '#134E4A'
const mutedText = '#5E8B87'
const white = '#FFFFFF'

// Furry theme configuration - playful pets
const furryTheme: ThemeConfig = {
  colors: {
    background: mint,
    surface: white,
    surfaceHover: softMint,
    text: darkText,
    textMuted: mutedText,
    textInverted: white,
    primary: teal,
    primaryHover: tealHover,
    accent: pink,
    border: '#99F6E4',
    badge: pink,
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
    heading: "'Baloo 2', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(13 148 136 / 0.08)',
    md: '0 4px 12px -2px rgb(13 148 136 / 0.12)',
    lg: '0 20px 40px -8px rgb(13 148 136 / 0.18)',
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

export default function FurryTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Paw print icon
  const PawIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m4 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m-8 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m4 8c-2.5 0-4.5 1.5-4.5 3.5 0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2 0-2-2-3.5-4.5-3.5"/>
    </svg>
  )

  // Bone icon
  const BoneIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 7c0-1.1-.45-2.1-1.17-2.83S17.1 3 16 3s-2.1.45-2.83 1.17C12.45 4.9 12 5.9 12 7c0 .83.25 1.58.67 2.22L9.56 12.33c-.64-.42-1.39-.67-2.22-.67-1.1 0-2.1.45-2.83 1.17C3.79 13.56 3.34 14.56 3.34 15.66s.45 2.1 1.17 2.83c.73.72 1.73 1.17 2.83 1.17s2.1-.45 2.83-1.17c.72-.73 1.17-1.73 1.17-2.83 0-.83-.25-1.58-.67-2.22l3.11-3.11c.64.42 1.39.67 2.22.67 1.1 0 2.1-.45 2.83-1.17C19.55 9.1 20 8.1 20 7z"/>
    </svg>
  )

  return (
    <ThemeProvider theme={furryTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: mint }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700&display=swap');
          .font-furry { font-family: 'Baloo 2', system-ui, sans-serif; }
          .font-furry-body { font-family: 'Nunito', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm font-semibold font-furry-body animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || pink,
              color: store.announcement?.textColor || white
            }}
          >
            {store.announcement?.link ? (
              <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {store.announcement.text}
              </a>
            ) : (
              <span>{store.announcement?.text}</span>
            )}
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
            backgroundColor: scrolled ? `${white}f8` : white,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `3px solid ${teal}` : '3px solid transparent'
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
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: softMint }}
                >
                  <PawIcon className="w-7 h-7" style={{ color: teal }} />
                </div>
              )}
              <div>
                <h1 className="font-furry text-2xl md:text-3xl font-bold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-semibold font-furry-body" style={{ color: pink }}>
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
                style={{ backgroundColor: pink }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn font-furry-body"
                  style={{ backgroundColor: teal, color: white }}
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
                  style={{ background: `linear-gradient(to top, ${mint} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-furry text-3xl font-bold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-furry-body font-semibold mt-1" style={{ color: pink }}>
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
                  style={{ background: `linear-gradient(to top, ${mint} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-furry text-5xl lg:text-6xl font-bold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-furry-body text-xl font-semibold mt-2" style={{ color: pink }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Playful Furry Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: softMint }}>
              {/* Decorative paws and bones */}
              <div className="absolute inset-0 overflow-hidden opacity-10">
                <div className="absolute top-8 left-8 rotate-[-15deg]">
                  <PawIcon className="w-20 h-20" style={{ color: teal }} />
                </div>
                <div className="absolute top-16 right-16 rotate-[20deg]">
                  <BoneIcon className="w-16 h-16" style={{ color: pink }} />
                </div>
                <div className="absolute bottom-12 left-1/4 rotate-[-10deg]">
                  <BoneIcon className="w-24 h-24" style={{ color: teal }} />
                </div>
                <div className="absolute bottom-20 right-1/4 rotate-[15deg]">
                  <PawIcon className="w-14 h-14" style={{ color: pink }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Pet badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold mb-6 font-furry-body"
                  style={{ backgroundColor: pink, color: white }}
                >
                  <PawIcon className="w-4 h-4" />
                  {lang === 'en' ? 'For Your Furry Friend' : lang === 'pt' ? 'Para Seu Amigo Peludo' : 'Para Tu Amigo Peludo'}
                </div>

                <h1 className="font-furry text-4xl md:text-6xl font-bold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="text-lg md:text-xl font-semibold mt-4 font-furry-body" style={{ color: pink }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-furry-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: mutedText }}>
                    {store.about.description}
                  </p>
                )}

                {/* Decorative paw trail */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <PawIcon className="w-4 h-4 rotate-[-20deg]" style={{ color: teal }} />
                  <BoneIcon className="w-5 h-5" style={{ color: pink }} />
                  <PawIcon className="w-4 h-4 rotate-[20deg]" style={{ color: teal }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: mint }}>
          <div className="flex items-center justify-center gap-3">
            <PawIcon className="w-5 h-5" style={{ color: teal }} />
            <p className="font-furry text-sm font-bold tracking-wider uppercase" style={{ color: pink }}>
              {lang === 'en' ? 'Our Products' : lang === 'pt' ? 'Nossos Produtos' : 'Nuestros Productos'}
            </p>
            <PawIcon className="w-5 h-5" style={{ color: teal }} />
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: mint }}>
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
