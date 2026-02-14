/**
 * HARVEST THEME - "GROCERY RUSTICO"
 *
 * Filosofia: Organico, rustico, terracota.
 * - Paleta: Terracota sobre crema calido
 * - Tipografia: Merriweather (heading) + Source Sans 3 (body)
 * - Bordes medios
 * - Sombras calidas con tinte terra
 * - Ideal para: Tiendas de productos locales, mercados, panaderia artesanal
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
  TrustBar
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

// Harvest colors
const terracotta = '#C2410C'
const terracottaHover = '#9A3412'
const cream = '#FFFBEB'
const warmCream = '#FEF3C7'
const olive = '#65A30D'
const darkText = '#451A03'
const mutedText = '#78716C'
const white = '#FFFFFF'

// Harvest theme configuration - rustic grocery
const harvestTheme: ThemeConfig = {
  colors: {
    background: cream,
    surface: white,
    surfaceHover: warmCream,
    text: darkText,
    textMuted: mutedText,
    textInverted: white,
    primary: terracotta,
    primaryHover: terracottaHover,
    accent: olive,
    border: '#FDE68A',
    badge: terracotta,
    badgeText: white,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Merriweather', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 4px 0 rgb(194 65 12 / 0.06)',
    md: '0 4px 12px -2px rgb(194 65 12 / 0.1)',
    lg: '0 20px 40px -8px rgb(194 65 12 / 0.15)',
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

export default function HarvestTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
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

  // Wheat/leaf icon
  const HarvestIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
    </svg>
  )

  return (
    <ThemeProvider theme={harvestTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: cream }}>
        {/* Google Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Source+Sans+3:wght@300;400;500;600&display=swap');
          .font-harvest { font-family: 'Merriweather', Georgia, serif; }
          .font-harvest-body { font-family: 'Source Sans 3', system-ui, sans-serif; }
        `}</style>

        {/* Announcement */}
        <AnnouncementBar />



        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-4'}`}
          style={{
            backgroundColor: scrolled ? `${white}f8` : white,
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: `1px solid ${scrolled ? '#FDE68A' : 'transparent'}`
          }}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-11 h-11 flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${terracotta}15` }}
                >
                  <HarvestIcon className="w-6 h-6" style={{ color: terracotta }} />
                </div>
              )}
              <div>
                <h1 className="font-harvest text-xl md:text-2xl font-bold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && !scrolled && (
                  <p className="text-xs font-medium mt-0.5 font-harvest-body" style={{ color: olive }}>
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
                style={{ backgroundColor: `${terracotta}15` }}
              >
                <svg className="w-5 h-5" style={{ color: terracotta }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold flex items-center justify-center rounded-full animate-scaleIn font-harvest-body"
                  style={{ backgroundColor: terracotta, color: white }}
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
                  style={{ background: `linear-gradient(to top, ${cream} 0%, transparent 50%)` }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                  <h2 className="font-harvest text-3xl font-bold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-sm font-medium mt-2 font-harvest-body" style={{ color: terracotta }}>
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
                <div className="absolute bottom-0 left-0 right-0 p-16 text-center">
                  <h2 className="font-harvest text-5xl lg:text-6xl font-bold" style={{ color: darkText }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-lg font-medium mt-3 font-harvest-body" style={{ color: terracotta }}>
                      {store.about.slogan}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Hero Image - Rustic Harvest Fallback */
            <div className="py-16 md:py-24 text-center relative overflow-hidden" style={{ backgroundColor: warmCream }}>
              {/* Decorative leaves */}
              <div className="absolute inset-0 overflow-hidden opacity-5">
                <div className="absolute top-8 left-8">
                  <HarvestIcon className="w-32 h-32" style={{ color: terracotta }} />
                </div>
                <div className="absolute bottom-8 right-8 rotate-180">
                  <HarvestIcon className="w-40 h-40" style={{ color: olive }} />
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-6 relative">
                {/* Farm badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 font-harvest-body"
                  style={{ backgroundColor: `${terracotta}15`, color: terracotta }}
                >
                  <HarvestIcon className="w-4 h-4" />
                  {lang === 'en' ? 'Farm Fresh' : lang === 'pt' ? 'Direto da Fazenda' : 'Del Campo a Tu Mesa'}
                </div>

                <h1 className="font-harvest text-4xl md:text-6xl font-bold" style={{ color: darkText }}>
                  {store.name}
                </h1>
                {store.about?.slogan && (
                  <p className="text-lg md:text-xl font-medium mt-4 font-harvest-body" style={{ color: terracotta }}>
                    {store.about.slogan}
                  </p>
                )}
                {store.about?.description && (
                  <p className="font-harvest-body text-base max-w-xl mx-auto mt-6 leading-relaxed" style={{ color: mutedText }}>
                    {store.about.description}
                  </p>
                )}

                {/* Decorative line */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: `${terracotta}30` }} />
                  <HarvestIcon className="w-5 h-5" style={{ color: olive }} />
                  <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: `${terracotta}30` }} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Products Title */}
        <div className="py-8 text-center" style={{ backgroundColor: cream }}>
          <p className="font-harvest text-sm font-bold tracking-wider uppercase" style={{ color: terracotta }}>
            {lang === 'en' ? 'Our Products' : lang === 'pt' ? 'Nossos Produtos' : 'Nuestros Productos'}
          </p>
        </div>


        <TrustBar />

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16" style={{ backgroundColor: cream }}>
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
