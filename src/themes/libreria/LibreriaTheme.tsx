/**
 * LIBRERIA THEME - "MUNDO DE LETRAS"
 *
 * Filosofia: Literario, clasico, editorial.
 * - Paleta: Azul noche, papel antiguo, rojo tinta, dorado viejo
 * - Tipografia: Serif elegante estilo editorial
 * - Layout limpio con bordes rectos como paginas
 * - Transiciones sobrias y elegantes
 * - Ideal para: Librerias, papelerias, editoriales, articulos de escritura
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

// Libreria colors
const nightBlue = '#1E3A5F'
const deepBlue = '#152C48'
const paper = '#F5F0E8'
const warmPaper = '#EDE5D8'
const inkRed = '#8B2232'
const deepRed = '#721A28'
const oldGold = '#B8960C'
const darkText = '#1A1A1A'
const mutedText = '#6B6358'
const white = '#FFFFFF'

// Libreria theme configuration
const libreriaTheme: ThemeConfig = {
  colors: {
    background: paper,
    surface: white,
    surfaceHover: warmPaper,
    text: darkText,
    textMuted: mutedText,
    textInverted: paper,
    primary: nightBlue,
    primaryHover: deepBlue,
    accent: inkRed,
    border: '#D4CCBE',
    badge: inkRed,
    badgeText: white,
  },
  radius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Libre Baskerville', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 1px 3px 0 rgb(30 58 95 / 0.08)',
    md: '0 4px 12px -2px rgb(30 58 95 / 0.1)',
    lg: '0 20px 40px -8px rgb(30 58 95 / 0.12)',
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

export default function LibreriaTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Book icon
  const BookIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )

  // Pen nib icon
  const PenIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )

  return (
    <ThemeProvider theme={libreriaTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: paper }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
          .font-libreria-heading { font-family: 'Libre Baskerville', Georgia, serif; }
          .font-libreria-body { font-family: 'Source Sans 3', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm font-medium font-libreria-body animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || nightBlue,
              color: store.announcement?.textColor || paper
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
            backgroundColor: scrolled ? `${paper}f5` : paper,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? `2px solid ${nightBlue}` : '2px solid transparent'
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
                  className="w-12 h-12 flex items-center justify-center"
                  style={{ backgroundColor: nightBlue }}
                >
                  <BookIcon className="w-7 h-7" style={{ color: paper }} />
                </div>
              )}
              <div>
                <h1 className="font-libreria-heading text-2xl md:text-3xl font-bold" style={{ color: nightBlue }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-libreria-heading italic" style={{ color: inkRed }}>
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
                className="w-12 h-12 flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: nightBlue }}
              >
                <svg className="w-6 h-6" fill="none" stroke={paper} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 text-sm font-bold flex items-center justify-center rounded-full animate-scaleIn font-libreria-body"
                  style={{ backgroundColor: inkRed, color: white }}
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
                  style={{ background: `linear-gradient(to top, ${paper} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <h2 className="font-libreria-heading text-3xl font-bold" style={{ color: nightBlue }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-libreria-heading italic mt-1" style={{ color: inkRed }}>
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
                  style={{ background: `linear-gradient(to top, ${paper} 0%, transparent 40%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                  <h2 className="font-libreria-heading text-5xl lg:text-6xl font-bold" style={{ color: nightBlue }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="font-libreria-heading text-xl italic mt-2" style={{ color: inkRed }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Editorial Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: warmPaper }}>
              {/* Subtle decorative elements */}
              <div className="absolute inset-0 overflow-hidden opacity-[0.04]">
                <div className="absolute top-8 left-16">
                  <PenIcon className="w-20 h-20 rotate-[-30deg]" style={{ color: nightBlue }} />
                </div>
                <div className="absolute top-20 right-20">
                  <BookIcon className="w-24 h-24" style={{ color: nightBlue }} />
                </div>
                <div className="absolute bottom-16 left-1/3">
                  <PenIcon className="w-16 h-16 rotate-[15deg]" style={{ color: nightBlue }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium mb-6 font-libreria-body"
                  style={{ backgroundColor: nightBlue, color: paper }}
                >
                  <BookIcon className="w-4 h-4" />
                  {lang === 'en' ? 'Read, Dream, Discover' : lang === 'pt' ? 'Leia, Sonhe, Descubra' : 'Lee, Suena, Descubre'}
                </div>

                <h1 className="font-libreria-heading text-4xl md:text-6xl font-bold" style={{ color: nightBlue }}>
                  {store.name}
                </h1>

                {store.about?.slogan && (
                  <p className="text-lg md:text-xl mt-4 font-libreria-heading italic" style={{ color: inkRed }}>
                    {store.about.slogan}
                  </p>
                )}

                {store.about?.description && (
                  <p className="font-libreria-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: mutedText }}>
                    {store.about.description}
                  </p>
                )}

                {/* Editorial divider */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  <div className="w-8 h-px" style={{ backgroundColor: oldGold }} />
                  <div className="w-2 h-2 rotate-45" style={{ backgroundColor: oldGold }} />
                  <div className="w-8 h-px" style={{ backgroundColor: oldGold }} />
                  <div className="w-2 h-2 rotate-45" style={{ backgroundColor: oldGold }} />
                  <div className="w-8 h-px" style={{ backgroundColor: oldGold }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: paper }}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-px" style={{ backgroundColor: nightBlue }} />
            <p className="font-libreria-heading text-sm italic tracking-wide" style={{ color: nightBlue }}>
              {lang === 'en' ? 'Our Catalog' : lang === 'pt' ? 'Nosso Catalogo' : 'Nuestro Catalogo'}
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: nightBlue }} />
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
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: paper }}>
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
