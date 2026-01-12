/**
 * VINTAGE THEME - "RETRO"
 *
 * Filosofia: Clasico, nostalgico, atemporal.
 * - Paleta: Sepia, crema, marrones calidos
 * - Tipografia: Serif elegante, espaciado clasico
 * - Bordes decorativos, texturas sutiles
 * - Transiciones suaves, hover elegantes
 * - Ideal para: Antiguedades, ropa vintage, productos artesanales, cafeterias
 */

import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import ProductGallery from '../shared/ProductGallery'
import '../shared/animations.css'

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
}

export default function VintageTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // Vintage colors
  const cream = '#FDF8F3'
  const brown = '#5D4037'
  const sepia = '#8B7355'
  const gold = '#C9A962'
  const darkBrown = '#3E2723'
  const lightBrown = '#EFEBE9'

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
    let message = `Hola! Me interesa:\n\n`
    items.forEach(item => {
      message += `* ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*Total: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: cream, fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* ===================== ANNOUNCEMENT ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-3 px-4 text-center text-sm tracking-wide animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || darkBrown,
            color: store.announcement?.textColor || cream,
            fontStyle: 'italic'
          }}
        >
          {store.announcement?.link ? (
            <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              {store.announcement?.text}
            </a>
          ) : (
            <span>{store.announcement?.text}</span>
          )}
          <button
            onClick={() => setAnnouncementDismissed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===================== HEADER ===================== */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled ? 'shadow-md' : ''
        }`}
        style={{ backgroundColor: cream, borderBottom: `1px solid ${lightBrown}` }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="h-10 w-auto" />
              ) : (
                <h1 className="text-2xl tracking-wide" style={{ color: darkBrown, fontFamily: "'Georgia', serif" }}>
                  {store.name}
                </h1>
              )}
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-4">
              {store.instagram && (
                <a
                  href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
                  style={{ color: sepia }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}

              {/* Cart */}
              {totalItems > 0 && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:opacity-90"
                  style={{ backgroundColor: brown, color: cream }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="font-medium">{totalItems}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      {store.heroImage && (
        <section className="relative">
          <div className="aspect-[21/9] md:aspect-[3/1] overflow-hidden">
            <picture>
              {store.heroImageMobile && (
                <source media="(max-width: 768px)" srcSet={store.heroImageMobile} />
              )}
              <img
                src={store.heroImage}
                alt={store.name}
                className="w-full h-full object-cover"
                style={{ filter: 'sepia(15%)' }}
              />
            </picture>
          </div>
          {/* Decorative border */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2"
            style={{ background: `linear-gradient(to right, ${gold}, ${brown}, ${gold})` }}
          />
        </section>
      )}

      {/* ===================== STORE INFO ===================== */}
      <section className="py-10" style={{ borderBottom: `2px solid ${lightBrown}` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl tracking-wide mb-2" style={{ color: darkBrown }}>
            {store.name}
          </h2>
          {store.about?.slogan && (
            <p className="text-lg italic" style={{ color: sepia }}>{store.about.slogan}</p>
          )}
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="h-px w-16" style={{ backgroundColor: gold }} />
            <svg className="w-5 h-5" style={{ color: gold }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <div className="h-px w-16" style={{ backgroundColor: gold }} />
          </div>
          {store.whatsapp && (
            <a
              href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onWhatsAppClick?.()}
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full transition-all hover:opacity-90"
              style={{ backgroundColor: '#25D366', color: 'white' }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Contactanos
            </a>
          )}
        </div>
      </section>

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <section className="py-6 sticky top-20 z-30" style={{ backgroundColor: cream }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide justify-center flex-wrap">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-5 py-2 rounded-full text-sm tracking-wide transition-all border-2`}
                style={!activeCategory
                  ? { backgroundColor: brown, color: cream, borderColor: brown }
                  : { backgroundColor: 'transparent', color: brown, borderColor: brown }
                }
              >
                Todo
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-sm tracking-wide transition-all border-2`}
                  style={activeCategory === cat.id
                    ? { backgroundColor: brown, color: cream, borderColor: brown }
                    : { backgroundColor: 'transparent', color: brown, borderColor: brown }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== PRODUCTS ===================== */}
      <main className="py-10" style={{ backgroundColor: cream }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Products count */}
          <div className="mb-8 text-center">
            <p className="text-sm italic" style={{ color: sepia }}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'articulo' : 'articulos'} disponibles
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="cursor-pointer group"
              >
                {/* Image with vintage frame */}
                <div
                  className="aspect-square overflow-hidden relative"
                  style={{
                    border: `3px solid ${sepia}`,
                    padding: '4px',
                    backgroundColor: 'white'
                  }}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                      style={{ filter: 'sepia(10%)' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: lightBrown, color: sepia }}>
                      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Badges */}
                  {product.comparePrice && product.comparePrice > product.price && (
                    <div
                      className="absolute top-3 left-3 px-2 py-1 text-xs font-medium"
                      style={{ backgroundColor: '#B71C1C', color: 'white' }}
                    >
                      Oferta
                    </div>
                  )}
                  {product.featured && (
                    <div
                      className="absolute top-3 right-3 px-2 py-1 text-xs"
                      style={{ backgroundColor: gold, color: darkBrown }}
                    >
                      Destacado
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="pt-4 text-center">
                  <h3
                    className="text-sm line-clamp-2 mb-2 tracking-wide"
                    style={{ color: darkBrown }}
                  >
                    {product.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-lg font-medium" style={{ color: brown }}>
                      {formatPrice(product.price, store.currency)}
                    </span>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <span className="text-sm line-through" style={{ color: sepia }}>
                        {formatPrice(product.comparePrice, store.currency)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: lightBrown }}
              >
                <svg className="w-10 h-10" style={{ color: sepia }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-medium" style={{ color: darkBrown }}>No hay articulos disponibles</p>
              <p className="text-sm mt-1 italic" style={{ color: sepia }}>Vuelve pronto para descubrir nuevas piezas</p>
            </div>
          )}
        </div>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer style={{ backgroundColor: darkBrown, color: cream }} className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div className="text-center md:text-left">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-12 h-12 object-contain rounded-full mb-4 mx-auto md:mx-0" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-4" style={{ backgroundColor: gold }}>
                  <span className="text-lg" style={{ color: darkBrown }}>{store.name.charAt(0)}</span>
                </div>
              )}
              <h3 className="text-xl tracking-wide mb-2">{store.name}</h3>
              {store.about?.description && (
                <p className="text-sm leading-relaxed opacity-80 italic">{store.about.description}</p>
              )}
            </div>

            {/* Contacto */}
            <div className="text-center md:text-left">
              <h4 className="font-medium mb-4 tracking-wide" style={{ color: gold }}>Contacto</h4>
              <div className="space-y-3">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()}
                    className="flex items-center justify-center md:justify-start gap-2 text-sm transition-colors hover:opacity-70"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="flex items-center justify-center md:justify-start gap-2 text-sm transition-colors hover:opacity-70"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {store.email}
                  </a>
                )}
                {store.location && (store.location.address || store.location.city) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.location.address, store.location.city, store.location.country].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center md:justify-start gap-2 text-sm transition-colors hover:opacity-70"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{[store.location.address, store.location.city, store.location.country].filter(Boolean).join(', ')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Siguenos */}
            <div className="text-center md:text-left">
              <h4 className="font-medium mb-4 tracking-wide" style={{ color: gold }}>Siguenos</h4>
              <div className="flex items-center justify-center md:justify-start gap-3">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                    style={{ backgroundColor: sepia, color: cream }}
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
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                    style={{ backgroundColor: sepia, color: cream }}
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
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                    style={{ backgroundColor: sepia, color: cream }}
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
          <div className="mt-12 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ borderTop: `1px solid ${sepia}` }}>
            <p className="text-sm opacity-60 text-center md:text-left">
              &copy; {new Date().getFullYear()} {store.name}
            </p>
{(!store.plan || store.plan === 'free') && (
              <a
                href="https://shopifree.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm transition-colors hover:opacity-70 text-center md:text-right"
                style={{ color: gold }}
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* ===================== CART BAR ===================== */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
          <div
            className="max-w-xl mx-auto rounded-full shadow-2xl p-3 flex items-center justify-between gap-4"
            style={{ backgroundColor: darkBrown }}
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex-1 flex items-center gap-3 text-white pl-2"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                style={{ backgroundColor: gold, color: darkBrown }}
              >
                {totalItems}
              </div>
              <div className="text-left">
                <p className="text-xs opacity-60">Ver carrito</p>
                <p className="font-medium">{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>
            <button
              onClick={sendWhatsAppOrder}
              className="px-6 py-3 bg-[#25D366] text-white rounded-full font-medium hover:bg-[#20BD5A] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Pedir
            </button>
          </div>
        </div>
      )}

      {/* ===================== PRODUCT MODAL ===================== */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center animate-fadeIn"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full md:max-w-lg md:rounded-2xl max-h-[90vh] overflow-hidden animate-slideUp"
            style={{ backgroundColor: cream }}
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative">
              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <ProductGallery images={selectedProduct.images} productName={selectedProduct.name} />
              ) : selectedProduct.image ? (
                <div className="aspect-square">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    style={{ filter: 'sepia(10%)' }}
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center" style={{ backgroundColor: lightBrown, color: sepia }}>
                  <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Close */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                style={{ backgroundColor: cream }}
              >
                <svg className="w-5 h-5" style={{ color: darkBrown }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info */}
            <div className="p-6">
              <h2 className="text-xl tracking-wide" style={{ color: darkBrown }}>{selectedProduct.name}</h2>

              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-2xl font-medium" style={{ color: brown }}>
                  {formatPrice(selectedProduct.price, store.currency)}
                </span>
                {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                  <span className="text-lg line-through" style={{ color: sepia }}>
                    {formatPrice(selectedProduct.comparePrice, store.currency)}
                  </span>
                )}
              </div>

              {selectedProduct.description && (
                <p className="mt-4 text-sm leading-relaxed italic" style={{ color: sepia }}>
                  {selectedProduct.description}
                </p>
              )}

              {/* Specs */}
              {(selectedProduct.sku || selectedProduct.brand) && (
                <div className="mt-4 pt-4 space-y-2" style={{ borderTop: `1px solid ${lightBrown}` }}>
                  {selectedProduct.brand && (
                    <p className="text-sm" style={{ color: sepia }}>
                      <span className="font-medium" style={{ color: darkBrown }}>Marca:</span> {selectedProduct.brand}
                    </p>
                  )}
                  {selectedProduct.sku && (
                    <p className="text-sm" style={{ color: sepia }}>
                      <span className="font-medium" style={{ color: darkBrown }}>Ref:</span> {selectedProduct.sku}
                    </p>
                  )}
                </div>
              )}

              {/* Add to cart */}
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full mt-6 py-4 rounded-full font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: brown, color: cream }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CART DRAWER ===================== */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 animate-fadeIn"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
            style={{ backgroundColor: cream }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `2px solid ${lightBrown}` }}>
              <h2 className="text-lg tracking-wide" style={{ color: darkBrown }}>
                Tu carrito ({totalItems})
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
              >
                <svg className="w-5 h-5" style={{ color: darkBrown }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map(item => (
                <div
                  key={item.product.id}
                  className="flex gap-4 p-3 rounded-xl"
                  style={{ backgroundColor: 'white', border: `1px solid ${lightBrown}` }}
                >
                  <div
                    className="w-20 h-20 overflow-hidden flex-shrink-0"
                    style={{ border: `2px solid ${sepia}`, padding: '2px' }}
                  >
                    {item.product.image ? (
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" style={{ filter: 'sepia(10%)' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: lightBrown, color: sepia }}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm truncate" style={{ color: darkBrown }}>{item.product.name}</h3>
                    <p className="text-sm font-medium mt-1" style={{ color: brown }}>
                      {formatPrice(item.product.price * item.quantity, store.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ border: `1px solid ${sepia}`, color: sepia }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-8 text-center font-medium" style={{ color: darkBrown }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ border: `1px solid ${sepia}`, color: sepia }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="ml-auto transition-colors hover:opacity-70"
                        style={{ color: '#B71C1C' }}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 flex-shrink-0" style={{ borderTop: `2px solid ${lightBrown}` }}>
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium" style={{ color: sepia }}>Total</span>
                <span className="text-2xl font-medium" style={{ color: darkBrown }}>
                  {formatPrice(totalPrice, store.currency)}
                </span>
              </div>
              <button
                onClick={sendWhatsAppOrder}
                className="w-full py-4 bg-[#25D366] text-white rounded-full font-medium hover:bg-[#20BD5A] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Enviar pedido por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
