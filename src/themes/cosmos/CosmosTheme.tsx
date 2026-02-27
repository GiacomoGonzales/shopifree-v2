/**
 * COSMOS THEME - PREMIUM - "ESPACIO PROFUNDO"
 *
 * Efecto WOW: Cielo estrellado denso con 200+ estrellas titilantes,
 * multiples estrellas fugaces con trails, nebulas vibrantes,
 * constelaciones SVG decorativas, pulsating star clusters.
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

const cosmosTheme: ThemeConfig = {
  colors: {
    background: '#04060E',
    surface: 'rgba(80, 100, 255, 0.08)',
    surfaceHover: 'rgba(80, 100, 255, 0.14)',
    text: '#E8EAFF',
    textMuted: '#7B82A8',
    textInverted: '#04060E',
    primary: '#00E5FF',
    primaryHover: '#00B8D4',
    accent: '#B388FF',
    border: 'rgba(100, 120, 255, 0.15)',
    badge: '#00E5FF',
    badgeText: '#04060E',
  },
  radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem', full: '9999px' },
  fonts: {
    heading: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 0 15px rgba(0, 229, 255, 0.10)',
    md: '0 0 30px rgba(0, 229, 255, 0.15)',
    lg: '0 0 60px rgba(0, 229, 255, 0.20)',
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

// Dense star field - 3 layers
function genStars(n: number, max: number, sz: number, c: string): string {
  const s: string[] = []
  for (let i = 0; i < n; i++) s.push(`${Math.random() * max | 0}px ${Math.random() * max | 0}px 0 ${sz}px ${c}`)
  return s.join(',')
}
const stars1 = genStars(80, 2500, 0, 'rgba(255,255,255,0.9)')
const stars2 = genStars(35, 2500, 0.5, 'rgba(180,200,255,0.8)')
const stars3 = genStars(12, 2500, 1, 'rgba(150,180,255,1)')

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
  onProductView?: (product: Product) => void
  onCartAdd?: (product: Product) => void
  initialProduct?: Product | null
}

export default function CosmosTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
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
          const offset = window.scrollY * 0.25
          if (heroImgRef.current) heroImgRef.current.style.transform = `translateY(${offset}px) scale(1.1)`
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

  const cyan = '#00E5FF'
  const purple = '#B388FF'
  const bg = '#04060E'

  return (
    <ThemeProvider theme={cosmosTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative" style={{ backgroundColor: bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* ═══ STAR FIELD ═══ */}
        <div className="fixed inset-0 pointer-events-none" style={{ boxShadow: stars1, animation: 'cosmosTwinkle 3s ease-in-out infinite' }} />
        <div className="fixed inset-0 pointer-events-none" style={{ boxShadow: stars2, animation: 'cosmosTwinkle 5s ease-in-out infinite 1s' }} />
        <div className="fixed inset-0 pointer-events-none" style={{ boxShadow: stars3, animation: 'cosmosTwinkle 7s ease-in-out infinite 0.5s' }} />

        {/* ═══ SHOOTING STARS - 5 at staggered delays ═══ */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[
            { top: '8%', left: '-5%', w: 150, delay: '0s', dur: '4s', angle: -35, color: cyan },
            { top: '30%', left: '-5%', w: 120, delay: '3s', dur: '5s', angle: -25, color: purple },
            { top: '50%', left: '-5%', w: 160, delay: '7s', dur: '4.5s', angle: -35, color: '#ffffff' },
          ].map((s, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: s.top, left: s.left, width: s.w, height: 2,
                background: `linear-gradient(90deg, ${s.color}00, ${s.color}cc ${30}%, ${s.color}00)`,
                filter: `blur(0.5px) drop-shadow(0 0 6px ${s.color})`,
                animation: `cosmosShootingStar ${s.dur} linear infinite ${s.delay}`,
                transform: `rotate(${s.angle}deg)`,
              }}
            />
          ))}
        </div>

        {/* ═══ NEBULA - vivid, large, animated ═══ */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 15% 40%, ${purple}40 0%, transparent 60%),
              radial-gradient(ellipse 50% 60% at 80% 25%, ${cyan}25 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 50% 85%, rgba(100,50,200,0.18) 0%, transparent 55%),
              radial-gradient(ellipse 30% 30% at 65% 60%, rgba(0,150,255,0.12) 0%, transparent 50%)
            `,
            backgroundSize: '200% 200%',
            animation: 'auroraShift 25s ease-in-out infinite',
          }}
        />

        {/* ═══ CONSTELLATION SVG decorative ═══ */}
        <svg className="fixed pointer-events-none hidden md:block" style={{ top: '5%', right: '8%', width: 200, height: 200, opacity: 0.15 }} viewBox="0 0 200 200">
          <circle cx="30" cy="40" r="2" fill="white" /><circle cx="80" cy="20" r="2.5" fill="white" />
          <circle cx="140" cy="50" r="2" fill="white" /><circle cx="170" cy="90" r="3" fill="white" />
          <circle cx="120" cy="130" r="2" fill="white" /><circle cx="60" cy="110" r="2.5" fill="white" />
          <circle cx="100" cy="170" r="2" fill="white" />
          <line x1="30" y1="40" x2="80" y2="20" stroke="white" strokeWidth="0.5" opacity="0.4" />
          <line x1="80" y1="20" x2="140" y2="50" stroke="white" strokeWidth="0.5" opacity="0.4" />
          <line x1="140" y1="50" x2="170" y2="90" stroke="white" strokeWidth="0.5" opacity="0.4" />
          <line x1="170" y1="90" x2="120" y2="130" stroke="white" strokeWidth="0.5" opacity="0.4" />
          <line x1="120" y1="130" x2="60" y2="110" stroke="white" strokeWidth="0.5" opacity="0.4" />
          <line x1="60" y1="110" x2="100" y2="170" stroke="white" strokeWidth="0.5" opacity="0.4" />
          <line x1="60" y1="110" x2="30" y2="40" stroke="white" strokeWidth="0.5" opacity="0.4" />
        </svg>

        <AnnouncementBar />

        {/* Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-2xl' : 'backdrop-blur-sm'}`}
          style={{
            backgroundColor: scrolled ? 'rgba(4,6,14,0.92)' : 'rgba(4,6,14,0.5)',
            borderBottom: `1px solid rgba(0,229,255,${scrolled ? '0.15' : '0.06'})`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                {store.logo && <img src={store.logo} alt={store.name} className="h-8 w-auto" />}
                <h1
                  className="text-xl font-bold tracking-wide animate-gradient-text"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundImage: `linear-gradient(135deg, ${purple}, ${cyan}, #fff, ${purple})`,
                    backgroundSize: '300% auto',
                  }}
                >
                  {store.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a href={`https://instagram.com/${store.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/5" style={{ color: '#7B82A8' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: totalItems > 0 ? `linear-gradient(135deg, ${cyan}, ${purple})` : 'rgba(100,120,255,0.08)',
                    color: totalItems > 0 ? bg : '#E8EAFF',
                    backdropFilter: 'blur(12px)',
                    border: totalItems > 0 ? 'none' : `1px solid rgba(0,229,255,0.15)`,
                    boxShadow: totalItems > 0 ? `0 0 25px ${cyan}50, 0 0 50px ${purple}30` : 'none',
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
              <img ref={heroImgMobileRef} src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')} alt={store.name} className="w-full h-auto max-h-[400px] object-cover" style={{ filter: 'brightness(0.7)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${bg})` }} />
            </div>
            <div className="hidden md:block relative aspect-[16/5] overflow-hidden">
              <img ref={heroImgRef} src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')} alt={store.name} className="w-full h-full object-cover" style={{ transform: 'scale(1.1)', filter: 'brightness(0.7)' }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bg}50 0%, transparent 30%, transparent 60%, ${bg} 100%)` }} />
            </div>
          </section>
        ) : (
          <section className="py-24 md:py-40 text-center relative overflow-hidden">
            {/* Pulsating star cluster behind title */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: `radial-gradient(circle, ${cyan}15 0%, ${purple}10 30%, transparent 60%)`, animation: 'glowPulse 3s ease-in-out infinite' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full" style={{ background: `radial-gradient(circle, ${purple}20 0%, transparent 70%)`, animation: 'glowPulse 4s ease-in-out infinite 1s' }} />
            </div>
            <div className="max-w-4xl mx-auto px-6 relative">
              <h2
                className="text-5xl md:text-8xl font-bold tracking-tight animate-gradient-text"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  backgroundImage: `linear-gradient(135deg, ${purple}, ${cyan}, #fff, ${purple})`,
                  backgroundSize: '300% auto',
                  filter: `drop-shadow(0 0 30px ${cyan}40)`,
                }}
              >
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="mt-6 text-base uppercase tracking-[0.4em] font-light" style={{ color: cyan, textShadow: `0 0 20px ${cyan}40` }}>{store.about.slogan}</p>
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

        {/* ═══ NEBULA DIVIDER between nav and products ═══ */}
        <div className="relative h-px my-2">
          <div className="absolute inset-x-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${cyan}40, ${purple}40, transparent)` }} />
        </div>

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
