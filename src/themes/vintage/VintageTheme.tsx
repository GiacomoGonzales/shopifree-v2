/**
 * VINTAGE THEME - "RETRO"
 *
 * Filosofia: Clasico, nostalgico, atemporal.
 * - Paleta: Sepia, crema, marrones calidos
 * - Tipografia: Serif elegante, espaciado clasico
 * - Bordes decorativos, texturas sutiles
 * - Transiciones suaves, hover elegantes
 * - Ideal para: Antiguedades, ropa vintage, productos artesanales, cafeterias
 */

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

// Vintage theme configuration - Classic sepia tones with serif typography
const vintageTheme: ThemeConfig = {
  colors: {
    background: '#FAF6F0',
    surface: '#FFFCF7',
    surfaceHover: '#F5EFE6',
    text: '#3E2723',
    textMuted: '#8B7355',
    textInverted: '#FDF8F3',
    primary: '#5D4037',
    primaryHover: '#4E342E',
    accent: '#C9A962',
    border: '#E8E0D5',
    badge: '#C9A962',
    badgeText: '#3E2723',
  },
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Georgia', 'Times New Roman', serif",
    body: "'Georgia', 'Times New Roman', serif",
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(62 39 35 / 0.05)',
    md: '0 2px 4px -1px rgb(62 39 35 / 0.1)',
    lg: '0 4px 8px -2px rgb(62 39 35 / 0.1)',
  },
  effects: {
    cardHover: 'scale-102',
    buttonHover: 'scale-105',
    headerBlur: false,
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

export default function VintageTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const t = getThemeTranslations(store.language)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // Vintage colors
  const cream = '#FAF6F0'
  const brown = '#5D4037'
  const gold = '#C9A962'
  const darkBrown = '#3E2723'
  const lightBrown = '#EFEBE9'

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

  const sendWhatsAppOrder = () => {
    if (!store.whatsapp || items.length === 0) return
    onWhatsAppClick?.()
    let message = `${t.whatsappOrder}\n\n`
    items.forEach(item => {
      message += `* ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*${t.total}: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <ThemeProvider theme={vintageTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: cream, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-3 px-4 text-center text-sm tracking-wide animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || darkBrown,
              color: store.announcement?.textColor || cream,
              fontStyle: 'italic'
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
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header - Vintage elegant style */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}
          style={{ backgroundColor: cream, borderBottom: `1px solid ${lightBrown}` }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-3">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="h-10 w-auto" />
                ) : (
                  <h1 className="text-2xl tracking-wide" style={{ color: darkBrown }}>
                    {store.name}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-4">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
                    style={{ color: brown }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}

                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:opacity-90"
                  style={{ backgroundColor: totalItems > 0 ? brown : 'transparent', color: totalItems > 0 ? cream : brown }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {totalItems > 0 && <span className="font-medium">{totalItems}</span>}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero - Vintage with sepia effect */}
        {store.heroImage && (
          <section className="relative">
            <div className="aspect-[21/9] md:aspect-[3/1] overflow-hidden">
              <picture>
                {store.heroImageMobile && (
                  <source media="(max-width: 768px)" srcSet={store.heroImageMobile} />
                )}
                <img
                  src={optimizeImage(store.heroImage, 'hero')}
                  alt={store.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'sepia(15%)' }}
                />
              </picture>
            </div>
            {/* Decorative border */}
            <div
              className="absolute bottom-0 left-0 right-0 h-2"
              style={{ background: `linear-gradient(to right, ${gold}, ${brown}, ${gold})` }}
            />
          </section>
        )}

        {/* Store Info - Vintage centered with decorative divider */}
        <section className="py-10" style={{ borderBottom: `2px solid ${lightBrown}` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl tracking-wide mb-2" style={{ color: darkBrown }}>
              {store.name}
            </h2>
            {store.about?.slogan && (
              <p className="text-lg italic" style={{ color: brown }}>{store.about.slogan}</p>
            )}
            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="h-px w-16" style={{ backgroundColor: gold }} />
              <svg className="w-5 h-5" style={{ color: gold }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <div className="h-px w-16" style={{ backgroundColor: gold }} />
            </div>
            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onWhatsAppClick?.()}
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full transition-all hover:opacity-90 bg-[#25D366] text-white"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {t.hitUsUp}
              </a>
            )}
          </div>
        </section>

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Products */}
        <main className="py-10" style={{ backgroundColor: cream }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ProductGrid
              products={filteredProducts}
              onSelectProduct={handleSelectProduct}
              onQuickAdd={handleAddToCart}
            />
          </div>
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
          onCheckout={sendWhatsAppOrder}
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
            onCheckout={sendWhatsAppOrder}
          />
        )}
      </div>
    </ThemeProvider>
  )
}
