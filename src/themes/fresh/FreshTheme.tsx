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
}

export default function FreshTheme({ store, products, categories }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

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
    let message = `Hola! Me interesa:\n\n`
    items.forEach(item => {
      message += `• ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*Total: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#ecfdf5]">

      {/* ===================== ANNOUNCEMENT ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-2.5 px-4 text-center text-sm animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || '#059669',
            color: store.announcement?.textColor || '#ffffff'
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {store.announcement?.link ? (
              <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {store.announcement.text}
              </a>
            ) : (
              <span>{store.announcement?.text}</span>
            )}
          </div>
          <button
            onClick={() => setAnnouncementDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
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
          scrolled
            ? 'bg-white/95 backdrop-blur-lg shadow-sm'
            : 'bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="h-10 w-10 object-contain rounded-xl" />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="font-semibold text-gray-900">{store.name}</h1>
              {store.about?.slogan && (
                <p className="text-xs text-emerald-600">{store.about.slogan}</p>
              )}
            </div>
          </div>

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scaleIn">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        {store.heroImage ? (
          <div className="relative h-[45vh] md:h-[55vh]">
            <img
              src={store.heroImage}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/60 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-6xl mx-auto px-6 w-full">
                <div className="max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm mb-4">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    100% Natural
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-3">{store.name}</h2>
                  {store.about?.slogan && (
                    <p className="text-lg text-white/90">{store.about.slogan}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 md:py-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 relative">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-4xl mx-auto px-6 text-center relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                Productos naturales
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="text-xl text-white/90 font-light">
                  {store.about.slogan}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ===================== BENEFITS BAR ===================== */}
      <div className="bg-white border-b border-emerald-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-8 md:gap-16 text-sm overflow-x-auto">
            <div className="flex items-center gap-2 text-emerald-700 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>100% Natural</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span>Hecho con amor</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span>Envio rapido</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <nav className="sticky top-16 z-40 bg-white/80 backdrop-blur-lg border-b border-emerald-100">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  !activeCategory
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeCategory === cat.id
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* ===================== PRODUCTS ===================== */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {activeCategory
                ? categories.find(c => c.id === activeCategory)?.name || 'Productos'
                : 'Todos los productos'}
            </h2>
            <p className="text-emerald-600 text-sm mt-1">{filteredProducts.length} productos disponibles</p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map(product => {
              const hasDiscount = product.comparePrice && product.comparePrice > product.price
              const discountPercent = hasDiscount
                ? Math.round((1 - product.price / product.comparePrice!) * 100)
                : 0

              return (
                <article
                  key={product.id}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-emerald-50"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-emerald-50">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {hasDiscount && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
                          -{discountPercent}%
                        </span>
                      )}
                      {product.featured && (
                        <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* Quick Add */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addItem(product)
                      }}
                      className="absolute bottom-3 right-3 w-10 h-10 bg-emerald-500 text-white rounded-xl shadow-lg flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-emerald-600 active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 line-clamp-2 text-sm leading-snug mb-2 group-hover:text-emerald-700 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-emerald-600 font-bold text-lg">
                        {formatPrice(product.price, store.currency)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
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
      <footer className="bg-white border-t border-emerald-100 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="h-12 w-12 object-contain rounded-xl" />
                ) : (
                  <div className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                )}
                <span className="font-bold text-xl text-gray-900">{store.name}</span>
              </div>
              {store.about?.description && (
                <p className="text-gray-500 text-sm leading-relaxed">
                  {store.about.description}
                </p>
              )}
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Contacto</h3>
              <div className="space-y-3">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <span className="text-sm">WhatsApp</span>
                  </a>
                )}
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <span className="text-sm">@{store.instagram.replace('@', '')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Values */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Nuestros valores</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Productos naturales
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Calidad garantizada
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Envio cuidadoso
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {store.name}
            </p>
            <a
              href="https://shopifree.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              Creado con Shopifree
            </a>
          </div>
        </div>
      </footer>

      {/* ===================== WHATSAPP FLOAT ===================== */}
      {store.whatsapp && totalItems === 0 && (
        <a
          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Vi tu catalogo ${store.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] rounded-2xl shadow-xl shadow-green-500/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* ===================== CART BAR ===================== */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
          <div className="max-w-xl mx-auto bg-emerald-600 rounded-2xl shadow-2xl shadow-emerald-600/30 p-4 flex items-center justify-between gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-sm font-bold text-white">{totalItems}</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-emerald-100">Ver pedido</p>
                <p className="font-bold text-white">{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>

            <button
              onClick={sendWhatsAppOrder}
              className="flex items-center gap-2 bg-white text-emerald-600 px-5 py-3 rounded-xl font-semibold hover:bg-emerald-50 active:scale-95 transition-all"
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl animate-slideLeft flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {/* Image Gallery */}
              <div className="relative">
                <ProductGallery
                  images={[
                    ...(selectedProduct.image ? [selectedProduct.image] : []),
                    ...(selectedProduct.images || [])
                  ].filter(Boolean)}
                  productName={selectedProduct.name}
                  variant="light"
                />

                {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                  <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-lg">
                    -{Math.round((1 - selectedProduct.price / selectedProduct.comparePrice) * 100)}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {selectedProduct.featured && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium mb-3">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Producto destacado
                  </div>
                )}

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedProduct.name}
                </h2>

                {selectedProduct.description && (
                  <p className="text-gray-500 leading-relaxed mb-6">{selectedProduct.description}</p>
                )}

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-emerald-600">
                    {formatPrice(selectedProduct.price, store.currency)}
                  </span>
                  {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                    <span className="text-xl text-gray-400 line-through">
                      {formatPrice(selectedProduct.comparePrice, store.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Add Button */}
            <div className="p-6 border-t border-emerald-100 bg-emerald-50/50">
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full py-4 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25"
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl animate-slideLeft flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-100 bg-emerald-50/50">
              <h2 className="text-xl font-bold text-gray-900">Tu pedido</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 mb-6 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">Tu carrito esta vacio</p>
                  <p className="text-gray-400 text-sm mt-1">Agrega productos para continuar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.product.id} className="flex gap-4 bg-emerald-50/50 rounded-xl p-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-white flex-shrink-0">
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{item.product.name}</h3>
                        <p className="text-emerald-600 text-sm font-semibold">{formatPrice(item.product.price, store.currency)}</p>

                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white flex items-center justify-center hover:bg-emerald-100 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-white flex items-center justify-center hover:bg-emerald-100 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="ml-auto p-1.5 text-gray-300 hover:text-red-500 transition-colors"
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
              <div className="p-6 border-t border-emerald-100 bg-emerald-50/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500">Total</span>
                  <span className="text-2xl font-bold text-emerald-600">{formatPrice(totalPrice, store.currency)}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false)
                    sendWhatsAppOrder()
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-semibold hover:bg-[#20BD5A] active:scale-[0.98] transition-all shadow-lg shadow-green-500/20"
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
