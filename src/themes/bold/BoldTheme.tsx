import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import ProductGallery from '../shared/ProductGallery'
import '../shared/animations.css'

/**
 * BOLD THEME - "IMPACTO"
 *
 * Filosofía: Brutalista, contundente, sin disculpas.
 * - Bordes afilados, sin redondeos
 * - Tipografía ALL CAPS, extra bold
 * - Contraste extremo negro + acento vibrante
 * - Geometría industrial
 * - El diseño grita, no susurra
 */

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
}

export default function BoldTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [announcementVisible, setAnnouncementVisible] = useState(true)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredProducts = activeCategory
    ? products.filter(p => p.categoryId === activeCategory)
    : products

  // Accent color - vibrant yellow
  const accent = store.themeSettings?.primaryColor || '#FBBF24'

  const handleWhatsAppOrder = () => {
    if (!store.whatsapp || items.length === 0) return
    onWhatsAppClick?.()

    const orderLines = items.map(item =>
      `${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}`
    ).join('\n')

    const message = `Hola! Quiero ordenar:\n\n${orderLines}\n\nTotal: ${formatPrice(totalPrice, store.currency)}`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const getDiscountPercentage = (price: number, comparePrice: number) => {
    return Math.round((1 - price / comparePrice) * 100)
  }

  // Announcement bar settings
  const announcement = store.announcement
  const showAnnouncement = announcement?.enabled && announcement?.text && announcementVisible

  return (
    <div className="min-h-screen bg-black text-white">
      {/* === ANNOUNCEMENT BAR === */}
      {showAnnouncement && (
        <div
          className="relative overflow-hidden"
          style={{ backgroundColor: announcement.backgroundColor || accent }}
        >
          {/* Animated diagonal lines background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`,
            }} />
          </div>

          <div className="relative flex items-center justify-center py-3 px-12">
            {announcement.link ? (
              <a
                href={announcement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-black uppercase tracking-widest hover:underline"
                style={{ color: announcement.textColor || '#000000' }}
              >
                {announcement.text} →
              </a>
            ) : (
              <span
                className="text-sm font-black uppercase tracking-widest"
                style={{ color: announcement.textColor || '#000000' }}
              >
                {announcement.text}
              </span>
            )}

            <button
              onClick={() => setAnnouncementVisible(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: announcement.textColor || '#000000' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* === HEADER === */}
      <header className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled ? 'bg-black border-b-2' : 'bg-black'
      }`} style={{ borderColor: isScrolled ? accent : 'transparent' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo + Name */}
          <div className="flex items-center gap-3">
            {store.logo && (
              <div className="w-10 h-10 bg-white flex items-center justify-center overflow-hidden">
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <span
              className="text-xl md:text-2xl font-black uppercase tracking-tight"
              style={{ color: accent }}
            >
              {store.name}
            </span>
          </div>

          {/* Cart button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative group"
          >
            <div
              className="w-12 h-12 flex items-center justify-center transition-all group-hover:scale-105"
              style={{ backgroundColor: accent }}
            >
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black text-xs font-black flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* === HERO SECTION === */}
      {(store.heroImage || store.heroImageMobile) ? (
        // Hero WITH image - dramatic diagonal cut
        <section className="relative">
          {/* Mobile Hero */}
          <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center" style={{ backgroundColor: '#111' }}>
            <img
              src={store.heroImageMobile || store.heroImage}
              alt={store.name}
              className="w-full h-auto max-h-[400px] object-contain"
            />
            {/* Diagonal overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${accent}CC 0%, transparent 50%, black 100%)`
              }}
            />
            {/* Store name overlay */}
            <div className="absolute bottom-0 left-0 p-6">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="text-white/80 text-lg mt-2 max-w-lg uppercase tracking-wide font-medium">
                  {store.about.slogan}
                </p>
              )}
            </div>
          </div>
          {/* Desktop Hero */}
          <div className="hidden md:block relative overflow-hidden">
            <img
              src={store.heroImage || store.heroImageMobile}
              alt={store.name}
              className="w-full aspect-[16/5] object-cover"
            />
            {/* Diagonal overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${accent}CC 0%, transparent 50%, black 100%)`
              }}
            />
            {/* Store name overlay */}
            <div className="absolute bottom-0 left-0 p-10">
              <h1 className="text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-none">
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="text-white/80 text-xl mt-2 max-w-lg uppercase tracking-wide font-medium">
                  {store.about.slogan}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        // Hero WITHOUT image - pure typography impact
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Geometric background elements */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute top-0 right-0 w-[60%] h-full"
              style={{ backgroundColor: accent }}
            />
          </div>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[100px] opacity-20"
            style={{ backgroundColor: accent }}
          />

          <div className="relative max-w-7xl mx-auto px-4 text-center">
            <h1
              className="text-6xl md:text-8xl lg:text-[10rem] font-black uppercase tracking-tighter leading-none"
              style={{ color: accent }}
            >
              {store.name}
            </h1>
            {store.about?.slogan && (
              <p className="text-white/50 text-lg md:text-xl mt-6 uppercase tracking-widest">
                {store.about.slogan}
              </p>
            )}
            <div className="w-32 h-1 mx-auto mt-8" style={{ backgroundColor: accent }} />
          </div>
        </section>
      )}

      {/* === CATEGORIES NAV === */}
      {categories.length > 0 && (
        <nav className="sticky top-[72px] z-40 bg-black border-y-2" style={{ borderColor: `${accent}33` }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex md:justify-center overflow-x-auto scrollbar-hide gap-1 py-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex-shrink-0 px-6 py-3 font-black uppercase text-sm tracking-wider transition-all ${
                  !activeCategory
                    ? 'text-black'
                    : 'text-white/50 hover:text-white border-2 border-white/20 hover:border-white/40'
                }`}
                style={!activeCategory ? { backgroundColor: accent } : {}}
              >
                Todo
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-6 py-3 font-black uppercase text-sm tracking-wider transition-all ${
                    activeCategory === cat.id
                      ? 'text-black'
                      : 'text-white/50 hover:text-white border-2 border-white/20 hover:border-white/40'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: accent } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* === PRODUCTS GRID === */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12 pb-32">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 border-2 border-white/10">
            <p className="text-white/30 text-lg uppercase tracking-widest">Sin productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-2">
            {filteredProducts.map((product) => {
              const hasDiscount = product.comparePrice && product.comparePrice > product.price
              const discountPercent = hasDiscount
                ? getDiscountPercentage(product.price, product.comparePrice!)
                : 0

              return (
                <article
                  key={product.id}
                  className="group cursor-pointer relative bg-neutral-900 hover:bg-neutral-800 transition-colors"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                        <svg className="w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Discount badge - diagonal corner */}
                    {hasDiscount && (
                      <div
                        className="absolute top-0 right-0 px-3 py-1 font-black text-sm text-black"
                        style={{ backgroundColor: accent }}
                      >
                        -{discountPercent}%
                      </div>
                    )}

                    {/* Hover overlay with add button */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          addItem(product)
                        }}
                        className="px-6 py-3 font-black uppercase text-sm tracking-wider text-black transform translate-y-2 group-hover:translate-y-0 transition-transform"
                        style={{ backgroundColor: accent }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {/* Product info */}
                  <div className="p-4 border-t-2" style={{ borderColor: `${accent}22` }}>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide truncate mb-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span
                        className="font-black text-lg"
                        style={{ color: accent }}
                      >
                        {formatPrice(product.price, store.currency)}
                      </span>
                      {hasDiscount && (
                        <span className="text-white/30 line-through text-sm">
                          {formatPrice(product.comparePrice!, store.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* === FOOTER === */}
      <footer className="border-t-2 py-12" style={{ borderColor: `${accent}33` }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Column 1 - Brand */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                {store.logo && (
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-2" style={{ borderColor: accent }}>
                    <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <span className="text-2xl font-black uppercase" style={{ color: accent }}>
                  {store.name}
                </span>
              </div>
              {store.about?.description && (
                <p className="text-white/50 text-sm leading-relaxed">
                  {store.about.description}
                </p>
              )}
            </div>

            {/* Column 2 - Contacto */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: accent }}>
                Contacto
              </h3>
              <div className="flex flex-col gap-3">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()}
                    className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                )}
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{store.email}</span>
                  </a>
                )}
                {store.location && (store.location.address || store.location.city) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.location.address, store.location.city, store.location.country].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{[store.location.address, store.location.city, store.location.country].filter(Boolean).join(', ')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Column 3 - Siguenos */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: accent }}>
                Siguenos
              </h3>
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform"
                    style={{ backgroundColor: accent }}
                    title="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {store.facebook && (
                  <a
                    href={`https://facebook.com/${store.facebook.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform"
                    style={{ backgroundColor: accent }}
                    title="Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                {store.tiktok && (
                  <a
                    href={`https://tiktok.com/@${store.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform"
                    style={{ backgroundColor: accent }}
                    title="TikTok"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/20 text-xs uppercase tracking-widest">
              © {new Date().getFullYear()} {store.name}
            </p>
            {(!store.plan || store.plan === 'free') && (
              <a
                href="https://shopifree.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 text-xs hover:text-white/40 transition-colors uppercase tracking-widest"
              >
                Powered by Shopifree
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* === WHATSAPP FLOATING BUTTON === */}
      {store.whatsapp && totalItems === 0 && (
        <a
          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsAppClick?.()}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#25D366] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      {/* === CART BAR (when items in cart) === */}
      {totalItems > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t-2 animate-slideUp"
          style={{ backgroundColor: accent, borderColor: 'black' }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-4 text-black"
            >
              <div className="w-12 h-12 bg-black flex items-center justify-center">
                <span className="font-black text-white">{totalItems}</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-widest opacity-60">Tu orden</p>
                <p className="text-xl font-black">{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>
            <button
              onClick={handleWhatsAppOrder}
              className="flex items-center gap-3 bg-black text-white px-6 py-4 font-black uppercase text-sm tracking-wider hover:bg-white hover:text-black transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Pedir
            </button>
          </div>
        </div>
      )}

      {/* === PRODUCT DRAWER === */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 animate-fadeIn"
          onClick={() => setSelectedProduct(null)}
        >
          <div className="absolute inset-0 bg-black/95" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-neutral-900 shadow-2xl animate-slideLeft flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b-2" style={{ borderColor: `${accent}33` }}>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Producto</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin-dark">
              {/* Image Gallery */}
              <div className="relative">
                <ProductGallery
                  images={selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.image ? [selectedProduct.image] : [])}
                  productName={selectedProduct.name}
                  variant="dark"
                />

                {/* Discount badge */}
                {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                  <div
                    className="absolute top-4 right-4 z-10 px-4 py-2 font-black text-lg text-black"
                    style={{ backgroundColor: accent }}
                  >
                    -{getDiscountPercentage(selectedProduct.price, selectedProduct.comparePrice)}%
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">
                  {selectedProduct.name}
                </h3>

                {/* Prices */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-3xl font-black" style={{ color: accent }}>
                    {formatPrice(selectedProduct.price, store.currency)}
                  </span>
                  {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                    <span className="text-xl text-white/30 line-through">
                      {formatPrice(selectedProduct.comparePrice, store.currency)}
                    </span>
                  )}
                </div>

                {selectedProduct.description && (
                  <p className="text-white/50 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}
              </div>
            </div>

            {/* Footer with Add button */}
            <div className="p-5 border-t-2 bg-neutral-900" style={{ borderColor: `${accent}33` }}>
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full py-4 font-black uppercase text-sm tracking-widest text-black transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === CART DRAWER === */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/95 animate-fadeIn"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="bg-neutral-900 w-full max-w-md h-full flex flex-col animate-slideLeft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b-2" style={{ borderColor: `${accent}33` }}>
              <h2 className="text-sm font-black uppercase tracking-widest">Carrito ({totalItems})</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin-dark p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div
                    className="w-20 h-20 flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${accent}15` }}
                  >
                    <svg className="w-10 h-10" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-white/30 uppercase tracking-widest text-sm">Carrito vacio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.product.id} className="flex gap-4 bg-white/5 p-3">
                      <div className="w-20 h-20 bg-black flex-shrink-0">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm uppercase truncate">
                          {item.product.name}
                        </h4>
                        <p style={{ color: accent }} className="font-black">
                          {formatPrice(item.product.price, store.currency)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center font-black"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-black">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center font-black"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="ml-auto text-white/30 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t-2 p-6 space-y-4" style={{ borderColor: `${accent}33` }}>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 uppercase text-xs tracking-widest">Total</span>
                  <span className="text-2xl font-black" style={{ color: accent }}>
                    {formatPrice(totalPrice, store.currency)}
                  </span>
                </div>
                <button
                  onClick={handleWhatsAppOrder}
                  className="w-full py-4 font-black uppercase text-sm tracking-widest text-black flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: accent }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Pedir por WhatsApp
                </button>
                <button
                  onClick={clearCart}
                  className="w-full py-2 text-white/30 text-xs uppercase tracking-widest hover:text-white/50 transition-colors"
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
