/**
 * NEON THEME - "CYBERPUNK"
 *
 * Filosofia: Futurista, vibrante, tecnologico.
 * - Paleta: Negro profundo, verde neon, cyan neon
 * - Efectos de glow y brillo
 * - Grid background sutil
 * - Ideal para: Tech, gaming, productos futuristas
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

// Neon theme colors
const neonGreen = '#00ff88'
const neonCyan = '#00ffff'
const darkBg = '#0a0a0f'

// Neon theme configuration
const neonTheme: ThemeConfig = {
  colors: {
    background: darkBg,
    surface: `${neonGreen}05`,
    surfaceHover: `${neonGreen}10`,
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    textInverted: darkBg,
    primary: neonGreen,
    primaryHover: '#33ff99',
    accent: neonCyan,
    border: `${neonGreen}20`,
    badge: neonCyan,
    badgeText: darkBg,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
  },
  shadows: {
    sm: `0 0 10px ${neonGreen}40`,
    md: `0 0 20px ${neonGreen}40`,
    lg: `0 0 30px ${neonGreen}60`,
  },
  effects: {
    cardHover: 'scale-102',
    buttonHover: 'scale-105',
    headerBlur: true,
    darkMode: true,
  },
}

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
}

export default function NeonTheme({ store, products, categories, onWhatsAppClick }: Props) {
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
      message += `> ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*${t.total}: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <ThemeProvider theme={neonTheme} store={store}>
      <div className="min-h-screen" style={{ backgroundColor: darkBg }}>
        {/* Neon glow styles */}
        <style>{`
          .neon-glow { text-shadow: 0 0 10px ${neonGreen}, 0 0 20px ${neonGreen}, 0 0 40px ${neonGreen}; }
          .neon-glow-cyan { text-shadow: 0 0 10px ${neonCyan}, 0 0 20px ${neonCyan}, 0 0 40px ${neonCyan}; }
          .neon-box { box-shadow: 0 0 10px ${neonGreen}40, 0 0 20px ${neonGreen}20, inset 0 0 20px ${neonGreen}10; }
          .grid-bg {
            background-image: linear-gradient(${neonGreen}08 1px, transparent 1px), linear-gradient(90deg, ${neonGreen}08 1px, transparent 1px);
            background-size: 50px 50px;
          }
        `}</style>

        {/* Announcement */}
        {showAnnouncement && (
          <div
            className="relative py-2.5 px-4 text-center text-sm font-medium animate-fadeIn"
            style={{
              backgroundColor: store.announcement?.backgroundColor || neonGreen,
              color: store.announcement?.textColor || darkBg
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
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-500 border-b ${scrolled ? 'backdrop-blur-xl' : ''}`}
          style={{
            backgroundColor: scrolled ? `${darkBg}ee` : darkBg,
            borderColor: scrolled ? `${neonGreen}30` : 'transparent'
          }}
        >
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden neon-box">
                  <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center neon-box"
                  style={{ backgroundColor: `${neonGreen}20` }}
                >
                  <span className="font-bold neon-glow" style={{ color: neonGreen }}>{store.name.charAt(0)}</span>
                </div>
              )}
              <h1 className="font-bold text-lg tracking-wide" style={{ color: neonGreen }}>
                {store.name}
              </h1>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-11 h-11 flex items-center justify-center rounded-lg transition-all hover:scale-105"
              style={{ backgroundColor: `${neonGreen}15`, border: `1px solid ${neonGreen}40` }}
            >
              <svg className="w-5 h-5" style={{ color: neonGreen }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center animate-scaleIn"
                  style={{ backgroundColor: neonGreen, color: darkBg }}
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
              <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center" style={{ backgroundColor: darkBg }}>
                <img src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt="" className="w-full h-auto max-h-[400px] object-contain" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${neonGreen}40 0%, transparent 50%, ${neonCyan}30 100%)` }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to top, ${darkBg} 0%, transparent 50%)` }} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-3xl font-bold neon-glow" style={{ color: neonGreen }}>{store.name}</h2>
                  {store.about?.slogan && <p className="text-white/70 text-lg mt-2">{store.about.slogan}</p>}
                </div>
              </div>
              {/* Desktop Hero */}
              <div className="hidden md:block relative overflow-hidden">
                <img src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt="" className="w-full aspect-[16/5] object-cover" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${neonGreen}40 0%, transparent 50%, ${neonCyan}30 100%)` }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to top, ${darkBg} 0%, transparent 50%)` }} />
                <div className="absolute bottom-0 left-0 right-0 p-10">
                  <div className="max-w-6xl mx-auto">
                    <h2 className="text-5xl font-bold neon-glow" style={{ color: neonGreen }}>{store.name}</h2>
                    {store.about?.slogan && <p className="text-white/70 text-lg mt-2">{store.about.slogan}</p>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 md:py-28 grid-bg relative">
              <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full blur-[100px] opacity-30" style={{ backgroundColor: neonGreen }} />
              <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ backgroundColor: neonCyan }} />
              <div className="relative max-w-4xl mx-auto px-6 text-center">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                  style={{ backgroundColor: `${neonGreen}15`, border: `1px solid ${neonGreen}40`, color: neonGreen }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: neonGreen }}></span>
                  Online
                </div>
                <h1 className="text-4xl md:text-6xl font-bold neon-glow mb-4" style={{ color: neonGreen }}>{store.name}</h1>
                {store.about?.slogan && <p className="text-xl text-white/60">{store.about.slogan}</p>}
              </div>
            </div>
          )}
        </section>

        {/* Categories */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Products */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={setSelectedProduct}
            onQuickAdd={addItem}
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
          onCheckout={sendWhatsAppOrder}
        />

        {/* Product Drawer */}
        {selectedProduct && (
          <ProductDrawer
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={addItem}
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
