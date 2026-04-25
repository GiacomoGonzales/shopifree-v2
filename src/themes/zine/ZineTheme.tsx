/**
 * ZINE THEME - "FANZINE PUNK FOTOCOPIADO"
 *
 * Filosofia: Fanzine DIY hecho con tijeras y fotocopiadora.
 * - Blanco y negro alto contraste, ruido de fotocopia
 * - Tipografia ransom-note: alterna serif/mono/uppercase rotados
 * - Cinta scotch + grapas decorativas
 * - Texto rotado en angulos imprevistos
 * - Acento rojo punk solo para destacados
 * Ideal para: indie fashion, music merch, marcas activistas, streetwear.
 */

import { useState, useEffect, useMemo } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
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
import { useHeaderLogo } from '../shared/useHeaderLogo'
import HeroImg from '../../components/catalog/HeroImg'

const zineTheme: ThemeConfig = {
  colors: {
    background: '#EFEDE6',
    surface: '#FFFFFF',
    surfaceHover: '#F4F2EB',
    text: '#0A0A0A',
    textMuted: '#3A3A3A',
    textInverted: '#EFEDE6',
    primary: '#0A0A0A',
    primaryHover: '#1A1A1A',
    accent: '#E11414',
    border: '#0A0A0A',
    badge: '#E11414',
    badgeText: '#EFEDE6',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'Special Elite', 'Courier New', monospace",
    body: "'Anonymous Pro', 'Courier New', monospace",
  },
  shadows: {
    sm: '2px 2px 0 0 #0A0A0A',
    md: '4px 4px 0 0 #0A0A0A',
    lg: '6px 6px 0 0 #0A0A0A',
  },
  effects: {
    cardHover: 'rotate-1',
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
  initialProduct?: Product | null
}

// Renders a string with each character on a different rotation/font, ransom-note style
function RansomText({ text, baseSize = '4rem' }: { text: string; baseSize?: string }) {
  const fonts = [
    "'Special Elite', monospace",
    "'Bebas Neue', sans-serif",
    "'Anonymous Pro', monospace",
    "'Bangers', sans-serif",
    "Georgia, serif",
    "Impact, sans-serif",
  ]
  return (
    <span className="inline-flex flex-wrap items-baseline justify-center" style={{ lineHeight: '1' }}>
      {text.split('').map((char, i) => {
        if (char === ' ') return <span key={i} style={{ width: '0.4em' }} />
        const rotation = ((i * 37) % 14) - 7
        const yOffset = ((i * 23) % 8) - 4
        const fontIdx = (i * 5) % fonts.length
        const isAccent = i % 4 === 0
        return (
          <span
            key={i}
            style={{
              fontFamily: fonts[fontIdx],
              transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
              display: 'inline-block',
              padding: '0 0.04em',
              backgroundColor: isAccent ? '#0A0A0A' : 'transparent',
              color: isAccent ? '#EFEDE6' : '#0A0A0A',
              fontSize: baseSize,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {char}
          </span>
        )
      })}
    </span>
  )
}

export default function ZineTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName } = useHeaderLogo(store)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
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

  return (
    <ThemeProvider theme={zineTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Anonymous+Pro:wght@400;700&family=Bebas+Neue&family=Bangers&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: '#EFEDE6',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.95' /%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.10 0' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
          fontFamily: "'Anonymous Pro', monospace",
          color: '#0A0A0A',
        }}
      >
        <AnnouncementBar />

        {/* Header */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(239,237,230,0.94)' : '#EFEDE6',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '3px solid #0A0A0A',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-9 w-auto object-contain" />}
              {showName && (
                <span
                  className="text-xl md:text-2xl uppercase font-bold tracking-tight"
                  style={{
                    fontFamily: "'Special Elite', monospace",
                    color: '#EFEDE6',
                    backgroundColor: '#0A0A0A',
                    padding: '2px 8px',
                    transform: 'rotate(-1deg)',
                    display: 'inline-block',
                  }}
                >
                  {store.name}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 uppercase text-sm font-bold transition-transform hover:rotate-1"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: '0.1em',
                backgroundColor: '#E11414',
                color: '#EFEDE6',
                border: '2px solid #0A0A0A',
                boxShadow: '3px 3px 0 0 #0A0A0A',
              }}
            >
              {(store.language === 'en' ? '$$ BAG' : '$$ BOLSA')} [{totalItems}]
            </button>
          </div>
        </header>

        {/* Hero — collage */}
        <section className="relative py-12 md:py-20 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            {/* Tape strips */}
            <div className="absolute top-4 left-1/4 w-28 h-7 bg-yellow-200/80 opacity-80" style={{ transform: 'rotate(-12deg)', boxShadow: '1px 2px 6px rgba(0,0,0,0.18)' }} />
            <div className="absolute top-8 right-1/3 w-24 h-7 bg-yellow-200/80 opacity-75" style={{ transform: 'rotate(8deg)', boxShadow: '1px 2px 6px rgba(0,0,0,0.18)' }} />

            <div className="text-center">
              <p
                className="inline-block uppercase tracking-widest mb-6 text-xs px-3 py-1.5"
                style={{
                  fontFamily: "'Special Elite', monospace",
                  backgroundColor: '#0A0A0A',
                  color: '#EFEDE6',
                  transform: 'rotate(-2deg)',
                }}
              >
                ★ ISSUE ZERO ★ {store.language === 'en' ? 'NOT FOR SALE' : 'NO ES PARA VENDER'}
              </p>

              <div className="my-6">
                <RansomText text={store.name.toUpperCase()} baseSize="clamp(2.5rem, 8vw, 5.5rem)" />
              </div>

              {store.about?.slogan && (
                <p
                  className="inline-block mt-4 text-base md:text-xl px-3 py-1.5 uppercase font-bold"
                  style={{
                    fontFamily: "'Anonymous Pro', monospace",
                    backgroundColor: '#E11414',
                    color: '#EFEDE6',
                    transform: 'rotate(1deg)',
                  }}
                >
                  &gt; {store.about.slogan}
                </p>
              )}
            </div>

            {(store.heroImage || store.heroImageMobile) && (
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="md:col-span-2 aspect-[16/10] overflow-hidden relative"
                  style={{
                    border: '3px solid #0A0A0A',
                    boxShadow: '6px 6px 0 0 #0A0A0A',
                    filter: 'grayscale(0.85) contrast(1.4) brightness(0.95)',
                    transform: 'rotate(-1deg)',
                  }}
                >
                  <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                </div>
                <div
                  className="hidden md:flex flex-col justify-between p-4"
                  style={{
                    border: '3px solid #0A0A0A',
                    boxShadow: '6px 6px 0 0 #E11414',
                    backgroundColor: '#FFFFFF',
                    transform: 'rotate(2deg)',
                  }}
                >
                  <p className="text-xs uppercase tracking-widest" style={{ fontFamily: "'Special Elite', monospace" }}>
                    [ {store.language === 'en' ? 'manifesto' : 'manifesto'} ]
                  </p>
                  <p className="text-base md:text-lg font-bold leading-tight uppercase" style={{ fontFamily: "'Special Elite', monospace" }}>
                    {store.language === 'en'
                      ? 'CUT · PASTE · WEAR · REPEAT.'
                      : 'CORTA · PEGA · USA · REPITE.'}
                  </p>
                  <div className="text-xs flex justify-between items-center" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                    <span>EST. {new Date().getFullYear() - 2}</span>
                    <span>★★★</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section header */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2">
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 uppercase text-base font-bold"
              style={{
                fontFamily: "'Special Elite', monospace",
                backgroundColor: '#0A0A0A',
                color: '#EFEDE6',
                transform: 'rotate(-1deg)',
                display: 'inline-block',
              }}
            >
              {store.language === 'en' ? '// THE GOODS' : '// EL BOTIN'}
            </span>
            <span className="text-xs" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
              ░░░░░░░░░░░░░░ {filteredProducts.length} ░░░░░░░░░░░░░░
            </span>
          </div>
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-16 md:pb-24">
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleAddToCart}
            categories={categories}
          />
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
