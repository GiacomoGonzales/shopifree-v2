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

export default function NeonTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // Neon colors
  const neonGreen = '#00ff88'
  const neonCyan = '#00ffff'
  const darkBg = '#0a0a0f'

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
      message += `• ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*Total: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: darkBg }}>
      {/* Custom styles for neon glow effects */}
      <style>{`
        .neon-glow {
          text-shadow: 0 0 10px ${neonGreen}, 0 0 20px ${neonGreen}, 0 0 40px ${neonGreen};
        }
        .neon-glow-cyan {
          text-shadow: 0 0 10px ${neonCyan}, 0 0 20px ${neonCyan}, 0 0 40px ${neonCyan};
        }
        .neon-box {
          box-shadow: 0 0 10px ${neonGreen}40, 0 0 20px ${neonGreen}20, inset 0 0 20px ${neonGreen}10;
        }
        .neon-box-cyan {
          box-shadow: 0 0 10px ${neonCyan}40, 0 0 20px ${neonCyan}20;
        }
        .neon-border {
          box-shadow: 0 0 5px ${neonGreen}, inset 0 0 5px ${neonGreen}40;
        }
        .grid-bg {
          background-image:
            linear-gradient(${neonGreen}08 1px, transparent 1px),
            linear-gradient(90deg, ${neonGreen}08 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      {/* ===================== ANNOUNCEMENT ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-2.5 px-4 text-center text-sm font-medium animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || neonGreen,
            color: store.announcement?.textColor || darkBg
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
        className={`sticky top-0 z-50 transition-all duration-500 border-b ${
          scrolled ? 'backdrop-blur-xl' : ''
        }`}
        style={{
          backgroundColor: scrolled ? `${darkBg}ee` : darkBg,
          borderColor: scrolled ? `${neonGreen}30` : 'transparent'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            {store.logo ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden neon-box">
                <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center neon-box"
                style={{ backgroundColor: `${neonGreen}20` }}
              >
                <span className="font-bold neon-glow" style={{ color: neonGreen }}>{store.name.charAt(0)}</span>
              </div>
            )}
            <h1 className="font-bold text-lg tracking-wide" style={{ color: neonGreen }}>
              {store.name}
            </h1>
          </div>

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative w-11 h-11 flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{ backgroundColor: `${neonGreen}15`, border: `1px solid ${neonGreen}40` }}
          >
            <svg className="w-5 h-5" style={{ color: neonGreen }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {totalItems > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center animate-scaleIn"
                style={{ backgroundColor: neonGreen, color: darkBg }}
              >
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        {(store.heroImage || store.heroImageMobile) ? (
          <>
            {/* Mobile Hero */}
            <div className="md:hidden relative max-h-[400px] overflow-hidden flex justify-center" style={{ backgroundColor: darkBg }}>
              <img
                src={store.heroImageMobile || store.heroImage}
                alt=""
                className="w-full h-auto max-h-[400px] object-contain"
              />
              {/* Neon overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${neonGreen}40 0%, transparent 50%, ${neonCyan}30 100%)`
                }}
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to top, ${darkBg} 0%, transparent 50%)` }} />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-3xl font-bold neon-glow" style={{ color: neonGreen }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-white/70 text-lg mt-2">{store.about.slogan}</p>
                  )}
                </div>
              </div>
            </div>
            {/* Desktop Hero */}
            <div className="hidden md:block relative overflow-hidden">
              <img
                src={store.heroImage || store.heroImageMobile}
                alt=""
                className="w-full aspect-[16/5] object-cover"
              />
              {/* Neon overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${neonGreen}40 0%, transparent 50%, ${neonCyan}30 100%)`
                }}
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to top, ${darkBg} 0%, transparent 50%)` }} />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-10">
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-5xl font-bold neon-glow" style={{ color: neonGreen }}>
                    {store.name}
                  </h2>
                  {store.about?.slogan && (
                    <p className="text-white/70 text-lg mt-2">{store.about.slogan}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 md:py-28 grid-bg relative">
            {/* Glow orbs */}
            <div
              className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full blur-[100px] opacity-30"
              style={{ backgroundColor: neonGreen }}
            />
            <div
              className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-20"
              style={{ backgroundColor: neonCyan }}
            />

            <div className="relative max-w-4xl mx-auto px-6 text-center">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ backgroundColor: `${neonGreen}15`, border: `1px solid ${neonGreen}40`, color: neonGreen }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: neonGreen }}></span>
                Online
              </div>
              <h1 className="text-4xl md:text-6xl font-bold neon-glow mb-4" style={{ color: neonGreen }}>
                {store.name}
              </h1>
              {store.about?.slogan && (
                <p className="text-xl text-white/60">{store.about.slogan}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <nav
          className="sticky top-16 z-40 backdrop-blur-xl border-b"
          style={{ backgroundColor: `${darkBg}ee`, borderColor: `${neonGreen}20` }}
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex md:justify-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className="flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300"
                style={!activeCategory ? {
                  backgroundColor: neonGreen,
                  color: darkBg,
                  boxShadow: `0 0 20px ${neonGreen}60`
                } : {
                  backgroundColor: `${neonGreen}10`,
                  color: neonGreen,
                  border: `1px solid ${neonGreen}30`
                }}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300"
                  style={activeCategory === cat.id ? {
                    backgroundColor: neonGreen,
                    color: darkBg,
                    boxShadow: `0 0 20px ${neonGreen}60`
                  } : {
                    backgroundColor: `${neonGreen}10`,
                    color: neonGreen,
                    border: `1px solid ${neonGreen}30`
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
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-xl flex items-center justify-center neon-box"
              style={{ backgroundColor: `${neonGreen}10` }}
            >
              <svg className="w-12 h-12" style={{ color: `${neonGreen}50` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-white/50 text-lg">No hay productos disponibles</p>
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
                  className="group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    backgroundColor: `${neonGreen}05`,
                    border: `1px solid ${neonGreen}20`
                  }}
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: `${neonGreen}10` }}
                      >
                        <svg className="w-12 h-12" style={{ color: `${neonGreen}30` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Neon overlay on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(to top, ${darkBg}ee 0%, transparent 50%)` }}
                    />

                    {/* Badges */}
                    {hasDiscount && (
                      <div
                        className="absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded"
                        style={{ backgroundColor: neonCyan, color: darkBg }}
                      >
                        -{discountPercent}%
                      </div>
                    )}

                    {/* Quick Add */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addItem(product)
                      }}
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-lg flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95"
                      style={{ backgroundColor: neonGreen, color: darkBg }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-white/90 line-clamp-2 text-sm leading-snug mb-2 group-hover:text-white transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold" style={{ color: neonGreen }}>
                        {formatPrice(product.price, store.currency)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-white/40 line-through">
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
      <footer className="border-t mt-12" style={{ borderColor: `${neonGreen}20`, backgroundColor: `${neonGreen}05` }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {store.logo ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden neon-box">
                    <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center neon-box"
                    style={{ backgroundColor: `${neonGreen}20` }}
                  >
                    <span className="font-bold text-xl neon-glow" style={{ color: neonGreen }}>{store.name.charAt(0)}</span>
                  </div>
                )}
                <span className="font-bold text-xl" style={{ color: neonGreen }}>{store.name}</span>
              </div>
              {store.about?.description && (
                <p className="text-white/50 text-sm leading-relaxed">{store.about.description}</p>
              )}
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-white mb-4">Contacto</h3>
              <div className="space-y-3">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()}
                    className="flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${neonGreen}15`, border: `1px solid ${neonGreen}30` }}
                    >
                      <svg className="w-5 h-5" style={{ color: neonGreen }} fill="currentColor" viewBox="0 0 24 24">
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
                    className="flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${neonCyan}15`, border: `1px solid ${neonCyan}30` }}
                    >
                      <svg className="w-5 h-5" style={{ color: neonCyan }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <span className="text-sm">@{store.instagram.replace('@', '')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="font-semibold text-white mb-4">Estado</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: neonGreen }}></span>
                  Sistema operativo
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: neonGreen }}></span>
                  Pedidos activos
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: neonCyan }}></span>
                  Envios habilitados
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ borderColor: `${neonGreen}20` }}>
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} {store.name}
            </p>
            <a
              href="https://shopifree.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors"
              style={{ color: neonGreen }}
            >
              Powered by Shopifree
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
          onClick={() => onWhatsAppClick?.()}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
          style={{ backgroundColor: neonGreen, boxShadow: `0 0 30px ${neonGreen}60` }}
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
            className="max-w-xl mx-auto rounded-xl p-4 flex items-center justify-between gap-4"
            style={{ backgroundColor: darkBg, border: `2px solid ${neonGreen}`, boxShadow: `0 0 30px ${neonGreen}40` }}
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${neonGreen}20` }}
              >
                <span className="text-sm font-bold" style={{ color: neonGreen }}>{totalItems}</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-white/50">Ver pedido</p>
                <p className="font-bold" style={{ color: neonGreen }}>{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>

            <button
              onClick={sendWhatsAppOrder}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: neonGreen, color: darkBg }}
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
            style={{ backgroundColor: darkBg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${neonGreen}20`, border: `1px solid ${neonGreen}40` }}
            >
              <svg className="w-5 h-5" style={{ color: neonGreen }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                  variant="dark"
                />

                {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                  <div
                    className="absolute top-4 left-4 z-10 px-3 py-1.5 text-sm font-bold rounded-lg"
                    style={{ backgroundColor: neonCyan, color: darkBg }}
                  >
                    -{Math.round((1 - selectedProduct.price / selectedProduct.comparePrice) * 100)}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedProduct.name}
                </h2>

                {selectedProduct.description && (
                  <p className="text-white/60 leading-relaxed mb-6">{selectedProduct.description}</p>
                )}

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold" style={{ color: neonGreen }}>
                    {formatPrice(selectedProduct.price, store.currency)}
                  </span>
                  {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                    <span className="text-xl text-white/40 line-through">
                      {formatPrice(selectedProduct.comparePrice, store.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Add Button */}
            <div className="p-6 border-t" style={{ borderColor: `${neonGreen}20` }}>
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: neonGreen, color: darkBg, boxShadow: `0 0 30px ${neonGreen}40` }}
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
            style={{ backgroundColor: darkBg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: `${neonGreen}20` }}>
              <h2 className="text-xl font-bold text-white">Tu pedido</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                style={{ backgroundColor: `${neonGreen}10` }}
              >
                <svg className="w-5 h-5" style={{ color: neonGreen }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div
                    className="w-20 h-20 mb-6 rounded-xl flex items-center justify-center neon-box"
                    style={{ backgroundColor: `${neonGreen}10` }}
                  >
                    <svg className="w-10 h-10" style={{ color: `${neonGreen}50` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-lg">Tu carrito esta vacio</p>
                  <p className="text-white/30 text-sm mt-1">Agrega productos para continuar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <div
                      key={item.product.id}
                      className="flex gap-4 rounded-xl p-3"
                      style={{ backgroundColor: `${neonGreen}05`, border: `1px solid ${neonGreen}20` }}
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: `${neonGreen}10` }}>
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6" style={{ color: `${neonGreen}30` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.product.name}</h3>
                        <p className="text-sm font-semibold" style={{ color: neonGreen }}>{formatPrice(item.product.price, store.currency)}</p>

                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                            style={{ backgroundColor: `${neonGreen}15`, border: `1px solid ${neonGreen}30` }}
                          >
                            <svg className="w-4 h-4" style={{ color: neonGreen }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-6 text-center font-semibold text-sm text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                            style={{ backgroundColor: `${neonGreen}15`, border: `1px solid ${neonGreen}30` }}
                          >
                            <svg className="w-4 h-4" style={{ color: neonGreen }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="ml-auto p-1.5 text-white/30 hover:text-red-500 transition-colors"
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
              <div className="p-6 border-t" style={{ borderColor: `${neonGreen}20` }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/50">Total</span>
                  <span className="text-2xl font-bold" style={{ color: neonGreen }}>{formatPrice(totalPrice, store.currency)}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false)
                    sendWhatsAppOrder()
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-semibold hover:bg-[#20BD5A] active:scale-[0.98] transition-all"
                  style={{ boxShadow: '0 0 20px #25D36640' }}
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
