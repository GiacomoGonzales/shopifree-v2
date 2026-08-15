/**
 * FIESTA THEME - "PIZZERIA NOCTURNA DEL PANDA"
 *
 * Filosofia: el mundo entero es morado y la comida es la que brilla.
 * No es una paleta sobre la estructura de siempre: es una escena.
 *
 * Dispositivos propios (a la altura de Arcade/Diner/Comic/Toyland):
 * - Fondo morado profundo con porciones de pizza SVG flotando, cada una con
 *   su ritmo y su rotacion (keyframes propios `fiesta-bob`).
 * - Borde de queso derretido colgando del header y sobre el footer: un SVG
 *   de goteo dorado dibujado a mano (CheeseDrip).
 * - Banda marquesina dorada girada -1.2deg con el nombre de la tienda en
 *   bucle infinito, como letrero de pizzeria (keyframes `fiesta-marquee`).
 * - Hero sin foto: un PANDA dibujado en SVG (orejas, parches, sonrisa)
 *   mordiendo una porcion, sobre el arco dorado radial del logo.
 * - Estetica sticker: contornos blancos gruesos en todo lo interactivo.
 * - Tarjetas moradas mas claras que el fondo, con hover que se ladea.
 *
 * Toda la logica (carrito, filtros, checkout, drawers) es la compartida.
 * Respeta prefers-reduced-motion: las animaciones se apagan.
 */

import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { useCart } from '../../hooks/useCart'
import { getThemeTranslations } from '../shared/translations'
import { useHeaderLogo } from '../shared/useHeaderLogo'
import {
  ThemeProvider,
  ProductGrid,
  ProductDrawer,
  CartDrawer,
  CartBar,
  CategoryCarousel,
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
import HeroImg from '../../components/catalog/HeroImg'
import { useProductFilters } from '../shared/useProductFilters'
import SortDropdown from '../shared/SortDropdown'
import FilterPanel from '../shared/FilterPanel'

// Paleta del logo: morado profundo, dorado, tinta y blanco sticker.
const MORADO_FONDO = '#2A0A55'
const MORADO_TARJETA = '#3A1173'
const MORADO_CLARO = '#A06BFF'
const DORADO = '#FFC42E'
const DORADO_HOVER = '#FFB300'
const TINTA = '#3D1170'
const BLANCO_CALIDO = '#FFF8EC'

const fiestaTheme: ThemeConfig = {
  colors: {
    background: MORADO_FONDO,
    surface: MORADO_TARJETA,
    surfaceHover: '#471D85',
    text: BLANCO_CALIDO,
    textMuted: '#C7B3E8',
    textInverted: TINTA,
    // El dorado es el color de accion: sobre tanto morado, un boton dorado
    // con texto tinta es lo unico que compite con la foto de la pizza.
    primary: DORADO,
    primaryHover: DORADO_HOVER,
    accent: MORADO_CLARO,
    border: '#5B2AA0',
    badge: DORADO,
    badgeText: TINTA,
  },
  radius: {
    sm: '0.85rem',
    md: '1.25rem',
    lg: '1.9rem',
    xl: '2.4rem',
    full: '9999px',
  },
  fonts: {
    heading: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
  },
  shadows: {
    sm: '0 3px 10px rgba(15, 2, 38, 0.35)',
    md: '0 8px 26px rgba(15, 2, 38, 0.45)',
    lg: '0 10px 44px rgba(255, 196, 46, 0.22)',
  },
  effects: {
    cardHover: 'translateY(-6px) rotate(-1.2deg)',
    buttonHover: 'scale-105',
    headerBlur: true,
    darkMode: true,
  },
}

/** Contorno blanco grueso: el rasgo sticker del logo. */
const outlined = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  border: '3px solid #ffffff',
  boxShadow: fiestaTheme.shadows.sm,
  ...extra,
})

// =====================================================
// SVGs PROPIOS DEL TEMA
// =====================================================

/**
 * Silueta de porcion de pizza, monocroma. Una sola forma en `currentColor`
 * con los pepperoni CALADOS (fillRule evenodd): el color lo decide quien la
 * usa, y a baja opacidad funciona como marca de agua sobre el morado.
 */
function PizzaSlice({ size = 44, rotate = 0, className = '', style = {} }: {
  size?: number; rotate?: number; className?: string; style?: React.CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}
         fill="currentColor"
         style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M32 60 L8 16 Q32 4 56 16 Z
           M32 22 a5.5 5.5 0 1 0 0.001 0 Z
           M23 35 a4.5 4.5 0 1 0 0.001 0 Z
           M39 35 a4.5 4.5 0 1 0 0.001 0 Z"
      />
    </svg>
  )
}

/** Cara del panda del logo: orejas, parches, sonrisa y cachetes dorados. */
function PandaFace({ size = 190 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 200 180" aria-hidden="true">
      {/* orejas */}
      <circle cx="42" cy="34" r="26" fill={TINTA} stroke="#fff" strokeWidth="5" />
      <circle cx="158" cy="34" r="26" fill={TINTA} stroke="#fff" strokeWidth="5" />
      <circle cx="42" cy="34" r="11" fill="#6D21CE" />
      <circle cx="158" cy="34" r="11" fill="#6D21CE" />
      {/* cabeza */}
      <ellipse cx="100" cy="98" rx="80" ry="74" fill="#fff" stroke={TINTA} strokeWidth="6" />
      {/* parches de los ojos */}
      <ellipse cx="63" cy="84" rx="21" ry="27" fill={TINTA} transform="rotate(-16 63 84)" />
      <ellipse cx="137" cy="84" rx="21" ry="27" fill={TINTA} transform="rotate(16 137 84)" />
      {/* ojos felices cerrados (arcos blancos dentro del parche) */}
      <path d="M53 84 Q63 74 73 84" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M127 84 Q137 74 147 84" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {/* cachetes */}
      <circle cx="52" cy="116" r="9" fill={DORADO} opacity="0.55" />
      <circle cx="148" cy="116" r="9" fill={DORADO} opacity="0.55" />
      {/* nariz y sonrisa */}
      <ellipse cx="100" cy="112" rx="9" ry="6.5" fill={TINTA} />
      <path d="M100 118 Q100 128 88 128 M100 118 Q100 128 112 128"
            stroke={TINTA} strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Goteo de queso: banda dorada con gotas colgando, dibujada a mano.
 * `flip` la invierte para usarla apoyada sobre el footer.
 */
function CheeseDrip({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1200 30" preserveAspectRatio="none" aria-hidden="true"
      className="block w-full h-[22px]"
      style={{ transform: flip ? 'scaleY(-1)' : undefined }}
    >
      <path
        d="M0,0 L1200,0 L1200,6
           C1150,6 1148,22 1120,22 C1092,22 1096,6 1050,6
           C1010,6 1012,28 980,28 C948,28 952,6 900,6
           C860,6 862,18 830,18 C798,18 802,6 750,6
           C712,6 714,26 680,26 C646,26 650,6 600,6
           C562,6 564,16 532,16 C500,16 504,6 450,6
           C412,6 414,24 380,24 C346,24 350,6 300,6
           C262,6 264,20 230,20 C196,20 200,6 150,6
           C114,6 116,25 80,25 C48,25 52,6 0,6 Z"
        fill={DORADO}
      />
    </svg>
  )
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

export default function FiestaTheme({ store, products, categories, onWhatsAppClick, onProductView, onCartAdd, initialProduct }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const t = getThemeTranslations(store.language)
  const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store)

  const {
    filteredProducts,
    availableFilters,
    activeFilters,
    setFilter,
    setVariationFilter,
    clearFilters,
    hasActiveFilters,
    sortBy,
    setSortBy,
  } = useProductFilters(products, categories)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onProductView?.(product)
  }

  const handleAddToCart = (product: Product, extras?: Parameters<typeof addItem>[1]) => {
    addItem(product, extras)
    onCartAdd?.(product)
  }

  // Porciones flotantes del fondo: posicion, tamano, giro y ritmo propios.
  const slicesFlotantes = [
    { top: '12%', left: '4%', size: 46, rotate: -18, dur: 7.5, delay: 0 },
    { top: '30%', left: '92%', size: 38, rotate: 24, dur: 9, delay: 1.2 },
    { top: '58%', left: '6%', size: 34, rotate: 40, dur: 8, delay: 2.1 },
    { top: '74%', left: '88%', size: 48, rotate: -30, dur: 10, delay: 0.6 },
    { top: '88%', left: '38%', size: 30, rotate: 12, dur: 8.5, delay: 1.8 },
    { top: '8%', left: '64%', size: 30, rotate: -8, dur: 9.5, delay: 2.6 },
  ]

  const marqueeItems = Array.from({ length: 10 })

  return (
    <ThemeProvider theme={fiestaTheme} store={store}>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fiesta-bob {
          0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
          50% { transform: translateY(-14px) rotate(calc(var(--rot, 0deg) + 6deg)); }
        }
        @keyframes fiesta-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes fiesta-pop {
          0% { transform: scale(0.92); }
          60% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .fiesta-bob { animation: fiesta-bob var(--dur, 8s) ease-in-out var(--delay, 0s) infinite; }
        .fiesta-marquee { animation: fiesta-marquee 26s linear infinite; }
        .fiesta-pop { animation: fiesta-pop 0.5s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .fiesta-bob, .fiesta-marquee, .fiesta-pop { animation: none; }
        }
      `}</style>

      <div className="min-h-screen relative" style={{ backgroundColor: MORADO_FONDO, fontFamily: fiestaTheme.fonts.body }}>
        {/* Cielo morado: glow dorado arriba (el arco del logo) y porciones
            flotando. pointer-events-none: es decoracion, no interfaz. */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[760px] rounded-full opacity-[0.16]"
               style={{ background: `radial-gradient(circle, ${DORADO} 0%, transparent 60%)` }} />
          <div className="absolute bottom-[-140px] left-[-120px] w-96 h-96 rounded-full opacity-[0.14]"
               style={{ background: `radial-gradient(circle, ${MORADO_CLARO} 0%, transparent 65%)` }} />
          {/* Siluetas blancas a muy baja opacidad: marca de agua, no caricatura. */}
          {slicesFlotantes.map((s, i) => (
            <div key={i} className="absolute fiesta-bob opacity-[0.10]"
                 style={{ top: s.top, left: s.left, color: '#ffffff', ['--rot' as string]: `${s.rotate}deg`, ['--dur' as string]: `${s.dur}s`, ['--delay' as string]: `${s.delay}s` }}>
              <PizzaSlice size={s.size} />
            </div>
          ))}
        </div>

        <AnnouncementBar />

        {/* Header con el queso goteando del borde inferior */}
        <header className="sticky top-0 z-50">
          <div
            className="transition-all duration-300"
            style={{
              backgroundColor: scrolled ? `${MORADO_FONDO}f0` : MORADO_FONDO,
              backdropFilter: scrolled ? 'blur(12px)' : undefined,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between h-[72px] gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {headerLogo && (
                    <img src={headerLogo} alt={store.name} className={logoClassName}
                         style={outlined({ borderRadius: '9999px', background: '#fff' })} />
                  )}
                  {showName && (
                    <h1 className="text-[1.4rem] leading-none truncate"
                        style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 700, color: '#fff' }}>
                      {store.name}
                    </h1>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {store.instagram && (
                    <a href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                       target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                       className="w-11 h-11 flex items-center justify-center rounded-full transition-transform hover:scale-110 hover:-rotate-6"
                       style={outlined({ background: MORADO_TARJETA, color: '#fff' })}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => setIsCartOpen(true)}
                    aria-label={t.cart}
                    className={`relative flex items-center gap-2 h-11 px-4 rounded-full transition-transform hover:scale-105 ${totalItems > 0 ? 'fiesta-pop' : ''}`}
                    style={outlined({
                      background: totalItems > 0 ? DORADO : MORADO_TARJETA,
                      color: totalItems > 0 ? TINTA : '#fff',
                    })}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {totalItems > 0 && (
                      <span className="text-sm" style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 700 }}>{totalItems}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* El goteo cuelga FUERA del flujo (top-full), por dos motivos:
              1) CategoryCarousel mide la altura del header para calcular su
                 sticky. Con el goteo adentro, la barra arrancaba donde este
                 terminaba y quedaba un borde/hueco entre ambos.
              2) Colgado en absoluto, el header mide 22px menos, la barra se
                 pega 22px mas arriba y el queso queda DERRAMADO ENCIMA de la
                 barra de categorias (header z-50 > barra z-40).
              pointer-events-none: es decoracion, que no tape clicks. */}
          <div className="absolute inset-x-0 top-full pointer-events-none">
            <CheeseDrip />
          </div>
        </header>

        {/* Hero */}
        {(store.heroImage || store.heroImageMobile) ? (
          <section className="relative px-4 sm:px-6 pt-6">
            <div className="max-w-7xl mx-auto overflow-hidden"
                 style={outlined({ borderRadius: fiestaTheme.radius.xl, boxShadow: fiestaTheme.shadows.md, borderWidth: '4px' })}>
              <div className="md:hidden">
                <HeroImg src={store.heroImageMobile || store.heroImage} alt={store.name} className="w-full h-auto max-h-[380px] object-cover" />
              </div>
              <div className="hidden md:block aspect-[16/5]">
                <HeroImg src={store.heroImage || store.heroImageMobile} alt={store.name} className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        ) : (
          /* Sin foto de portada: la escena del logo. Panda sobre arco dorado. */
          <section className="relative pt-10 pb-6 text-center overflow-hidden">
            <div className="relative max-w-3xl mx-auto px-6">
              <div className="relative inline-block">
                {/* arco dorado del logo */}
                <div className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[340px] md:h-[340px] rounded-full"
                     style={{ background: `radial-gradient(circle, ${DORADO} 0%, ${DORADO} 55%, transparent 72%)`, opacity: 0.9 }} />
                {/* destellos */}
                <span className="absolute -left-10 top-8 text-2xl select-none" style={{ color: '#fff' }} aria-hidden="true">✦</span>
                <span className="absolute -right-8 top-20 text-lg select-none" style={{ color: DORADO }} aria-hidden="true">✦</span>
                <span className="absolute left-2 bottom-4 text-lg select-none" style={{ color: DORADO }} aria-hidden="true">✦</span>
                <div className="relative fiesta-bob" style={{ ['--dur' as string]: '9s' }}>
                  <PandaFace size={200} />
                </div>
                {/* la porcion que esta mordiendo: silueta en tinta, como los
                    parches del panda, con un halo blanco para despegarla */}
                <div className="absolute -left-6 bottom-2 rotate-[-24deg]"
                     style={{ color: TINTA, filter: 'drop-shadow(0 0 2px #fff) drop-shadow(0 0 1px #fff)' }}>
                  <PizzaSlice size={72} />
                </div>
              </div>

              <h2 className="relative mt-2 text-[2.6rem] md:text-[3.8rem] leading-[0.95] uppercase"
                  style={{
                    fontFamily: fiestaTheme.fonts.heading, fontWeight: 700, color: '#fff',
                    textShadow: `3px 3px 0 ${TINTA}, 6px 6px 0 rgba(255,196,46,0.35)`,
                    letterSpacing: '0.01em',
                  }}>
                {store.name}
              </h2>
              {store.about?.slogan && (
                <p className="relative mt-3 text-lg font-bold" style={{ color: DORADO }}>{store.about.slogan}</p>
              )}
              {store.whatsapp && (
                <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                   target="_blank" rel="noopener noreferrer" onClick={() => onWhatsAppClick?.()}
                   className="relative inline-flex items-center gap-2 mt-6 px-8 py-3.5 rounded-full transition-transform hover:scale-105"
                   style={outlined({ background: DORADO, color: TINTA, boxShadow: `0 8px 30px rgba(255,196,46,0.35)` })}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 600 }}>{t.hitUsUp}</span>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Marquesina dorada: el nombre en bucle, girada como sticker pegado */}
        <div className="relative my-6 -rotate-[1.2deg]">
          <div className="overflow-hidden py-2.5"
               style={{ background: DORADO, borderTop: '3px solid #fff', borderBottom: '3px solid #fff', boxShadow: fiestaTheme.shadows.sm }}>
            <div className="fiesta-marquee flex w-max items-center gap-6 pr-6">
              {marqueeItems.map((_, i) => (
                <span key={i} className="flex items-center gap-6 shrink-0">
                  <span className="uppercase text-sm tracking-[0.18em]"
                        style={{ fontFamily: fiestaTheme.fonts.heading, fontWeight: 700, color: TINTA }}>
                    {store.name}
                  </span>
                  <PizzaSlice size={20} rotate={i % 2 ? 25 : -15} style={{ color: TINTA }} />
                </span>
              ))}
            </div>
          </div>
        </div>

        <TrustBar />
        <FlashSaleBar />

        {/* Subrayado en vez de pastilla: la pastilla dorada rellena gritaba
            demasiado contra el morado. La activa lleva texto claro y una
            barrita dorada debajo. */}
        <CategoryCarousel
          categories={categories}
          activeCategory={activeFilters.categoryId}
          onCategoryChange={(id) => setFilter('categoryId', id)}
          products={products}
          onSelectProduct={handleSelectProduct}
          variant="underline"
        />

        <main className="py-8 md:py-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <FilterPanel
                availableFilters={availableFilters}
                activeFilters={activeFilters}
                onFilterChange={setFilter}
                onVariationChange={setVariationFilter}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
                language={store.language}
                currency={store.currency}
                colors={{
                  text: fiestaTheme.colors.text,
                  textMuted: fiestaTheme.colors.textMuted,
                  border: fiestaTheme.colors.border,
                  background: fiestaTheme.colors.background,
                  primary: fiestaTheme.colors.primary,
                  surface: fiestaTheme.colors.surface,
                }}
              />
              <SortDropdown
                sortBy={sortBy}
                onSortChange={setSortBy}
                language={store.language}
                colors={{
                  text: fiestaTheme.colors.text,
                  border: fiestaTheme.colors.border,
                  background: fiestaTheme.colors.background,
                  primary: fiestaTheme.colors.primary,
                }}
                className="ml-auto"
              />
            </div>

            <ProductGrid
              products={filteredProducts}
              onSelectProduct={handleSelectProduct}
              onQuickAdd={handleAddToCart}
              categories={categories}
            />
          </div>
        </main>

        {/* El queso vuelve a gotear, invertido, apoyado sobre el footer */}
        <CheeseDrip flip />
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
