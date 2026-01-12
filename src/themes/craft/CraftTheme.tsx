import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import ProductGallery from '../shared/ProductGallery'
import '../shared/animations.css'

/**
 * CRAFT THEME - "ARTESANAL"
 *
 * Filosofia: Calido, organico, hecho a mano.
 * - Paleta: Tonos tierra, beige, terracota
 * - Tipografia organica y calida
 * - Bordes redondeados suaves
 * - Textura sutil de papel/kraft
 * - Ideal para productos artesanales, ceramica, jabones, madera
 */

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
}

export default function CraftTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // Craft colors
  const terracotta = '#C17F59'
  const warmBrown = '#8B6F4E'
  const cream = '#FBF8F4'
  const paper = '#F5F0E8'
  const darkText = '#3D3228'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredProducts = activeCategory
    ? products.filter(p => p.categoryId === activeCategory)
    : products

  const sendWhatsAppOrder = () => {
    if (!store.whatsapp || items.length === 0) return
    onWhatsAppClick?.()
    let message = `Hola! Me gustaria pedir:\n\n`
    items.forEach(item => {
      message += `- ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*Total: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: cream }}>
      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Source+Sans+3:wght@300;400;500;600&display=swap');
        .font-craft-title {
          font-family: 'Playfair Display', Georgia, serif;
        }
        .font-craft-body {
          font-family: 'Source Sans 3', system-ui, sans-serif;
        }
        .paper-texture {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-blend-mode: soft-light;
          opacity: 0.03;
        }
      `}</style>

      {/* ===================== ANNOUNCEMENT ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-3 px-4 text-center text-sm font-craft-body animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || terracotta,
            color: store.announcement?.textColor || cream
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
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===================== HEADER ===================== */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled ? 'py-3 shadow-sm' : 'py-4'
        }`}
        style={{
          backgroundColor: scrolled ? `${cream}f8` : cream,
          backdropFilter: scrolled ? 'blur(12px)' : 'none'
        }}
      >
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            {store.logo ? (
              <div className="w-11 h-11 rounded-full overflow-hidden border-2" style={{ borderColor: `${warmBrown}30` }}>
                <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${terracotta}15` }}
              >
                <span className="font-craft-title text-lg" style={{ color: terracotta }}>{store.name.charAt(0)}</span>
              </div>
            )}
            <h1 className="font-craft-title text-xl md:text-2xl" style={{ color: darkText }}>
              {store.name}
            </h1>
          </div>

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ backgroundColor: `${terracotta}12` }}
          >
            <svg className="w-5 h-5" style={{ color: warmBrown }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {totalItems > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 text-[11px] font-medium rounded-full flex items-center justify-center animate-scaleIn"
                style={{ backgroundColor: terracotta, color: cream }}
              >
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="relative">
        {(store.heroImage || store.heroImageMobile) ? (
          <>
            {/* Mobile Hero */}
            <div className="md:hidden relative max-h-[400px] overflow-hidden" style={{ backgroundColor: paper }}>
              <img
                src={store.heroImageMobile || store.heroImage}
                alt=""
                className="w-full h-auto max-h-[400px] object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                <h2 className="font-craft-title text-3xl text-white mb-2">{store.name}</h2>
                {store.about?.slogan && (
                  <p className="font-craft-body text-white/85 text-base">{store.about.slogan}</p>
                )}
              </div>
            </div>
            {/* Desktop Hero */}
            <div className="hidden md:block relative overflow-hidden">
              <img
                src={store.heroImage || store.heroImageMobile}
                alt=""
                className="w-full aspect-[16/5] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                <h2 className="font-craft-title text-5xl text-white mb-3">{store.name}</h2>
                {store.about?.slogan && (
                  <p className="font-craft-body text-white/85 text-lg">{store.about.slogan}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 md:py-24 text-center relative" style={{ backgroundColor: paper }}>
            {/* Decorative elements */}
            <div className="absolute inset-0 paper-texture pointer-events-none" />
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <div className="w-12 h-px" style={{ backgroundColor: `${warmBrown}40` }} />
              <svg className="w-5 h-5" style={{ color: terracotta }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
              </svg>
              <div className="w-12 h-px" style={{ backgroundColor: `${warmBrown}40` }} />
            </div>

            <div className="relative max-w-3xl mx-auto px-6 pt-8">
              <h1 className="font-craft-title text-4xl md:text-6xl mb-4" style={{ color: darkText }}>
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="font-craft-body text-lg md:text-xl" style={{ color: warmBrown }}>
                  {store.about.slogan}
                </p>
              )}
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <div className="w-12 h-px" style={{ backgroundColor: `${warmBrown}40` }} />
              <svg className="w-5 h-5" style={{ color: terracotta }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
              </svg>
              <div className="w-12 h-px" style={{ backgroundColor: `${warmBrown}40` }} />
            </div>
          </div>
        )}
      </section>

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <nav className="sticky top-[60px] z-40 border-b" style={{ backgroundColor: cream, borderColor: `${warmBrown}20` }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex md:justify-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className="flex-shrink-0 px-5 py-2 rounded-full text-sm font-craft-body font-medium transition-all duration-300"
                style={!activeCategory ? {
                  backgroundColor: terracotta,
                  color: cream
                } : {
                  backgroundColor: `${terracotta}10`,
                  color: warmBrown
                }}
              >
                Todo
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex-shrink-0 px-5 py-2 rounded-full text-sm font-craft-body font-medium transition-all duration-300"
                  style={activeCategory === cat.id ? {
                    backgroundColor: terracotta,
                    color: cream
                  } : {
                    backgroundColor: `${terracotta}10`,
                    color: warmBrown
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* ===================== PRODUCTS ===================== */}
      <main className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${terracotta}10` }}>
              <svg className="w-10 h-10" style={{ color: `${terracotta}50` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="font-craft-body text-lg" style={{ color: warmBrown }}>No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
            {filteredProducts.map(product => {
              const hasDiscount = product.comparePrice && product.comparePrice > product.price

              return (
                <article
                  key={product.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image */}
                  <div
                    className="relative aspect-square overflow-hidden rounded-2xl mb-3"
                    style={{ backgroundColor: paper }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12" style={{ color: `${warmBrown}30` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Badge */}
                    {hasDiscount && (
                      <div
                        className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: terracotta, color: cream }}
                      >
                        Oferta
                      </div>
                    )}

                    {/* Quick Add */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addItem(product)
                      }}
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg"
                      style={{ backgroundColor: terracotta, color: cream }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="font-craft-title text-base md:text-lg mb-1 line-clamp-2" style={{ color: darkText }}>
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="font-craft-body font-semibold" style={{ color: terracotta }}>
                        {formatPrice(product.price, store.currency)}
                      </span>
                      {hasDiscount && (
                        <span className="font-craft-body text-sm line-through" style={{ color: `${warmBrown}50` }}>
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

      {/* ===================== FOOTER ===================== */}
      <footer style={{ backgroundColor: paper }}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Column 1 - Brand */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                {store.logo ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2" style={{ borderColor: `${warmBrown}20` }}>
                    <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${terracotta}15` }}>
                    <span className="font-craft-title text-2xl" style={{ color: terracotta }}>{store.name.charAt(0)}</span>
                  </div>
                )}
                <h3 className="font-craft-title text-xl" style={{ color: darkText }}>{store.name}</h3>
              </div>
              {store.about?.description && (
                <p className="font-craft-body text-sm leading-relaxed" style={{ color: warmBrown }}>{store.about.description}</p>
              )}
            </div>

            {/* Column 2 - Contacto */}
            <div>
              <h3 className="font-craft-title text-lg mb-4" style={{ color: darkText }}>Contacto</h3>
              <div className="space-y-3">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()}
                    className="flex items-center gap-3 transition-all hover:opacity-80"
                    style={{ color: warmBrown }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${terracotta}15`, color: terracotta }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <span className="font-craft-body text-sm">{store.whatsapp}</span>
                  </a>
                )}
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="flex items-center gap-3 transition-all hover:opacity-80"
                    style={{ color: warmBrown }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${terracotta}15`, color: terracotta }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <span className="font-craft-body text-sm">{store.email}</span>
                  </a>
                )}
                {store.location && (store.location.address || store.location.city) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.location.address, store.location.city, store.location.country].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 transition-all hover:opacity-80"
                    style={{ color: warmBrown }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${terracotta}15`, color: terracotta }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <span className="font-craft-body text-sm pt-2">{[store.location.address, store.location.city, store.location.country].filter(Boolean).join(', ')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Column 3 - Siguenos */}
            <div>
              <h3 className="font-craft-title text-lg mb-4" style={{ color: darkText }}>Siguenos</h3>
              <div className="flex items-center gap-3">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: terracotta, color: paper }}
                    title="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {store.facebook && (
                  <a
                    href={`https://facebook.com/${store.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: terracotta, color: paper }}
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
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: terracotta, color: paper }}
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

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t text-center md:text-left md:flex md:items-center md:justify-between" style={{ borderColor: `${warmBrown}15` }}>
            <p className="font-craft-body text-sm mb-3 md:mb-0" style={{ color: `${warmBrown}60` }}>
              © {new Date().getFullYear()} {store.name}
            </p>
            {(!store.plan || store.plan === 'free') && (
              <a
                href="https://shopifree.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-craft-body text-sm transition-colors hover:opacity-80"
                style={{ color: terracotta }}
              >
                Creado con Shopifree
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* ===================== WHATSAPP FLOAT ===================== */}
      {store.whatsapp && totalItems === 0 && (
        <a
          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Vi tu catalogo ${store.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsAppClick?.()}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
          style={{ backgroundColor: terracotta, color: cream }}
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* ===================== CART BAR ===================== */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
          <div
            className="max-w-xl mx-auto rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xl"
            style={{ backgroundColor: darkText }}
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: terracotta }}
              >
                <span className="text-sm font-medium" style={{ color: cream }}>{totalItems}</span>
              </div>
              <div className="text-left">
                <p className="text-xs" style={{ color: `${cream}70` }}>Ver pedido</p>
                <p className="font-craft-title text-lg" style={{ color: cream }}>{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>

            <button
              onClick={sendWhatsAppOrder}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-craft-body font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: terracotta, color: cream }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="hidden sm:inline">Pedir</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================== PRODUCT DRAWER ===================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] animate-fadeIn" onClick={() => setSelectedProduct(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
            style={{ backgroundColor: cream }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${darkText}10` }}
            >
              <svg className="w-5 h-5" style={{ color: darkText }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Image Gallery */}
              <ProductGallery
                images={selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.image ? [selectedProduct.image] : [])}
                productName={selectedProduct.name}
                variant="light"
              />

              {/* Content */}
              <div className="p-6">
                <h2 className="font-craft-title text-2xl mb-2" style={{ color: darkText }}>
                  {selectedProduct.name}
                </h2>

                {selectedProduct.description && (
                  <p className="font-craft-body leading-relaxed mb-6" style={{ color: warmBrown }}>{selectedProduct.description}</p>
                )}

                <div className="flex items-baseline gap-3">
                  <span className="font-craft-title text-2xl" style={{ color: terracotta }}>
                    {formatPrice(selectedProduct.price, store.currency)}
                  </span>
                  {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                    <span className="font-craft-body text-lg line-through" style={{ color: `${warmBrown}50` }}>
                      {formatPrice(selectedProduct.comparePrice, store.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Add Button */}
            <div className="p-6 border-t" style={{ borderColor: `${warmBrown}15` }}>
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full py-4 rounded-xl font-craft-body font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: terracotta, color: cream }}
              >
                Agregar al pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CART DRAWER ===================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] animate-fadeIn" onClick={() => setIsCartOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
            style={{ backgroundColor: cream }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: `${warmBrown}15` }}>
              <h2 className="font-craft-title text-xl" style={{ color: darkText }}>Tu Pedido</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${darkText}10` }}
              >
                <svg className="w-5 h-5" style={{ color: darkText }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${terracotta}10` }}>
                    <svg className="w-10 h-10" style={{ color: `${terracotta}50` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="font-craft-body text-lg" style={{ color: warmBrown }}>Tu carrito esta vacio</p>
                  <p className="font-craft-body text-sm mt-1" style={{ color: `${warmBrown}60` }}>Agrega productos para continuar</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {items.map(item => (
                    <div key={item.product.id} className="flex gap-4 p-3 rounded-xl" style={{ backgroundColor: paper }}>
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: `${warmBrown}10` }}>
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6" style={{ color: `${warmBrown}30` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-craft-title truncate" style={{ color: darkText }}>{item.product.name}</h3>
                        <p className="font-craft-body text-sm font-semibold" style={{ color: terracotta }}>{formatPrice(item.product.price, store.currency)}</p>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center rounded-full overflow-hidden" style={{ backgroundColor: `${warmBrown}10` }}>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-black/5"
                            >
                              <svg className="w-4 h-4" style={{ color: warmBrown }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-8 text-center text-sm font-medium" style={{ color: darkText }}>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-black/5"
                            >
                              <svg className="w-4 h-4" style={{ color: warmBrown }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="p-1.5 transition-colors"
                            style={{ color: `${warmBrown}50` }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout */}
            {items.length > 0 && (
              <div className="p-6 border-t" style={{ borderColor: `${warmBrown}15` }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-craft-body" style={{ color: warmBrown }}>Total</span>
                  <span className="font-craft-title text-2xl" style={{ color: darkText }}>{formatPrice(totalPrice, store.currency)}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false)
                    sendWhatsAppOrder()
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-craft-body font-semibold hover:bg-[#20BD5A] active:scale-[0.98] transition-all"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Enviar pedido por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
