/**
 * VELVET THEME - PREMIUM - "LUJO OPULENTO"
 *
 * Efecto WOW: Parallax 3 capas VISIBLES (opacity 0.20+), grain texture
 * visible, ornamentos SVG decorativos dorados, glows pulsantes intensos,
 * titulo italic con drop-shadow dramatico.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
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

const velvetTheme: ThemeConfig = {
  colors: {
    background: '#0E060C',
    surface: 'rgba(200, 150, 180, 0.08)',
    surfaceHover: 'rgba(200, 150, 180, 0.14)',
    text: '#F2E8EF',
    textMuted: '#A08898',
    textInverted: '#0E060C',
    primary: '#E8A0C8',
    primaryHover: '#D88AB5',
    accent: '#C0A0E0',
    border: 'rgba(200, 150, 180, 0.15)',
    badge: '#E8A0C8',
    badgeText: '#0E060C',
  },
  radius: { sm: '0.375rem', md: '0.625rem', lg: '0.875rem', xl: '1.25rem', full: '9999px' },
  fonts: {
    heading: "'Playfair Display', 'Georgia', serif",
    body: "'Lato', 'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 0 20px rgba(232, 160, 200, 0.10)',
    md: '0 0 35px rgba(232, 160, 200, 0.15)',
    lg: '0 0 60px rgba(232, 160, 200, 0.20)',
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

export default function VelvetTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
  const layer1 = useRef<HTMLDivElement>(null)
  const layer2 = useRef<HTMLDivElement>(null)
  const layer3 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId = 0
    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 30)
        if (layer1.current) layer1.current.style.transform = `translateY(${y * 0.12}px)`
        if (layer2.current) layer2.current.style.transform = `translateY(${y * 0.22}px)`
        if (layer3.current) layer3.current.style.transform = `translateY(${y * 0.06}px)`
        if (heroRef.current && heroRef.current.getBoundingClientRect().bottom > 0) {
          if (heroImgRef.current) heroImgRef.current.style.transform = `translateY(${y * 0.3}px) scale(1.1)`
          if (heroImgMobileRef.current) heroImgMobileRef.current.style.transform = `translateY(${y * 0.15}px)`
        }
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => { window.removeEventListener('scroll', handleScroll); cancelAnimationFrame(rafId) }
  }, [])

  const filteredProducts = useMemo(() => {
    return activeCategory ? products.filter(p => p.categoryId === activeCategory) : products
  }, [products, activeCategory])

  const handleSelectProduct = (product: Product) => { setSelectedProduct(product); onProductView?.(product) }
  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(product, extras); onCartAdd?.(product) }

  const rose = '#E8A0C8'
  const lavender = '#C0A0E0'
  const bg = '#0E060C'

  return (
    <ThemeProvider theme={velvetTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,500;1,600;1,700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative" style={{ backgroundColor: bg, fontFamily: "'Lato', system-ui, sans-serif" }}>
        {/* ═══ GRAIN TEXTURE - visible at 0.07 ═══ */}
        <div className="fixed inset-0 pointer-events-none z-[1]" style={{
          opacity: 0.07,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '512px',
        }} />

        {/* ═══ PARALLAX LAYER 1 - Lavender glow (0.12x) ═══ */}
        <div ref={layer1} className="fixed inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 60% 50% at 20% 25%, ${lavender}30 0%, transparent 55%)`,
          willChange: 'transform',
        }} />

        {/* ═══ PARALLAX LAYER 2 - Rose glow (0.22x) ═══ */}
        <div ref={layer2} className="fixed inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 50% 40% at 80% 55%, ${rose}25 0%, transparent 50%)`,
          animation: 'glowPulse 5s ease-in-out infinite',
          willChange: 'transform',
        }} />

        {/* ═══ PARALLAX LAYER 3 - Deep burgundy (0.06x) ═══ */}
        <div ref={layer3} className="fixed inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 80%, rgba(120,20,50,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 40% 30% at 30% 60%, ${lavender}12 0%, transparent 50%)
          `,
          willChange: 'transform',
        }} />

        {/* ═══ ORNAMENTAL SVG ═══ */}
        <svg className="fixed pointer-events-none hidden md:block" style={{ top: '3%', right: '4%', width: 150, height: 150, opacity: 0.10 }} viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="60" fill="none" stroke={rose} strokeWidth="0.5" />
          <circle cx="75" cy="75" r="45" fill="none" stroke={lavender} strokeWidth="0.3" />
          <path d="M75 15 L85 65 L75 75 L65 65 Z" fill="none" stroke={rose} strokeWidth="0.5" />
          <path d="M75 135 L85 85 L75 75 L65 85 Z" fill="none" stroke={rose} strokeWidth="0.5" />
          <path d="M15 75 L65 65 L75 75 L65 85 Z" fill="none" stroke={lavender} strokeWidth="0.5" />
          <path d="M135 75 L85 65 L75 75 L85 85 Z" fill="none" stroke={lavender} strokeWidth="0.5" />
        </svg>

        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-2xl' : 'backdrop-blur-md'}`}
          style={{
            backgroundColor: scrolled ? 'rgba(14,6,12,0.90)' : 'rgba(14,6,12,0.50)',
            borderBottom: `1px solid rgba(232,160,200,${scrolled ? '0.15' : '0.06'})`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                {store.logo && <img src={store.logo} alt={store.name} className="h-8 w-auto" />}
                <h1
                  className="text-xl font-medium italic"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: rose,
                    textShadow: `0 0 40px ${rose}40, 0 0 80px ${lavender}20`,
                    letterSpacing: '0.1em',
                  }}
                >
                  {store.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a href={`https://instagram.com/${store.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/5" style={{ color: '#A08898' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: totalItems > 0 ? `linear-gradient(135deg, ${rose}, ${lavender})` : 'rgba(200,150,180,0.08)',
                    color: totalItems > 0 ? bg : '#F2E8EF',
                    backdropFilter: 'blur(12px)',
                    border: totalItems > 0 ? 'none' : `1px solid rgba(232,160,200,0.18)`,
                    boxShadow: totalItems > 0 ? `0 0 25px ${rose}50, 0 0 50px ${lavender}25` : 'none',
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
              <img ref={heroImgMobileRef} src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt={store.name} className="w-full h-auto max-h-[400px] object-cover" style={{ filter: 'brightness(0.75) contrast(1.15) saturate(0.9)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${bg})` }} />
            </div>
            <div className="hidden md:block relative aspect-[16/5] overflow-hidden">
              <img ref={heroImgRef} src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt={store.name} className="w-full h-full object-cover" style={{ transform: 'scale(1.1)', filter: 'brightness(0.75) contrast(1.15) saturate(0.9)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bg}50 0%, transparent 30%, transparent 60%, ${bg} 100%)` }} />
            </div>
          </section>
        ) : (
          <section className="py-28 md:py-44 text-center relative overflow-hidden">
            {/* Dramatic glows behind title */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px]" style={{ background: `radial-gradient(ellipse, ${rose}20 0%, ${lavender}10 40%, transparent 70%)`, animation: 'glowPulse 4s ease-in-out infinite' }} />
            </div>
            {/* Ornamental line */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 md:w-24" style={{ background: `linear-gradient(90deg, transparent, ${rose}40)` }} />
              <div className="w-2 h-2 rounded-full" style={{ background: rose, boxShadow: `0 0 10px ${rose}60` }} />
              <div className="h-px w-16 md:w-24" style={{ background: `linear-gradient(90deg, ${rose}40, transparent)` }} />
            </div>
            <div className="max-w-4xl mx-auto px-6 relative">
              <h2
                className="text-5xl md:text-8xl font-semibold italic"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#F2E8EF',
                  textShadow: `0 0 60px ${rose}30, 0 0 120px ${lavender}15`,
                  letterSpacing: '0.05em',
                }}
              >
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-6 text-sm uppercase tracking-[0.4em] font-light" style={{ color: lavender }}>{store.about.slogan}</p>
              )}
              {/* Ornamental line */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <div className="h-px w-12 md:w-20" style={{ background: `linear-gradient(90deg, transparent, ${lavender}30)` }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: lavender }} />
                <div className="h-px w-12 md:w-20" style={{ background: `linear-gradient(90deg, ${lavender}30, transparent)` }} />
              </div>
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
