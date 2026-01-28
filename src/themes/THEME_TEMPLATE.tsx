/**
 * =====================================================
 * THEME TEMPLATE - BASE PARA NUEVOS TEMAS
 * =====================================================
 *
 * INSTRUCCIONES:
 * 1. Copiar este archivo a una nueva carpeta: src/themes/[nombre]/[Nombre]Theme.tsx
 * 2. Renombrar la funcion y personalizar los estilos
 * 3. Registrar el tema en src/themes/components.ts
 * 4. Agregar preview en el selector de temas (Branding.tsx)
 *
 * IMPORTANTE - ANALYTICS:
 * - El prop `onWhatsAppClick` ya esta conectado en todos los puntos necesarios
 * - NO eliminar las llamadas a `onWhatsAppClick?.()`
 * - Esto permite trackear clicks de WhatsApp en el dashboard
 *
 * PUNTOS DE WHATSAPP (3 lugares):
 * 1. sendWhatsAppOrder() - Funcion para enviar pedido
 * 2. Footer contact link - Link de contacto en el footer
 * 3. Floating button - Boton flotante de WhatsApp
 */

import { useState, useEffect } from 'react'
import type { Store, Product, Category } from '../types'
import { formatPrice } from '../lib/currency'
import { useCart } from '../hooks/useCart'
import ProductGallery from './shared/ProductGallery'
import './shared/animations.css'

// =====================================================
// PROPS INTERFACE - NO MODIFICAR
// =====================================================
interface Props {
  store: Store
  products: Product[]
  categories: Category[]
  onWhatsAppClick?: () => void  // REQUERIDO para analytics
}

// =====================================================
// THEME COMPONENT
// =====================================================
export default function TemplateTheme({ store, products, categories, onWhatsAppClick }: Props) {
  const { items, totalItems, totalPrice, addItem, removeItem, updateQuantity } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const showAnnouncement = store.announcement?.enabled && store.announcement?.text && !announcementDismissed

  // =====================================================
  // COLORES DEL TEMA - PERSONALIZAR AQUI
  // =====================================================
  const colors = {
    primary: '#1e3a5f',
    secondary: '#2d6cb5',
    accent: '#38bdf8',
    background: '#ffffff',
    text: '#1e3a5f',
    textMuted: '#6b7280',
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredProducts = activeCategory
    ? products.filter(p => p.categoryId === activeCategory)
    : products

  // =====================================================
  // WHATSAPP ORDER - PUNTO DE TRACKING #1
  // =====================================================
  const sendWhatsAppOrder = () => {
    if (!store.whatsapp || items.length === 0) return

    // IMPORTANTE: Trackear antes de abrir WhatsApp
    onWhatsAppClick?.()

    let message = `Hola! Me interesa:\n\n`
    items.forEach(item => {
      message += `- ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, store.currency)}\n`
    })
    message += `\n*Total: ${formatPrice(totalPrice, store.currency)}*`
    const phone = store.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>

      {/* ===================== ANNOUNCEMENT BAR ===================== */}
      {showAnnouncement && (
        <div
          className="relative py-2.5 px-4 text-center text-sm animate-fadeIn"
          style={{
            backgroundColor: store.announcement?.backgroundColor || colors.primary,
            color: store.announcement?.textColor || '#ffffff'
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
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===================== HEADER ===================== */}
      {/* NOTE: Always use a solid background color, never transparent. Transparent headers look broken. */}
      <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="h-10 w-auto" />
              ) : (
                <h1 className="text-xl font-bold" style={{ color: colors.primary }}>{store.name}</h1>
              )}
            </div>

            {/* Cart Button */}
            {totalItems > 0 && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-full"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center bg-red-500 text-white">
                  {totalItems}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      {/* Desktop: aspect-[16/5] = 1920x600px recommended
          Mobile: max-h-[450px] with h-auto */}
      {(store.heroImage || store.heroImageMobile) && (
        <section className="relative">
          {/* Mobile Hero */}
          <div className="md:hidden relative max-h-[450px] overflow-hidden">
            <img
              src={store.heroImageMobile || store.heroImage}
              alt={store.name}
              className="w-full h-auto max-h-[450px] object-cover"
            />
          </div>
          {/* Desktop Hero */}
          <div className="hidden md:block">
            <img
              src={store.heroImage || store.heroImageMobile}
              alt={store.name}
              className="w-full aspect-[16/5] object-cover"
            />
          </div>
        </section>
      )}

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <section className="py-6 border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  !activeCategory ? 'text-white' : 'bg-gray-100'
                }`}
                style={!activeCategory ? { backgroundColor: colors.primary } : {}}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.id ? 'text-white' : 'bg-gray-100'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: colors.primary } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== PRODUCTS GRID ===================== */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate" style={{ color: colors.text }}>{product.name}</h3>
                <p className="font-bold mt-1" style={{ color: colors.secondary }}>
                  {formatPrice(product.price, store.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p style={{ color: colors.textMuted }}>No hay productos disponibles</p>
          </div>
        )}
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t py-12" style={{ backgroundColor: colors.background }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>{store.name}</h3>
              {store.about?.description && (
                <p className="text-sm" style={{ color: colors.textMuted }}>{store.about.description}</p>
              )}
            </div>

            {/* Contact - PUNTO DE TRACKING #2 */}
            <div>
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Contacto</h3>
              <div className="space-y-2">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsAppClick?.()} // IMPORTANTE: Trackear click
                    className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                    style={{ color: colors.textMuted }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                    style={{ color: colors.textMuted }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    @{store.instagram.replace('@', '')}
                  </a>
                )}
              </div>
            </div>

            {/* Powered by */}
            <div className="text-center md:text-right">
              <p className="text-sm" style={{ color: colors.textMuted }}>
                © {new Date().getFullYear()} {store.name}
              </p>
              <a
                href="https://shopifree.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: colors.secondary }}
              >
                Creado con Shopifree
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ===================== WHATSAPP FLOATING BUTTON - PUNTO DE TRACKING #3 ===================== */}
      {store.whatsapp && totalItems === 0 && (
        <a
          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Vi tu catalogo ${store.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsAppClick?.()} // IMPORTANTE: Trackear click
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* ===================== CART BAR (cuando hay items) ===================== */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
          <div
            className="max-w-xl mx-auto rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4"
            style={{ backgroundColor: colors.primary }}
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex-1 flex items-center gap-3 text-white"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="font-bold">{totalItems}</span>
              </div>
              <div className="text-left">
                <p className="text-sm opacity-80">Ver carrito</p>
                <p className="font-bold">{formatPrice(totalPrice, store.currency)}</p>
              </div>
            </button>
            <button
              onClick={sendWhatsAppOrder}
              className="px-6 py-3 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#20BD5A] transition-colors"
            >
              Pedir
            </button>
          </div>
        </div>
      )}

      {/* ===================== PRODUCT MODAL ===================== */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center animate-fadeIn"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white w-full md:max-w-lg md:rounded-2xl max-h-[90vh] overflow-y-auto animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Product Image */}
            {selectedProduct.images && selectedProduct.images.length > 0 ? (
              <ProductGallery images={selectedProduct.images} productName={selectedProduct.name} />
            ) : selectedProduct.image ? (
              <div className="aspect-square bg-gray-100">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-300">
                <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Product Info */}
            <div className="p-6">
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>{selectedProduct.name}</h2>
              <p className="text-2xl font-bold mt-2" style={{ color: colors.secondary }}>
                {formatPrice(selectedProduct.price, store.currency)}
              </p>
              {selectedProduct.description && (
                <p className="mt-4 text-sm" style={{ color: colors.textMuted }}>{selectedProduct.description}</p>
              )}

              {/* Add to cart */}
              <button
                onClick={() => {
                  addItem(selectedProduct)
                  setSelectedProduct(null)
                }}
                className="w-full mt-6 py-4 rounded-xl text-white font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                Agregar al carrito
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ===================== CART DRAWER ===================== */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl animate-slideLeft"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: colors.text }}>Tu carrito ({totalItems})</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {items.map((item, index) => (
                <div key={`${item.product.id}-${index}`} className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.image && (
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" style={{ color: colors.text }}>{item.product.name}</h3>
                    <p className="text-sm font-bold" style={{ color: colors.secondary }}>
                      {formatPrice(item.itemPrice, store.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(index)}
                        className="ml-auto text-red-500 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
              <div className="flex justify-between mb-4">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold" style={{ color: colors.primary }}>
                  {formatPrice(totalPrice, store.currency)}
                </span>
              </div>
              <button
                onClick={sendWhatsAppOrder}
                className="w-full py-4 bg-[#25D366] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#20BD5A] transition-colors"
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
