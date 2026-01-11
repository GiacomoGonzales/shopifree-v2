import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import ProductGallery from '../shared/ProductGallery'
import '../shared/animations.css'

/**
 * POP THEME - "DIVERTIDO"
 *
 * Filosofia: Colorido, energico, juvenil.
 * - Paleta: Colores vibrantes (amarillo, rosa, azul, verde)
 * - Tipografia bold y divertida
 * - Formas geometricas, bordes redondeados
 * - Sombras de colores, gradientes
 * - Ideal para dulces, juguetes, accesorios juveniles
 */

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
}

export default function PopTheme({ store, products, categories }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // Pop colors
  const yellow = '#FFE135'
  const pink = '#FF6B9D'
  const blue = '#4ECDC4'
  const purple = '#9B5DE5'
  const orange = '#FF9F1C'
  const dark = '#2D2D2D'
  const light = '#FFFDF7'

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
    let message = `Hola! Quiero pedir:\n\n`
    items.forEach(item => {
      message += `- ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*Total: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  // Rotating colors for categories
  const categoryColors = [pink, blue, purple, orange, yellow]
  const getCategoryColor = (index: number) => categoryColors[index % categoryColors.length]

  return (
    <div className="min-h-screen" style={{ backgroundColor: light }}>
      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
        .font-pop {
          font-family: 'Nunito', system-ui, sans-serif;
        }
        .pop-shadow-pink { box-shadow: 4px 4px 0 ${pink}; }
        .pop-shadow-blue { box-shadow: 4px 4px 0 ${blue}; }
        .pop-shadow-yellow { box-shadow: 4px 4px 0 ${yellow}; }
        .pop-shadow-purple { box-shadow: 4px 4px 0 ${purple}; }
        .wiggle:hover { animation: wiggle 0.5s ease-in-out; }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        .bounce-hover:hover { animation: bounce 0.5s ease; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* ===================== ANNOUNCEMENT ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-3 px-4 text-center font-pop font-bold animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || yellow,
            color: store.announcement?.textColor || dark
          }}
        >
          {store.announcement?.link ? (
            <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              {store.announcement.text} ✨
            </a>
          ) : (
            <span>{store.announcement?.text} ✨</span>
          )}
          <button
            onClick={() => setAnnouncementDismissed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===================== HEADER ===================== */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'py-2' : 'py-3'
        }`}
        style={{
          backgroundColor: scrolled ? `${light}f5` : light,
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? `3px solid ${yellow}` : '3px solid transparent'
        }}
      >
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            {store.logo ? (
              <div
                className="w-12 h-12 rounded-2xl overflow-hidden border-3 wiggle"
                style={{ borderColor: pink, borderWidth: '3px' }}
              >
                <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-pop font-black text-xl wiggle"
                style={{ backgroundColor: pink, color: light }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <h1 className="font-pop font-black text-xl md:text-2xl" style={{ color: dark }}>
              {store.name}
            </h1>
          </div>

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bounce-hover"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-105"
              style={{ backgroundColor: blue }}
            >
              <svg className="w-6 h-6" style={{ color: light }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            {totalItems > 0 && (
              <span
                className="absolute -top-2 -right-2 w-6 h-6 text-sm font-pop font-black rounded-full flex items-center justify-center animate-scaleIn"
                style={{ backgroundColor: pink, color: light }}
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
            <div className="md:hidden relative max-h-[400px] overflow-hidden" style={{ backgroundColor: yellow }}>
              <img
                src={store.heroImageMobile || store.heroImage}
                alt=""
                className="w-full h-auto max-h-[400px] object-contain"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(to top, ${dark}90 0%, transparent 60%)` }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                <h2 className="font-pop font-black text-3xl text-white mb-2 drop-shadow-lg">{store.name}</h2>
                {store.about?.slogan && (
                  <p className="font-pop font-bold text-white/90">{store.about.slogan}</p>
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
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(to top, ${dark}80 0%, transparent 50%)` }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-12 text-center">
                <h2 className="font-pop font-black text-5xl lg:text-6xl text-white mb-3 drop-shadow-lg">{store.name}</h2>
                {store.about?.slogan && (
                  <p className="font-pop font-bold text-xl text-white/90">{store.about.slogan}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div
            className="py-16 md:py-24 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${yellow} 0%, ${pink} 50%, ${blue} 100%)` }}
          >
            {/* Decorative shapes */}
            <div className="absolute top-10 left-10 w-20 h-20 rounded-full opacity-30" style={{ backgroundColor: light }} />
            <div className="absolute bottom-10 right-10 w-32 h-32 rounded-3xl rotate-12 opacity-20" style={{ backgroundColor: light }} />
            <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-2xl -rotate-12 opacity-25" style={{ backgroundColor: light }} />

            <div className="relative max-w-4xl mx-auto px-6 text-center">
              <h1 className="font-pop font-black text-5xl md:text-7xl text-white mb-4 drop-shadow-lg">
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="font-pop font-bold text-xl md:text-2xl text-white/90">
                  {store.about.slogan}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <nav className="sticky top-[60px] z-40 border-b-3" style={{ backgroundColor: light, borderColor: yellow, borderBottomWidth: '3px' }}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex md:justify-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className="flex-shrink-0 px-5 py-2.5 rounded-full font-pop font-bold text-sm transition-all duration-300 hover:scale-105"
                style={!activeCategory ? {
                  backgroundColor: dark,
                  color: light,
                  boxShadow: `3px 3px 0 ${yellow}`
                } : {
                  backgroundColor: `${dark}10`,
                  color: dark
                }}
              >
                Todo 🎯
              </button>
              {categories.map((cat, index) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex-shrink-0 px-5 py-2.5 rounded-full font-pop font-bold text-sm transition-all duration-300 hover:scale-105"
                  style={activeCategory === cat.id ? {
                    backgroundColor: getCategoryColor(index),
                    color: light,
                    boxShadow: `3px 3px 0 ${dark}`
                  } : {
                    backgroundColor: `${getCategoryColor(index)}20`,
                    color: dark
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
      <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center"
              style={{ backgroundColor: `${pink}20` }}
            >
              <span className="text-5xl">🎁</span>
            </div>
            <p className="font-pop font-bold text-xl" style={{ color: dark }}>No hay productos todavia</p>
            <p className="font-pop mt-2" style={{ color: `${dark}60` }}>Pronto habra cosas increibles!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product, index) => {
              const hasDiscount = product.comparePrice && product.comparePrice > product.price
              const cardColor = categoryColors[index % categoryColors.length]

              return (
                <article
                  key={product.id}
                  className="group cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image */}
                  <div
                    className="relative aspect-square overflow-hidden rounded-3xl mb-3"
                    style={{
                      backgroundColor: `${cardColor}15`,
                      border: `3px solid ${cardColor}`,
                    }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl">🎨</span>
                      </div>
                    )}

                    {/* Badge */}
                    {hasDiscount && (
                      <div
                        className="absolute top-3 left-3 px-3 py-1 rounded-full font-pop font-bold text-xs"
                        style={{ backgroundColor: pink, color: light }}
                      >
                        OFERTA 🔥
                      </div>
                    )}

                    {/* Quick Add */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addItem(product)
                      }}
                      className="absolute bottom-3 right-3 w-12 h-12 rounded-2xl flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"
                      style={{ backgroundColor: dark, color: light, boxShadow: `3px 3px 0 ${cardColor}` }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="text-center">
                    <h3 className="font-pop font-bold text-sm md:text-base line-clamp-2 mb-1" style={{ color: dark }}>
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-pop font-black text-lg" style={{ color: cardColor }}>
                        {formatPrice(product.price, store.currency)}
                      </span>
                      {hasDiscount && (
                        <span className="font-pop text-sm line-through" style={{ color: `${dark}40` }}>
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
      <footer style={{ backgroundColor: dark }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Brand */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl">✨</span>
              <h3 className="font-pop font-black text-3xl" style={{ color: light }}>{store.name}</h3>
              <span className="text-3xl">✨</span>
            </div>
            {store.about?.description && (
              <p className="font-pop max-w-md mx-auto" style={{ color: `${light}70` }}>{store.about.description}</p>
            )}
          </div>

          {/* Social */}
          <div className="flex items-center justify-center gap-4 mb-10">
            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: blue, color: light }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            )}
            {store.instagram && (
              <a
                href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: pink, color: light }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t text-center" style={{ borderColor: `${light}15` }}>
            <p className="font-pop text-sm mb-3" style={{ color: `${light}50` }}>
              {new Date().getFullYear()} {store.name} 💜
            </p>
            <a
              href="https://shopifree.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-pop font-bold text-sm transition-colors"
              style={{ color: yellow }}
            >
              Powered by Shopifree ⚡
            </a>
          </div>
        </div>
      </footer>

      {/* ===================== WHATSAPP FLOAT ===================== */}
      {store.whatsapp && totalItems === 0 && (
        <a
          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Vi tu tienda ${store.name} 🛍️`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
          style={{ backgroundColor: blue, color: light, boxShadow: `4px 4px 0 ${dark}` }}
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
            className="max-w-xl mx-auto rounded-3xl p-4 flex items-center justify-between gap-4"
            style={{ backgroundColor: dark, boxShadow: `4px 4px 0 ${yellow}` }}
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-pop font-black"
                style={{ backgroundColor: pink, color: light }}
              >
                {totalItems}
              </div>
              <div className="text-left">
                <p className="font-pop text-xs" style={{ color: `${light}60` }}>Ver carrito</p>
                <p className="font-pop font-black text-lg" style={{ color: yellow }}>{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>

            <button
              onClick={sendWhatsAppOrder}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-pop font-bold transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: blue, color: light }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="hidden sm:inline">Pedir!</span>
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
            style={{ backgroundColor: light }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: pink, color: light }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
                <h2 className="font-pop font-black text-2xl mb-2" style={{ color: dark }}>
                  {selectedProduct.name}
                </h2>

                {selectedProduct.description && (
                  <p className="font-pop leading-relaxed mb-6" style={{ color: `${dark}70` }}>{selectedProduct.description}</p>
                )}

                <div className="flex items-baseline gap-3">
                  <span className="font-pop font-black text-3xl" style={{ color: pink }}>
                    {formatPrice(selectedProduct.price, store.currency)}
                  </span>
                  {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                    <span className="font-pop text-xl line-through" style={{ color: `${dark}40` }}>
                      {formatPrice(selectedProduct.comparePrice, store.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Add Button */}
            <div className="p-6 border-t-3" style={{ borderColor: yellow }}>
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full py-4 rounded-2xl font-pop font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: dark, color: yellow, boxShadow: `4px 4px 0 ${pink}` }}
              >
                Agregar al carrito 🛒
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
            style={{ backgroundColor: light }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-3" style={{ borderColor: yellow }}>
              <h2 className="font-pop font-black text-xl" style={{ color: dark }}>Tu Carrito 🛒</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: pink, color: light }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <span className="text-6xl mb-4">🛒</span>
                  <p className="font-pop font-bold text-xl" style={{ color: dark }}>Tu carrito esta vacio</p>
                  <p className="font-pop mt-2" style={{ color: `${dark}60` }}>Agrega productos increibles!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const cardColor = categoryColors[index % categoryColors.length]
                    return (
                      <div
                        key={item.product.id}
                        className="flex gap-4 p-3 rounded-2xl"
                        style={{ backgroundColor: `${cardColor}15`, border: `2px solid ${cardColor}` }}
                      >
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: `${cardColor}30` }}>
                          {item.product.image ? (
                            <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl">🎁</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-pop font-bold truncate" style={{ color: dark }}>{item.product.name}</h3>
                          <p className="font-pop font-black" style={{ color: cardColor }}>{formatPrice(item.product.price, store.currency)}</p>

                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center rounded-full overflow-hidden" style={{ backgroundColor: `${dark}10` }}>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center font-bold transition-colors hover:bg-black/10"
                                style={{ color: dark }}
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-pop font-bold" style={{ color: dark }}>{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center font-bold transition-colors hover:bg-black/10"
                                style={{ color: dark }}
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.product.id)}
                              className="text-2xl transition-transform hover:scale-110"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Checkout */}
            {items.length > 0 && (
              <div className="p-6 border-t-3" style={{ borderColor: yellow }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-pop font-bold" style={{ color: `${dark}70` }}>Total</span>
                  <span className="font-pop font-black text-2xl" style={{ color: dark }}>{formatPrice(totalPrice, store.currency)}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false)
                    sendWhatsAppOrder()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-pop font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#25D366', color: light, boxShadow: `4px 4px 0 ${dark}` }}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Pedir por WhatsApp 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
