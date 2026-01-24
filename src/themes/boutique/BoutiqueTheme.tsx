import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import { getThemeTranslations } from '../shared/translations'
import ProductGallery from '../shared/ProductGallery'
import { optimizeImage } from '../../utils/cloudinary'
import '../shared/animations.css'

interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void
}

export default function BoutiqueTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const t = getThemeTranslations(store.language)
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

  const featuredProducts = products.filter(p => p.featured).slice(0, 4)

  const sendWhatsAppOrder = () => {
    if (!store.whatsapp || items.length === 0) return
    onWhatsAppClick?.()
    let message = `${t.whatsappOrder}\n\n`
    items.forEach(item => {
      message += `• ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*${t.total}: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#fdf2f8]">

      {/* ===================== ANNOUNCEMENT ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-2.5 px-4 text-center text-sm animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || '#be185d',
            color: store.announcement?.textColor || '#ffffff'
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
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-4">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="h-12 w-12 object-contain rounded-full border-2 border-pink-100" />
            ) : (
              <div className="h-12 w-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
                <span className="text-white font-serif text-xl">{store.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="font-serif text-xl text-gray-900 tracking-wide">{store.name}</h1>
              {store.about?.slogan && (
                <p className="text-xs text-pink-600 italic">{store.about.slogan}</p>
              )}
            </div>
          </div>

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative w-12 h-12 flex items-center justify-center rounded-full bg-pink-50 hover:bg-pink-100 transition-colors"
          >
            <svg className="w-5 h-5 text-pink-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scaleIn">
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
            <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center bg-pink-50">
              <img
                src={optimizeImage(store.heroImageMobile || store.heroImage, 'hero')}
                alt=""
                className="w-full h-auto max-h-[400px] object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="max-w-6xl mx-auto">
                  <h2 className="font-serif text-3xl mb-2">{store.name}</h2>
                  {store.about?.slogan && (
                    <p className="text-lg text-white/90 font-light">{store.about.slogan}</p>
                  )}
                </div>
              </div>
            </div>
            {/* Desktop Hero */}
            <div className="hidden md:block relative overflow-hidden">
              <img
                src={optimizeImage(store.heroImage || store.heroImageMobile, 'hero')}
                alt=""
                className="w-full aspect-[16/5] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
                <div className="max-w-6xl mx-auto">
                  <h2 className="font-serif text-5xl mb-2">{store.name}</h2>
                  {store.about?.slogan && (
                    <p className="text-xl text-white/90 font-light">{store.about.slogan}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 md:py-24 text-center bg-gradient-to-b from-white to-pink-50">
            <div className="max-w-3xl mx-auto px-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm mb-6">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {t.hot}
              </div>
              <h1 className="font-serif text-4xl md:text-6xl text-gray-900 mb-4">
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="text-lg md:text-xl text-gray-600 font-light italic">
                  "{store.about.slogan}"
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ===================== FEATURED ===================== */}
      {featuredProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-serif text-2xl md:text-3xl text-gray-900">{t.hot}</h2>
                <div className="w-16 h-0.5 bg-gradient-to-r from-pink-400 to-rose-400 mt-2"></div>
              </div>
              <button
                onClick={() => {
                  setActiveCategory(null)
                  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
              >
                {t.view} {t.all.toLowerCase()}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map(product => (
                <article
                  key={product.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="relative aspect-[3/4] mb-3 rounded-2xl overflow-hidden bg-pink-50">
                    {product.image ? (
                      <img
                        src={optimizeImage(product.image, 'card')}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-rose-500 text-white text-xs font-medium rounded-full">
                      {t.hot}
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-pink-600 font-semibold">{formatPrice(product.price, store.currency)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <nav className="sticky top-20 z-40 bg-white border-y border-pink-100">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex md:justify-center gap-2 py-4 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  !activeCategory
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200'
                    : 'bg-pink-50 text-gray-700 hover:bg-pink-100'
                }`}
              >
                {t.all}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200'
                      : 'bg-pink-50 text-gray-700 hover:bg-pink-100'
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
      <main id="products-section" className="scroll-mt-32 max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-pink-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-light">{t.noItems}</p>
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
                  className="group cursor-pointer bg-white rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all duration-300"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image */}
                  <div className="relative aspect-[3/4] mb-3 rounded-xl overflow-hidden bg-pink-50">
                    {product.image ? (
                      <img
                        src={optimizeImage(product.image, 'card')}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-full">
                        -{discountPercent}%
                      </div>
                    )}

                    {/* Quick Add */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addItem(product)
                      }}
                      className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-pink-50"
                    >
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="space-y-1 px-1">
                    <h3 className="font-medium text-gray-900 line-clamp-2 text-sm leading-snug group-hover:text-pink-700 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-pink-600 font-bold">
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
      <footer className="bg-white border-t border-pink-100 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Column 1 - Brand */}
            <div className="text-center md:text-left">
              <div className="flex flex-col items-center md:items-start gap-4 mb-4">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="h-16 w-16 object-cover rounded-full border-2 border-pink-200 shadow-md"
                  />
                ) : (
                  <div className="h-16 w-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-md border-2 border-pink-200">
                    <span className="text-white font-serif text-2xl">{store.name.charAt(0)}</span>
                  </div>
                )}
                <h3 className="font-serif text-xl text-gray-900">{store.name}</h3>
              </div>
              {store.about?.description && (
                <p className="text-gray-500 text-sm leading-relaxed">
                  {store.about.description}
                </p>
              )}
            </div>

            {/* Column 2 - Contacto */}
            <div className="text-center">
              <h3 className="font-serif text-lg text-gray-900 mb-5">{t.contact}</h3>
              <div className="space-y-4">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()}
                    className="flex items-center justify-center md:justify-start gap-3 text-sm text-gray-600 hover:text-pink-600 transition-colors group"
                  >
                    <span className="w-9 h-9 bg-pink-50 rounded-full flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                      <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </span>
                    <span>WhatsApp</span>
                  </a>
                )}
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="flex items-center justify-center md:justify-start gap-3 text-sm text-gray-600 hover:text-pink-600 transition-colors group"
                  >
                    <span className="w-9 h-9 bg-pink-50 rounded-full flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                      <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </span>
                    <span>Email</span>
                  </a>
                )}
                {store.location && (store.location.address || store.location.city) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.location.address, store.location.city, store.location.country].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center md:justify-start gap-3 text-sm text-gray-600 hover:text-pink-600 transition-colors group"
                  >
                    <span className="w-9 h-9 bg-pink-50 rounded-full flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                      <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </span>
                    <span>{[store.location.address, store.location.city, store.location.country].filter(Boolean).join(', ')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Column 3 - Siguenos */}
            <div className="text-center md:text-right">
              <h3 className="font-serif text-lg text-gray-900 mb-5">{t.followUs}</h3>
              <div className="flex gap-3 justify-center md:justify-end">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-pink-300/50 transition-all duration-300"
                    aria-label="Instagram"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {store.facebook && (
                  <a
                    href={`https://facebook.com/${store.facebook.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-pink-300/50 transition-all duration-300"
                    aria-label="Facebook"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                {store.tiktok && (
                  <a
                    href={`https://tiktok.com/@${store.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-pink-300/50 transition-all duration-300"
                    aria-label="TikTok"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t border-pink-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-center md:text-left">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
            </p>
            {(!store.plan || store.plan === 'free') && (
              <a
                href="https://shopifree.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-400 hover:text-pink-600 transition-colors"
              >
                {t.poweredBy}
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* ===================== WHATSAPP FLOAT ===================== */}
      {store.whatsapp && totalItems === 0 && (
        <a
          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`${t.whatsappGreeting} ${store.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsAppClick?.()}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] rounded-full shadow-xl shadow-green-500/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* ===================== CART BAR ===================== */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
          <div className="max-w-xl mx-auto bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl shadow-2xl shadow-pink-500/30 p-4 flex items-center justify-between gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">{totalItems}</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-pink-100">{t.view} {t.cart.toLowerCase()}</p>
                <p className="font-bold text-white">{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>

            <button
              onClick={sendWhatsAppOrder}
              className="flex items-center gap-2 bg-white text-pink-600 px-5 py-3 rounded-xl font-semibold hover:bg-pink-50 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="hidden sm:inline">{t.checkout}</span>
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
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
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
                  images={selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.image ? [selectedProduct.image] : [])}
                  productName={selectedProduct.name}
                  variant="light"
                />

                {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                  <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-rose-500 text-white text-sm font-bold rounded-full">
                    -{Math.round((1 - selectedProduct.price / selectedProduct.comparePrice) * 100)}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <h2 className="font-serif text-2xl text-gray-900 mb-2">
                  {selectedProduct.name}
                </h2>

                {selectedProduct.description && (
                  <p className="text-gray-500 leading-relaxed mb-6">{selectedProduct.description}</p>
                )}

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-pink-600">
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
            <div className="p-6 border-t border-pink-100 bg-pink-50/50">
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 active:scale-[0.98] transition-all shadow-lg shadow-pink-500/25"
              >
                {t.addToCart}
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
            <div className="flex items-center justify-between p-6 border-b border-pink-100 bg-pink-50/50">
              <h2 className="font-serif text-xl text-gray-900">{t.cart}</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-pink-100 transition-colors"
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
                  <div className="w-20 h-20 mb-6 rounded-full bg-pink-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-light">{t.noItems}</p>
                  <p className="text-gray-400 text-sm mt-1">{t.checkBackSoon}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {items.map(item => (
                    <div key={item.product.id} className="flex gap-4 bg-pink-50/50 rounded-xl p-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-white flex-shrink-0">
                        {item.product.image ? (
                          <img src={optimizeImage(item.product.image, 'thumbnail')} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{item.product.name}</h3>
                        <p className="text-pink-600 text-sm font-semibold">{formatPrice(item.product.price, store.currency)}</p>

                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-pink-100 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-pink-100 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="ml-auto p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
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
              <div className="p-6 border-t border-pink-100 bg-pink-50/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500">{t.total}</span>
                  <span className="text-2xl font-bold text-pink-600">{formatPrice(totalPrice, store.currency)}</span>
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
                  {t.orderViaWhatsApp}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
