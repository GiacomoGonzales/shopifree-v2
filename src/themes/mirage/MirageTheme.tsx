/**
 * MIRAGE THEME - PREMIUM - "DESIERTO CALIDO"
 *
 * Efecto WOW: Gradient bands VISIBLES animadas, heat distortion SVG
 * aplicado al hero, warm glow intenso, sand particles flotantes,
 * titulo serif dramatico con drop-shadow amber.
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

const mirageTheme: ThemeConfig = {
  colors: {
    background: '#150A04',
    surface: 'rgba(255, 170, 80, 0.08)',
    surfaceHover: 'rgba(255, 170, 80, 0.14)',
    text: '#FDE8D0',
    textMuted: '#A07B5A',
    textInverted: '#150A04',
    primary: '#F59E0B',
    primaryHover: '#D97706',
    accent: '#EF4444',
    border: 'rgba(245, 158, 11, 0.15)',
    badge: '#F59E0B',
    badgeText: '#150A04',
  },
  radius: { sm: '0.375rem', md: '0.625rem', lg: '0.875rem', xl: '1.25rem', full: '9999px' },
  fonts: {
    heading: "'Fraunces', 'Georgia', serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 0 20px rgba(245, 158, 11, 0.10)',
    md: '0 0 35px rgba(245, 158, 11, 0.15)',
    lg: '0 0 60px rgba(245, 158, 11, 0.20)',
  },
  effects: {
    cardHover: 'scale-105',
    buttonHover: 'scale-105',
    headerBlur: true,
    darkMode: true,
    glassMorphism: true,
    tilt3D: false,
    animatedBorder: true,
  },
}

// Sand particles
const sandParticles = Array.from({ length: 7 }, (_, i) => ({
  size: 1 + (i % 3),
  left: 8 + ((i * 13 + 7) % 84),
  delay: (i * 2.3) % 10,
  duration: 18 + (i % 5) * 4,
  opacity: 0.25 + (i % 3) * 0.1,
}))

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
  onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void
  initialProduct?: Product | null
}

export default function MirageTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
  const heatRef = useRef<SVGFETurbulenceElement>(null)

  useEffect(() => {
    let rafId = 0
    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 30)
        if (heroRef.current && heroRef.current.getBoundingClientRect().bottom > 0) {
          const offset = window.scrollY * 0.3
          if (heroImgRef.current) heroImgRef.current.style.transform = `translateY(${offset}px) scale(1.1)`
          if (heroImgMobileRef.current) heroImgMobileRef.current.style.transform = `translateY(${offset * 0.5}px)`
        }
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => { window.removeEventListener('scroll', handleScroll); cancelAnimationFrame(rafId) }
  }, [])

  // Animate heat distortion
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return
    let rafId = 0
    let time = 0
    const animate = () => {
      time += 0.008
      if (heatRef.current) {
        const f = 0.012 + Math.sin(time) * 0.006
        heatRef.current.setAttribute('baseFrequency', `${f} ${f * 1.5}`)
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const filteredProducts = useMemo(() => {
    return activeCategory ? products.filter(p => p.categoryId === activeCategory) : products
  }, [products, activeCategory])

  const handleSelectProduct = (product: Product) => { setSelectedProduct(product); onProductView?.(product) }
  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => { addItem(product, extras); onCartAdd?.(product) }

  const amber = '#F59E0B'
  const red = '#EF4444'
  const bg = '#150A04'

  return (
    <ThemeProvider theme={mirageTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* SVG heat distortion filter */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="mirageHeat">
            <feTurbulence ref={heatRef} type="fractalNoise" baseFrequency="0.012 0.018" numOctaves={3} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={8} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="min-h-screen relative" style={{ backgroundColor: bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* ═══ GRADIENT BANDS - VISIBLE ═══ */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `repeating-linear-gradient(
            180deg,
            transparent 0px,
            rgba(245,158,11,0.07) 60px,
            transparent 120px,
            rgba(239,68,68,0.05) 180px,
            transparent 240px,
            rgba(245,158,11,0.04) 300px,
            transparent 360px
          )`,
          backgroundSize: '100% 500px',
          animation: 'mirageBands 15s linear infinite',
        }} />

        {/* ═══ WARM GLOW - INTENSE ═══ */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 60% 50% at 25% 70%, ${amber}20 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 75% 25%, ${red}12 0%, transparent 50%),
            radial-gradient(ellipse 80% 30% at 50% 90%, ${amber}10 0%, transparent 40%)
          `,
          animation: 'glowPulse 5s ease-in-out infinite',
        }} />

        {/* ═══ SAND PARTICLES floating up ═══ */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {sandParticles.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size, height: p.size,
                left: `${p.left}%`,
                bottom: '-2%',
                background: `rgba(245,158,11,${p.opacity})`,
                boxShadow: `0 0 ${p.size * 2}px rgba(245,158,11,0.3)`,
                animation: `glacierParticleDrift ${p.duration}s linear infinite ${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* ═══ HEAT SHIMMER LINE at horizon ═══ */}
        <div className="fixed left-0 right-0 pointer-events-none hidden md:block" style={{
          top: '35%', height: '3px',
          background: `linear-gradient(90deg, transparent 10%, ${amber}15 30%, ${amber}25 50%, ${amber}15 70%, transparent 90%)`,
          animation: 'mirageHeatWave 3s ease-in-out infinite',
        }} />

        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-2xl' : 'backdrop-blur-md'}`}
          style={{
            backgroundColor: scrolled ? 'rgba(21,10,4,0.90)' : 'rgba(21,10,4,0.50)',
            borderBottom: `1px solid rgba(245,158,11,${scrolled ? '0.15' : '0.06'})`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                {store.logo && <img src={store.logo} alt={store.name} className="h-8 w-auto" />}
                <h1
                  className="text-xl font-semibold"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    color: amber,
                    textShadow: `0 0 30px ${amber}40, 0 0 60px ${amber}20`,
                  }}
                >
                  {store.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a href={`https://instagram.com/${store.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/5" style={{ color: '#A07B5A' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: totalItems > 0 ? `linear-gradient(135deg, ${amber}, ${red})` : 'rgba(255,170,80,0.08)',
                    color: totalItems > 0 ? '#fff' : '#FDE8D0',
                    backdropFilter: 'blur(12px)',
                    border: totalItems > 0 ? 'none' : `1px solid rgba(245,158,11,0.18)`,
                    boxShadow: totalItems > 0 ? `0 0 25px ${amber}50, 0 0 50px ${red}25` : 'none',
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  {totalItems > 0 && <span>{totalItems}</span>}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero with heat distortion */}
        {(store.heroImage || store.heroImageMobile) ? (
          <section ref={heroRef} className="relative overflow-hidden">
            <div className="md:hidden relative">
              <img ref={heroImgMobileRef} src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt={store.name} className="w-full h-auto max-h-[400px] object-cover" style={{ filter: 'brightness(0.8) saturate(1.3) sepia(0.15)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${bg})` }} />
            </div>
            <div className="hidden md:block relative aspect-[16/5] overflow-hidden" style={{ filter: 'url(#mirageHeat)' }}>
              <img ref={heroImgRef} src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt={store.name} className="w-full h-full object-cover" style={{ transform: 'scale(1.1)', filter: 'brightness(0.8) saturate(1.3) sepia(0.15)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bg}50 0%, transparent 30%, transparent 50%, ${bg} 90%)` }} />
            </div>
          </section>
        ) : (
          <section className="py-28 md:py-44 text-center relative overflow-hidden">
            {/* Intense warm glow behind title */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px]" style={{
                background: `radial-gradient(ellipse, ${amber}25 0%, ${red}10 40%, transparent 65%)`,
                animation: 'glowPulse 4s ease-in-out infinite',
              }} />
            </div>
            <div className="max-w-4xl mx-auto px-6 relative">
              <h2
                className="text-5xl md:text-8xl font-semibold tracking-tight"
                style={{
                  fontFamily: "'Fraunces', serif",
                  color: '#FDE8D0',
                  textShadow: `0 0 50px ${amber}30, 0 0 100px ${amber}15`,
                }}
              >
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-6 text-base uppercase tracking-[0.3em] font-light" style={{ color: amber, textShadow: `0 0 15px ${amber}30` }}>{store.about.slogan}</p>
              )}
              {/* Desert ornament */}
              <div className="flex items-center justify-center gap-3 mt-6">
                <div className="h-px w-12" style={{ background: `linear-gradient(90deg, transparent, ${amber}30)` }} />
                <svg width="20" height="12" viewBox="0 0 20 12" style={{ opacity: 0.3 }}><path d="M0 12 L10 0 L20 12" fill="none" stroke={amber} strokeWidth="1" /></svg>
                <div className="h-px w-12" style={{ background: `linear-gradient(90deg, ${amber}30, transparent)` }} />
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
