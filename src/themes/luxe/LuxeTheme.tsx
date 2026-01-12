import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import ProductGallery from '../shared/ProductGallery'
import '../shared/animations.css'

/**
 * LUXE THEME - "ELEGANCIA"
 *
 * Filosofia: Sofisticado, exclusivo, atemporal.
 * - Paleta: Negro, dorado, blanco crema
 * - Tipografia serif elegante
 * - Espaciado generoso, minimalismo refinado
 * - Detalles sutiles, transiciones suaves
 * - Ideal para joyeria, moda de lujo, articulos premium
 */

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
}

export default function LuxeTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // Luxe colors
  const gold = '#C9A962'
  const darkBg = '#0D0D0D'
  const cream = '#FAF8F5'

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
    let message = `Hola, me gustaria ordenar:\n\n`
    items.forEach(item => {
      message += `- ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*Total: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: cream }}>
      {/* Google Fonts for Serif */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        .font-serif-luxe {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .gold-shimmer {
          background: linear-gradient(135deg, ${gold} 0%, #E8D5A3 50%, ${gold} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* ===================== ANNOUNCEMENT ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-3 px-4 text-center text-sm tracking-widest uppercase animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || darkBg,
            color: store.announcement?.textColor || gold
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
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===================== HEADER ===================== */}
      <header
        className={`sticky top-0 z-50 transition-all duration-700 ${
          scrolled ? 'py-3' : 'py-5'
        }`}
        style={{
          backgroundColor: scrolled ? `${cream}f5` : cream,
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid ${gold}20` : '1px solid transparent'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-4">
            {store.logo ? (
              <div className="w-12 h-12 flex items-center justify-center">
                <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : null}
            <h1 className="font-serif-luxe text-2xl md:text-3xl font-semibold tracking-wide" style={{ color: darkBg }}>
              {store.name}
            </h1>
          </div>

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative group"
          >
            <div
              className="w-12 h-12 flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
              style={{ borderColor: darkBg }}
            >
              <svg className="w-5 h-5" style={{ color: darkBg }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            {totalItems > 0 && (
              <span
                className="absolute -top-2 -right-2 w-6 h-6 text-xs font-medium flex items-center justify-center animate-scaleIn"
                style={{ backgroundColor: gold, color: darkBg }}
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
            <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center" style={{ backgroundColor: darkBg }}>
              <img
                src={store.heroImageMobile || store.heroImage}
                alt=""
                className="w-full h-auto max-h-[400px] object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                <h2 className="font-serif-luxe text-3xl text-white mb-2">{store.name}</h2>
                {store.about?.slogan && (
                  <p className="text-white/80 text-sm tracking-widest uppercase">{store.about.slogan}</p>
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
                <h2 className="font-serif-luxe text-5xl lg:text-6xl text-white mb-3">{store.name}</h2>
                {store.about?.slogan && (
                  <p className="text-white/80 text-sm tracking-[0.3em] uppercase">{store.about.slogan}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 md:py-32 text-center" style={{ backgroundColor: darkBg }}>
            <div className="max-w-4xl mx-auto px-6">
              <div className="w-16 h-px mx-auto mb-8" style={{ backgroundColor: gold }} />
              <h1 className="font-serif-luxe text-5xl md:text-7xl text-white mb-6">
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="text-white/60 text-sm tracking-[0.3em] uppercase">{store.about.slogan}</p>
              )}
              <div className="w-16 h-px mx-auto mt-8" style={{ backgroundColor: gold }} />
            </div>
          </div>
        )}
      </section>

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <nav className="sticky top-[73px] z-40 border-b" style={{ backgroundColor: cream, borderColor: `${gold}30` }}>
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex md:justify-center gap-1 py-4 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className="flex-shrink-0 px-6 py-2 text-sm tracking-widest uppercase transition-all duration-300"
                style={!activeCategory ? {
                  color: darkBg,
                  borderBottom: `2px solid ${gold}`
                } : {
                  color: `${darkBg}80`,
                  borderBottom: '2px solid transparent'
                }}
              >
                Todo
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex-shrink-0 px-6 py-2 text-sm tracking-widest uppercase transition-all duration-300"
                  style={activeCategory === cat.id ? {
                    color: darkBg,
                    borderBottom: `2px solid ${gold}`
                  } : {
                    color: `${darkBg}80`,
                    borderBottom: '2px solid transparent'
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
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-px mx-auto mb-8" style={{ backgroundColor: gold }} />
            <p className="text-lg" style={{ color: `${darkBg}60` }}>No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {filteredProducts.map(product => {
              const hasDiscount = product.comparePrice && product.comparePrice > product.price

              return (
                <article
                  key={product.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image */}
                  <div className="relative aspect-[3/4] overflow-hidden mb-4" style={{ backgroundColor: `${darkBg}05` }}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12" style={{ color: `${darkBg}20` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && (
                      <div
                        className="absolute top-3 left-3 px-3 py-1 text-xs tracking-wider uppercase"
                        style={{ backgroundColor: darkBg, color: gold }}
                      >
                        Oferta
                      </div>
                    )}

                    {/* Quick Add - appears on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addItem(product)
                      }}
                      className="absolute bottom-0 left-0 right-0 py-3 text-sm tracking-widest uppercase opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                      style={{ backgroundColor: darkBg, color: cream }}
                    >
                      Agregar
                    </button>
                  </div>

                  {/* Info */}
                  <div className="text-center">
                    <h3 className="font-serif-luxe text-lg mb-2 transition-colors" style={{ color: darkBg }}>
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-sm tracking-wide" style={{ color: darkBg }}>
                        {formatPrice(product.price, store.currency)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm line-through" style={{ color: `${darkBg}40` }}>
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
      <footer style={{ backgroundColor: darkBg }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            {store.logo ? (
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <img src={store.logo} alt={store.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <h3 className="font-serif-luxe text-3xl text-white mb-4">{store.name}</h3>
            )}
            {store.about?.description && (
              <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">{store.about.description}</p>
            )}
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-6 mb-12">
            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onWhatsAppClick?.()}
                className="w-12 h-12 border flex items-center justify-center transition-all duration-300 hover:border-opacity-100"
                style={{ borderColor: `${gold}50`, color: gold }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            )}
            {store.instagram && (
              <a
                href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 border flex items-center justify-center transition-all duration-300 hover:border-opacity-100"
                style={{ borderColor: `${gold}50`, color: gold }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t text-center" style={{ borderColor: `${gold}20` }}>
            <p className="text-white/30 text-xs tracking-widest uppercase mb-4">
              {new Date().getFullYear()} {store.name}
            </p>
            <a
              href="https://shopifree.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs tracking-widest uppercase transition-colors"
              style={{ color: gold }}
            >
              Powered by Shopifree
            </a>
          </div>
        </div>
      </footer>

      {/* ===================== WHATSAPP FLOAT ===================== */}
      {store.whatsapp && totalItems === 0 && (
        <a
          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi su catalogo ${store.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsAppClick?.()}
          className="fixed bottom-6 right-6 w-14 h-14 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform z-40"
          style={{ backgroundColor: gold }}
        >
          <svg className="w-7 h-7" style={{ color: darkBg }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* ===================== CART BAR ===================== */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
          <div
            className="max-w-xl mx-auto p-4 flex items-center justify-between gap-4 shadow-2xl"
            style={{ backgroundColor: darkBg }}
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-4"
            >
              <div
                className="w-10 h-10 flex items-center justify-center text-sm font-medium"
                style={{ backgroundColor: gold, color: darkBg }}
              >
                {totalItems}
              </div>
              <div className="text-left">
                <p className="text-xs text-white/50 uppercase tracking-wider">Ver pedido</p>
                <p className="font-serif-luxe text-lg" style={{ color: gold }}>{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>

            <button
              onClick={sendWhatsAppOrder}
              className="flex items-center gap-2 px-6 py-3 text-sm tracking-widest uppercase font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: gold, color: darkBg }}
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
            style={{ backgroundColor: cream }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 border flex items-center justify-center transition-colors hover:bg-black/5"
              style={{ borderColor: `${darkBg}30` }}
            >
              <svg className="w-5 h-5" style={{ color: darkBg }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Image Gallery */}
              <ProductGallery
                images={[
                  ...(selectedProduct.image ? [selectedProduct.image] : []),
                  ...(selectedProduct.images || [])
                ].filter(Boolean)}
                productName={selectedProduct.name}
                variant="light"
              />

              {/* Content */}
              <div className="p-6">
                <h2 className="font-serif-luxe text-2xl mb-2" style={{ color: darkBg }}>
                  {selectedProduct.name}
                </h2>

                {selectedProduct.description && (
                  <p className="text-sm leading-relaxed mb-6" style={{ color: `${darkBg}70` }}>{selectedProduct.description}</p>
                )}

                <div className="flex items-baseline gap-3">
                  <span className="font-serif-luxe text-2xl" style={{ color: darkBg }}>
                    {formatPrice(selectedProduct.price, store.currency)}
                  </span>
                  {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                    <span className="text-lg line-through" style={{ color: `${darkBg}40` }}>
                      {formatPrice(selectedProduct.comparePrice, store.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Add Button */}
            <div className="p-6 border-t" style={{ borderColor: `${gold}30` }}>
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full py-4 text-sm tracking-widest uppercase font-medium transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: darkBg, color: gold }}
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
            style={{ backgroundColor: cream }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: `${gold}30` }}>
              <h2 className="font-serif-luxe text-xl" style={{ color: darkBg }}>Tu Pedido</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-black/5"
                style={{ borderColor: `${darkBg}30` }}
              >
                <svg className="w-5 h-5" style={{ color: darkBg }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-px mb-8" style={{ backgroundColor: gold }} />
                  <p className="text-lg" style={{ color: `${darkBg}60` }}>Tu carrito esta vacio</p>
                  <p className="text-sm mt-2" style={{ color: `${darkBg}40` }}>Agrega productos para continuar</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map(item => (
                    <div key={item.product.id} className="flex gap-4">
                      <div className="w-20 h-24 flex-shrink-0 overflow-hidden" style={{ backgroundColor: `${darkBg}05` }}>
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6" style={{ color: `${darkBg}20` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif-luxe text-base truncate" style={{ color: darkBg }}>{item.product.name}</h3>
                        <p className="text-sm mt-1" style={{ color: gold }}>{formatPrice(item.product.price, store.currency)}</p>

                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center border" style={{ borderColor: `${darkBg}20` }}>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-black/5"
                            >
                              <svg className="w-4 h-4" style={{ color: darkBg }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-8 text-center text-sm" style={{ color: darkBg }}>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-black/5"
                            >
                              <svg className="w-4 h-4" style={{ color: darkBg }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="text-xs tracking-wider uppercase transition-colors"
                            style={{ color: `${darkBg}50` }}
                          >
                            Eliminar
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
              <div className="p-6 border-t" style={{ borderColor: `${gold}30` }}>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm uppercase tracking-wider" style={{ color: `${darkBg}60` }}>Total</span>
                  <span className="font-serif-luxe text-2xl" style={{ color: darkBg }}>{formatPrice(totalPrice, store.currency)}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false)
                    sendWhatsAppOrder()
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 text-sm tracking-widest uppercase font-medium hover:bg-[#20BD5A] active:scale-[0.98] transition-all"
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
