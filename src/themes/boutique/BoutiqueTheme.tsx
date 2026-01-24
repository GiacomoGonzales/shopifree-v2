import { useState, useEffect, useMemo } from 'react'
import type { Store, Product, Category } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import { getThemeTranslations } from '../shared/translations'
import { optimizeImage } from '../../utils/cloudinary'
import {
  ThemeProvider,
  ProductGrid,
  ProductDrawer,
  CartDrawer,
  CartBar,
  CategoryNav,
  WhatsAppButton,
  StoreFooter
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

// Boutique theme configuration - feminine and elegant
const boutiqueTheme: ThemeConfig = {
  colors: {
    background: '#fdf2f8',        // Very soft pink
    surface: '#ffffff',
    surfaceHover: '#fce7f3',      // Pink-100
    text: '#111827',
    textMuted: '#6b7280',
    textInverted: '#ffffff',
    primary: '#db2777',           // Pink-600
    primaryHover: '#be185d',      // Pink-700
    accent: '#f43f5e',            // Rose-500
    border: '#fce7f3',            // Pink-100
    badge: '#f43f5e',             // Rose-500
    badgeText: '#ffffff',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: 'ui-serif, Georgia, serif',
    body: 'system-ui, sans-serif',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(219 39 119 / 0.1)',
    lg: '0 20px 25px -5px rgb(219 39 119 / 0.15)',
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
}

export default function BoutiqueTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const t = getThemeTranslations(store.language)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

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

  const sendWhatsAppOrder = () => {
    if (!store.whatsapp || items.length === 0) return
    onWhatsAppClick?.()
    let message = `${t.whatsappOrder}\n\n`
    items.forEach(item => {
      message += `• ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*${t.total}: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <ThemeProvider theme={boutiqueTheme} store={store}>
      <div className="min-h-screen bg-[#fdf2f8]">
        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-2.5 px-4 text-center text-sm animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || '#be185d',
              color: store.announcement?.textColor || '#ffffff'
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
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header - Unique Boutique style */}
        <header className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm' : 'bg-white'
        }`}>
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="h-12 w-12 object-contain rounded-full border-2 border-pink-100" />
              ) : (
                <div className="h-12 w-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-serif text-xl">{store.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h1 className="font-serif text-xl text-gray-900 tracking-wide">{store.name}</h1>
                {store.about?.slogan && (
                  <p className="text-xs text-pink-600 italic">{store.about.slogan}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-12 h-12 flex items-center justify-center rounded-full bg-pink-50 hover:bg-pink-100 transition-colors"
            >
              <svg className="w-5 h-5 text-pink-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scaleIn">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero - Unique Boutique style */}
        <section className="relative">
          {(store.heroImage || store.heroImageMobile) ? (
            <>
              {/* Mobile Hero */}
              <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center bg-pink-50">
                <img
                  src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                  alt=""
                  className="w-full h-auto max-h-[400px] object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="max-w-6xl mx-auto">
                    <h2 className="font-serif text-3xl mb-2">{store.name}</h2>
                    {store.about?.slogan && (
                      <p className="text-lg text-white/90 font-light">{store.about.slogan}</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Desktop Hero */}
              <div className="hidden md:block relative overflow-hidden">
                <img
                  src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')}
                  alt=""
                  className="w-full aspect-[16/5] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
                  <div className="max-w-6xl mx-auto">
                    <h2 className="font-serif text-5xl mb-2">{store.name}</h2>
                    {store.about?.slogan && (
                      <p className="text-xl text-white/90 font-light">{store.about.slogan}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 md:py-24 text-center bg-gradient-to-b from-white to-pink-50">
              <div className="max-w-3xl mx-auto px-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm mb-6">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {t.hot}
                </div>
                <h1 className="font-serif text-4xl md:text-6xl text-gray-900 mb-4">{store.name}</h1>
                {store.about?.slogan && (
                  <p className="text-lg md:text-xl text-gray-600 font-light italic">"{store.about.slogan}"</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Categories - Using shared component */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Products - Using shared component */}
        <main id="products-section" className="scroll-mt-32 max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={setSelectedProduct}
            onQuickAdd={addItem}
          />
        </main>

        {/* Footer - Using shared component */}
        <StoreFooter onWhatsAppClick={onWhatsAppClick} />

        {/* WhatsApp Float - Using shared component */}
        <WhatsAppButton
          whatsapp={store.whatsapp || ''}
          storeName={store.name}
          onClick={onWhatsAppClick}
          visible={totalItems === 0}
        />

        {/* Cart Bar - Using shared component */}
        <CartBar
          totalItems={totalItems}
          totalPrice={totalPrice}
          onViewCart={() => setIsCartOpen(true)}
          onCheckout={sendWhatsAppOrder}
        />

        {/* Product Drawer - Using shared component */}
        {selectedProduct && (
          <ProductDrawer
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={addItem}
          />
        )}

        {/* Cart Drawer - Using shared component */}
        {isCartOpen && (
          <CartDrawer
            items={items}
            totalPrice={totalPrice}
            onClose={() => setIsCartOpen(false)}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={sendWhatsAppOrder}
          />
        )}
      </div>
    </ThemeProvider>
  )
}
