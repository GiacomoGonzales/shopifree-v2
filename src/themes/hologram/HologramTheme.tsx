/**
 * HOLOGRAM THEME - PREMIUM - "FUTURISTA IRIDISCENTE"
 *
 * Efecto WOW: Conic-gradient arcoiris FUERTE reactivo al mouse,
 * scanlines visibles, grid luminoso, glitch effect en hover,
 * titulo con shimmer iridiscente. Mobile: sweep rainbow animado.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { Store, Product, Category } from '../../types'
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
  StoreFooter,
  CheckoutDrawer,
  AnnouncementBar,
  TrustBar,
  FlashSaleBar,
  SocialProofToast,
} from '../../components/catalog'
import type { ThemeConfig } from '../../components/catalog'
import '../shared/animations.css'

const hologramTheme: ThemeConfig = {
  colors: {
    background: '#030305',
    surface: 'rgba(180, 180, 200, 0.06)',
    surfaceHover: 'rgba(180, 180, 200, 0.10)',
    text: '#E8E8F0',
    textMuted: '#707080',
    textInverted: '#030305',
    primary: '#FFFFFF',
    primaryHover: '#D0D0E0',
    accent: '#B0B0C0',
    border: 'rgba(180, 180, 200, 0.12)',
    badge: '#FFFFFF',
    badgeText: '#030305',
  },
  radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem', full: '9999px' },
  fonts: {
    heading: "'Sora', 'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 0 15px rgba(180, 180, 200, 0.08)',
    md: '0 0 30px rgba(180, 180, 200, 0.12)',
    lg: '0 0 50px rgba(180, 180, 200, 0.15)',
  },
  effects: {
    cardHover: 'scale-105',
    buttonHover: 'scale-105',
    headerBlur: true,
    darkMode: true,
    glassMorphism: true,
    tilt3D: true,
    animatedBorder: true,
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

export default function HologramTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const t = getThemeTranslations(store.language)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const heroImgRef = useRef<HTMLImageElement>(null)
  const heroImgMobileRef = useRef<HTMLImageElement>(null)
  const holoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId = 0
    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 30)
        if (heroRef.current && heroRef.current.getBoundingClientRect().bottom > 0) {
          const offset = window.scrollY * 0.25
          if (heroImgRef.current) heroImgRef.current.style.transform = `translateY(${offset}px) scale(1.1)`
          if (heroImgMobileRef.current) heroImgMobileRef.current.style.transform = `translateY(${offset * 0.5}px)`
        }
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => { window.removeEventListener('scroll', handleScroll); cancelAnimationFrame(rafId) }
  }, [])

  // Holographic conic-gradient - STRONG opacity, follows cursor
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!holoRef.current) return
    const x = (e.clientX / window.innerWidth) * 100
    const y = ((e.clientY + window.scrollY) / document.documentElement.scrollHeight) * 100
    const angle = (e.clientX + e.clientY) * 0.4
    holoRef.current.style.background = `conic-gradient(
      from ${angle}deg at ${x}% ${y}%,
      rgba(255,0,80,0.14),
      rgba(255,165,0,0.14),
      rgba(255,255,0,0.12),
      rgba(0,255,100,0.14),
      rgba(0,180,255,0.14),
      rgba(130,0,255,0.14),
      rgba(255,0,200,0.12),
      rgba(255,0,80,0.14)
    )`
  }, [])

  const filteredProducts = useMemo(() => {
    return activeCategory ? products.filter(p => p.categoryId === activeCategory) : products
  }, [products, activeCategory])

  const handleSelectProduct = (product: Product) => { setSelectedProduct(product); onProductView?.(product) }
  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(product, extras); onCartAdd?.(product) }

  const bg = '#030305'

  return (
    <ThemeProvider theme={hologramTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{ backgroundColor: bg, fontFamily: "'Inter', system-ui, sans-serif" }}
        onMouseMove={handleMouseMove}
      >
        {/* ═══ HOLOGRAPHIC LAYER - desktop: mouse reactive ═══ */}
        <div ref={holoRef} className="fixed inset-0 pointer-events-none hidden md:block" style={{ opacity: 0.8 }} />

        {/* ═══ MOBILE RAINBOW SWEEP ═══ */}
        <div className="fixed inset-0 pointer-events-none md:hidden" style={{
          background: `linear-gradient(135deg, rgba(255,0,80,0.10), rgba(255,165,0,0.10), rgba(255,255,0,0.08), rgba(0,255,100,0.10), rgba(0,180,255,0.10), rgba(130,0,255,0.10), rgba(255,0,80,0.10))`,
          backgroundSize: '400% 400%',
          animation: 'hologramSweep 6s ease-in-out infinite',
        }} />

        {/* ═══ LUMINOUS GRID ═══ */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(rgba(200,200,220,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,200,220,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />

        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-2xl' : 'backdrop-blur-md'}`}
          style={{
            backgroundColor: scrolled ? 'rgba(3,3,5,0.90)' : 'rgba(3,3,5,0.50)',
            borderBottom: `1px solid rgba(180,180,200,${scrolled ? '0.12' : '0.05'})`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                {store.logo && <img src={store.logo} alt={store.name} className="h-8 w-auto" />}
                <h1
                  className="text-xl font-semibold tracking-[0.2em] uppercase animate-gradient-text"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    backgroundImage: 'linear-gradient(90deg, #ff0050, #ff8800, #ffff00, #00ff66, #00bbff, #8800ff, #ff0050)',
                    backgroundSize: '400% auto',
                  }}
                >
                  {store.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a href={`https://instagram.com/${store.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/5" style={{ color: '#707080' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: totalItems > 0 ? '#FFFFFF' : 'rgba(180,180,200,0.06)',
                    color: totalItems > 0 ? bg : '#E8E8F0',
                    backdropFilter: 'blur(12px)',
                    border: totalItems > 0 ? 'none' : `1px solid rgba(180,180,200,0.12)`,
                    boxShadow: totalItems > 0 ? '0 0 20px rgba(255,255,255,0.20), 0 0 40px rgba(130,0,255,0.15), 0 0 60px rgba(0,180,255,0.10)' : 'none',
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  {totalItems > 0 && <span>{totalItems}</span>}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        {(store.heroImage || store.heroImageMobile) ? (
          <section ref={heroRef} className="relative overflow-hidden">
            <div className="md:hidden relative">
              <img ref={heroImgMobileRef} src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt={store.name} className="w-full h-auto max-h-[400px] object-cover" style={{ filter: 'brightness(0.7) grayscale(0.4) contrast(1.2)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${bg})` }} />
            </div>
            <div className="hidden md:block relative aspect-[16/5] overflow-hidden">
              <img ref={heroImgRef} src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt={store.name} className="w-full h-full object-cover" style={{ transform: 'scale(1.1)', filter: 'brightness(0.7) grayscale(0.4) contrast(1.2)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bg}50 0%, transparent 30%, transparent 60%, ${bg} 100%)` }} />
            </div>
          </section>
        ) : (
          <section className="py-28 md:py-44 text-center relative overflow-hidden">
            {/* Holographic burst behind title */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none rounded-full" style={{
              background: 'conic-gradient(from 0deg, rgba(255,0,80,0.08), rgba(255,165,0,0.08), rgba(0,255,100,0.08), rgba(0,180,255,0.08), rgba(130,0,255,0.08), rgba(255,0,80,0.08))',
              filter: 'blur(60px)',
              animation: 'hologramSweep 8s linear infinite',
            }} />
            <div className="max-w-4xl mx-auto px-6 relative">
              <h2
                className="text-5xl md:text-8xl font-bold tracking-[0.15em] uppercase animate-gradient-text"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  backgroundImage: 'linear-gradient(90deg, #ff0050, #ff8800, #ffff00, #00ff66, #00bbff, #8800ff, #ff00cc, #ff0050)',
                  backgroundSize: '400% auto',
                  filter: 'drop-shadow(0 0 30px rgba(130,0,255,0.3))',
                }}
              >
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-6 text-sm uppercase tracking-[0.4em] font-light" style={{ color: '#707080' }}>{store.about.slogan}</p>
              )}
              {store.whatsapp && (
                <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={() => onWhatsAppClick?.()} className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-lg font-medium transition-all hover:scale-105" style={{ background: '#25D366', color: '#fff', boxShadow: '0 0 30px #25D36640' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  {t.hitUsUp}
                </a>
              )}
            </div>
          </section>
        )}

        <TrustBar />
        <FlashSaleBar />
        <CategoryNav categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} products={products} onSelectProduct={handleSelectProduct} />

        <main className="py-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} onQuickAdd={handleAddToCart} categories={categories} />
          </div>
        </main>

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
