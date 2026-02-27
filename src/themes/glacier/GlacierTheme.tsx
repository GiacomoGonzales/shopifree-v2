/**
 * GLACIER THEME - PREMIUM - "ARTICO CRISTALINO"
 *
 * Efecto WOW: Frosted glass PESADO visible, 15+ particulas de hielo
 * flotando, shimmer refraction en todo el viewport, cristales SVG
 * decorativos, gradientes icy vibrantes. Unico premium CLARO.
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

const glacierTheme: ThemeConfig = {
  colors: {
    background: '#E8F4FD',
    surface: 'rgba(255, 255, 255, 0.65)',
    surfaceHover: 'rgba(255, 255, 255, 0.80)',
    text: '#0C2D48',
    textMuted: '#4A7FA5',
    textInverted: '#FFFFFF',
    primary: '#0284C7',
    primaryHover: '#0369A1',
    accent: '#06B6D4',
    border: 'rgba(2, 132, 199, 0.18)',
    badge: '#0284C7',
    badgeText: '#FFFFFF',
  },
  radius: { sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem', full: '9999px' },
  fonts: {
    heading: "'Raleway', 'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 2px 15px rgba(2, 132, 199, 0.10)',
    md: '0 4px 25px rgba(2, 132, 199, 0.15)',
    lg: '0 8px 50px rgba(2, 132, 199, 0.20)',
  },
  effects: {
    cardHover: 'scale-105',
    buttonHover: 'scale-105',
    headerBlur: true,
    darkMode: false,
    glassMorphism: true,
    tilt3D: false,
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

// Deterministic ice particles
const iceParticles = Array.from({ length: 10 }, (_, i) => ({
  size: 2 + (i % 4),
  left: 5 + ((i * 17 + 3) % 90),
  delay: (i * 1.7) % 12,
  duration: 12 + (i % 6) * 3,
  variant: i % 2 === 0 ? 'glacierParticleDrift' : 'glacierParticleDrift2',
  opacity: 0.3 + (i % 3) * 0.15,
  glow: 4 + (i % 4) * 2,
}))

export default function GlacierTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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

  useEffect(() => {
    let rafId = 0
    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 30)
        if (heroRef.current && heroRef.current.getBoundingClientRect().bottom > 0) {
          const offset = window.scrollY * 0.2
          if (heroImgRef.current) heroImgRef.current.style.transform = `translateY(${offset}px) scale(1.05)`
          if (heroImgMobileRef.current) heroImgMobileRef.current.style.transform = `translateY(${offset * 0.5}px)`
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

  const ice = '#0284C7'
  const light = '#38BDF8'
  const bg = '#E8F4FD'

  return (
    <ThemeProvider theme={glacierTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@200;300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative" style={{ backgroundColor: bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* ═══ ICY AURORA - visible gradient layers ═══ */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 80% 50% at 25% 20%, rgba(2,132,199,0.15) 0%, transparent 55%),
            radial-gradient(ellipse 60% 60% at 75% 75%, rgba(6,182,212,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 50% 40%, rgba(186,230,253,0.20) 0%, transparent 55%)
          `,
          backgroundSize: '200% 200%',
          animation: 'auroraShift 20s ease-in-out infinite',
        }} />

        {/* ═══ 18 ICE PARTICLES floating upward ═══ */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {iceParticles.map((p, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: p.size, height: p.size,
                left: `${p.left}%`,
                bottom: '-3%',
                background: `radial-gradient(circle, rgba(2,132,199,${p.opacity}) 0%, rgba(186,230,253,${p.opacity * 0.5}) 100%)`,
                borderRadius: '50%',
                boxShadow: `0 0 ${p.glow}px rgba(2,132,199,0.4), 0 0 ${p.glow * 2}px rgba(6,182,212,0.2)`,
                animation: `${p.variant} ${p.duration}s linear infinite ${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* ═══ SHIMMER REFRACTION - visible sweep (desktop only) ═══ */}
        <div className="fixed inset-0 pointer-events-none hidden md:block" style={{
          background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.20) 47%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.20) 53%, transparent 75%)',
          backgroundSize: '300% 100%',
          animation: 'glacierShimmer 8s linear infinite',
        }} />

        {/* ═══ CRYSTAL SVG decorative ═══ */}
        <svg className="fixed pointer-events-none hidden md:block" style={{ top: '8%', right: '5%', width: 180, height: 200, opacity: 0.12 }} viewBox="0 0 180 200">
          <polygon points="90,10 140,70 130,150 50,150 40,70" fill="none" stroke={ice} strokeWidth="1" />
          <polygon points="90,30 125,75 120,130 60,130 55,75" fill="none" stroke={light} strokeWidth="0.5" />
          <line x1="90" y1="10" x2="90" y2="150" stroke={ice} strokeWidth="0.3" opacity="0.5" />
          <line x1="40" y1="70" x2="140" y2="70" stroke={ice} strokeWidth="0.3" opacity="0.5" />
        </svg>
        <svg className="fixed pointer-events-none hidden md:block" style={{ bottom: '15%', left: '3%', width: 120, height: 140, opacity: 0.10, transform: 'rotate(25deg)' }} viewBox="0 0 120 140">
          <polygon points="60,5 100,50 90,110 30,110 20,50" fill="none" stroke={light} strokeWidth="1" />
        </svg>

        <AnnouncementBar />

        {/* Header - heavy frosted glass */}
        <header
          className="sticky top-0 z-50 transition-all duration-300"
          style={{
            backgroundColor: scrolled ? 'rgba(232,244,253,0.75)' : 'rgba(232,244,253,0.50)',
            backdropFilter: `blur(${scrolled ? '50px' : '25px'}) saturate(1.8)`,
            borderBottom: `1px solid rgba(2,132,199,${scrolled ? '0.20' : '0.10'})`,
            boxShadow: scrolled ? '0 4px 30px rgba(2,132,199,0.08)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                {store.logo && <img src={store.logo} alt={store.name} className="h-8 w-auto" />}
                <h1
                  className="text-xl font-light tracking-widest uppercase"
                  style={{ fontFamily: "'Raleway', sans-serif", color: '#0C4A6E', letterSpacing: '0.2em' }}
                >
                  {store.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a href={`https://instagram.com/${store.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/40" style={{ color: '#4A7FA5' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
                  style={{
                    background: totalItems > 0 ? `linear-gradient(135deg, ${ice}, ${light})` : 'rgba(255,255,255,0.60)',
                    color: totalItems > 0 ? '#FFFFFF' : '#0C2D48',
                    backdropFilter: 'blur(20px)',
                    border: totalItems > 0 ? 'none' : `1px solid rgba(2,132,199,0.20)`,
                    boxShadow: totalItems > 0 ? `0 4px 25px ${ice}40` : '0 2px 10px rgba(0,0,0,0.04)',
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
              <img ref={heroImgMobileRef} src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt={store.name} className="w-full h-auto max-h-[400px] object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, ${bg})` }} />
            </div>
            <div className="hidden md:block relative aspect-[16/5] overflow-hidden">
              <img ref={heroImgRef} src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt={store.name} className="w-full h-full object-cover" style={{ transform: 'scale(1.05)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bg}40 0%, transparent 30%, transparent 60%, ${bg} 100%)` }} />
            </div>
          </section>
        ) : (
          <section className="py-24 md:py-40 text-center relative overflow-hidden">
            {/* Frosted glass hero card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-xl h-48 md:h-56 rounded-3xl pointer-events-none" style={{
              background: 'rgba(255,255,255,0.35)',
              backdropFilter: 'blur(60px) saturate(1.5)',
              border: '1px solid rgba(255,255,255,0.50)',
              boxShadow: '0 8px 40px rgba(2,132,199,0.10), inset 0 1px 0 rgba(255,255,255,0.5)',
            }} />
            <div className="max-w-4xl mx-auto px-6 relative">
              <h2
                className="text-5xl md:text-8xl font-extralight tracking-widest uppercase"
                style={{
                  fontFamily: "'Raleway', sans-serif",
                  color: '#0C4A6E',
                  letterSpacing: '0.15em',
                  textShadow: '0 2px 20px rgba(2,132,199,0.15)',
                }}
              >
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-5 text-sm uppercase tracking-[0.4em] font-light" style={{ color: ice }}>{store.about.slogan}</p>
              )}
              {store.whatsapp && (
                <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={() => onWhatsAppClick?.()} className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-xl font-medium transition-all hover:scale-105" style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 25px #25D36630' }}>
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
