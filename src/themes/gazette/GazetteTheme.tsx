/**
 * GAZETTE THEME - "PERIODICO CLASICO"
 *
 * Filosofia: Gaceta antigua impresa — masthead grande con flourishes, columnas,
 * tipografia Old-Style serif, rules ornamentales y fecha de edicion.
 * - Papel cream con leve textura tipo newsprint
 * - Tipografia: Old Standard TT (display) + Lora (body)
 * - Reglas dobles, dropcaps, marcas de mano (▶)
 * Ideal para: editoriales, marcas de te/cafe clasicas, sastreria, anticuarios, mens-wear vintage.
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

const gazetteTheme: ThemeConfig = {
  colors: {
    background: '#F4EFE3',
    surface: '#FBF7EC',
    surfaceHover: '#F0EAD8',
    text: '#1B1610',
    textMuted: '#5A4F40',
    textInverted: '#F4EFE3',
    primary: '#1B1610',
    primaryHover: '#2A2218',
    accent: '#7A1F1F',
    border: '#1B1610',
    badge: '#1B1610',
    badgeText: '#F4EFE3',
  },
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  fonts: {
    heading: "'Old Standard TT', 'Times New Roman', serif",
    body: "'Lora', Georgia, serif",
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
  },
  effects: {
    cardHover: 'scale-[1.01]',
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

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
function toRoman(n: number): string {
  if (n < ROMAN_NUMERALS.length) return ROMAN_NUMERALS[n]
  return String(n)
}

export default function GazetteTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const { src: headerLogo, showName } = useHeaderLogo(store, { squareStyle: 'rounded' })
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

  const today = new Date()
  const issueDate = today.toLocaleDateString(store.language === 'en' ? 'en-US' : 'es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase()
  const volume = toRoman(today.getFullYear() - 2000)
  const issueNo = today.getMonth() + 1

  return (
    <ThemeProvider theme={gazetteTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen"
        style={{
          backgroundColor: '#F4EFE3',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' /%3E%3CfeColorMatrix values='0 0 0 0 0.32 0 0 0 0 0.27 0 0 0 0 0.18 0 0 0 0.06 0' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
          fontFamily: "'Lora', Georgia, serif",
          color: '#1B1610',
        }}
      >
        <AnnouncementBar />

        {/* Slim sticky bar — always visible, keeps CategoryNav close to the top
            when scrolling. The big masthead below stays static so it doesn't
            push the category bar halfway down the viewport. */}
        <header
          className="sticky top-0 z-50 transition-colors"
          style={{
            backgroundColor: scrolled ? 'rgba(244,239,227,0.95)' : '#F4EFE3',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: '1px solid #1B1610',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-12 flex items-center justify-between text-[10px] tracking-[0.2em] uppercase">
            <span>{`VOL. ${volume}`}</span>
            <span className="hidden md:inline" style={{ color: '#5A4F40' }}>{issueDate}</span>
            <div className="flex items-center gap-3">
              {showName && (
                <span className="hidden sm:inline" style={{ fontFamily: "'Old Standard TT', serif", textTransform: 'none', letterSpacing: 'normal', fontSize: '0.9rem', fontWeight: 700 }}>
                  {store.name}
                </span>
              )}
              <button onClick={() => setIsCartOpen(true)} className="hover:underline underline-offset-4">
                {(store.language === 'en' ? 'Bag' : 'Bolsa')} ({totalItems})
              </button>
            </div>
          </div>
        </header>

        {/* Masthead — large, static (not sticky) so it scrolls away naturally. */}
        <section>
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-4">
            {/* Issue meta line */}
            <div className="flex items-center justify-between mb-3 text-[10px] tracking-[0.25em] uppercase" style={{ color: '#5A4F40' }}>
              <span>{store.language === 'en' ? 'EST. ' : 'FUNDADO '}{(today.getFullYear() - 1).toString()}</span>
              <span className="md:hidden">{`No. ${issueNo}`}</span>
              <span className="hidden md:inline">{issueDate}</span>
            </div>

            {/* Double rule */}
            <div className="border-t-2 border-b border-black mb-4" style={{ borderTopWidth: 4 }} />

            {/* Title */}
            <div className="flex items-center justify-center gap-3 md:gap-4">
              {headerLogo && <img src={headerLogo} alt={store.name} className="h-9 md:h-14 w-auto object-contain" />}
              {showName && (
                <h1
                  className="text-center text-3xl sm:text-5xl md:text-7xl lg:text-8xl leading-none tracking-tight"
                  style={{ fontFamily: "'Old Standard TT', serif", fontWeight: 700, color: '#1B1610' }}
                >
                  {store.name}
                </h1>
              )}
            </div>

            {/* Subtitle / motto */}
            {store.about?.slogan && (
              <p
                className="text-center mt-3 text-xs md:text-base italic px-2"
                style={{ fontFamily: "'Old Standard TT', serif", color: '#5A4F40' }}
              >
                &mdash; {store.about.slogan} &mdash;
              </p>
            )}

            {/* Double rule below */}
            <div className="border-t border-b-2 border-black mt-4" style={{ borderBottomWidth: 4 }} />
          </div>
        </section>

        {/* Hero — feature article */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-7">
              <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#7A1F1F' }}>
                ▶ {store.language === 'en' ? 'Feature article' : 'Articulo de portada'}
              </p>
              <h2
                className="text-3xl md:text-5xl leading-tight tracking-tight"
                style={{ fontFamily: "'Old Standard TT', serif", fontWeight: 700, color: '#1B1610' }}
              >
                {store.about?.slogan
                  ? store.about.slogan
                  : (store.language === 'en' ? `A close look at ${store.name}` : `Un retrato de ${store.name}`)}
              </h2>
              <div className="mt-4 columns-1 sm:columns-2 gap-6 text-sm md:text-base leading-relaxed" style={{ color: '#1B1610' }}>
                <p>
                  <span
                    className="float-left mr-2 mt-1 text-[2.75rem] md:text-[4rem]"
                    style={{
                      fontFamily: "'Old Standard TT', serif",
                      lineHeight: '0.85',
                      fontWeight: 700,
                      color: '#7A1F1F',
                    }}
                  >
                    {store.name.charAt(0).toUpperCase()}
                  </span>
                  {store.about?.description ||
                    (store.language === 'en'
                      ? `${store.name} brings together a careful selection of pieces, each one chosen with as much attention as the editor of an old gazette would lavish on a dispatch worth printing.`
                      : `${store.name} reune una seleccion cuidadosa de piezas, cada una elegida con la misma atencion que el editor de una vieja gaceta dedicaria a un parte digno de imprimirse.`)}
                </p>
              </div>
            </div>
            <div className="md:col-span-5">
              {(store.heroImage || store.heroImageMobile) ? (
                <figure>
                  <div className="aspect-[4/5] overflow-hidden" style={{ filter: 'grayscale(0.55) contrast(1.05)' }}>
                    <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
                  </div>
                  <figcaption className="mt-2 text-xs italic text-center" style={{ color: '#5A4F40', fontFamily: "'Old Standard TT', serif" }}>
                    {store.language === 'en' ? `Photographed for ${store.name}, ${today.getFullYear()}` : `Fotografiado para ${store.name}, ${today.getFullYear()}`}
                  </figcaption>
                </figure>
              ) : (
                <div className="aspect-[4/5] border border-black flex items-center justify-center text-center px-6" style={{ background: 'repeating-linear-gradient(0deg, transparent 0 22px, rgba(0,0,0,0.05) 22px 23px)' }}>
                  <p className="italic text-sm" style={{ fontFamily: "'Old Standard TT', serif", color: '#5A4F40' }}>
                    [ {store.language === 'en' ? 'engraving forthcoming' : 'grabado en preparacion'} ]
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <TrustBar />
        <FlashSaleBar />

        {/* Section header with double rule */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
          <div className="border-t-2 border-b border-black py-3 flex items-center justify-between gap-3" style={{ borderTopWidth: 4 }}>
            <span className="text-[10px] md:text-xs tracking-[0.3em] uppercase">{store.language === 'en' ? 'Classifieds' : 'Anuncios'}</span>
            <span className="hidden md:inline text-xs tracking-[0.3em] uppercase italic" style={{ fontFamily: "'Old Standard TT', serif", color: '#7A1F1F' }}>
              {store.language === 'en' ? 'Wares & Notices' : 'Mercaderias y avisos'}
            </span>
            <span className="text-[10px] md:text-xs tracking-[0.3em] uppercase">{filteredProducts.length} {store.language === 'en' ? 'items' : 'piezas'}</span>
          </div>
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={products}
          onSelectProduct={handleSelectProduct}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 pb-16 md:pb-20">
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
