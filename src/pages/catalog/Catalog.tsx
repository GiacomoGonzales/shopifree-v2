import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Store, Product, Category } from '../../types'

interface CartItem {
  product: Product
  quantity: number
}

export default function Catalog() {
  const { storeSlug } = useParams<{ storeSlug: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!storeSlug) return

      try {
        // Fetch store by subdomain
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('subdomain', '==', storeSlug))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          const storeId = storeSnapshot.docs[0].id
          setStore({ ...storeData, id: storeId })

          // Fetch products
          const productsRef = collection(db, 'products')
          const productsQuery = query(
            productsRef,
            where('storeId', '==', storeId),
            where('active', '==', true)
          )
          const productsSnapshot = await getDocs(productsQuery)
          setProducts(productsSnapshot.docs.map(doc => ({
            ...doc.data() as Product,
            id: doc.id
          })))

          // Fetch categories
          const categoriesRef = collection(db, 'categories')
          const categoriesQuery = query(categoriesRef, where('storeId', '==', storeId))
          const categoriesSnapshot = await getDocs(categoriesQuery)
          setCategories(categoriesSnapshot.docs.map(doc => ({
            ...doc.data() as Category,
            id: doc.id
          })))
        }
      } catch (error) {
        console.error('Error fetching catalog:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [storeSlug])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId)
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      return prev.filter(item => item.product.id !== productId)
    })
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }

  const sendWhatsApp = () => {
    if (!store || cart.length === 0) return

    const items = cart.map(item =>
      `${item.product.name} - ${store.currency} ${item.product.price.toFixed(2)} x${item.quantity}`
    ).join('\n')

    const total = getCartTotal().toFixed(2)

    const message = `Hola! Quiero hacer un pedido:\n\n${items}\n\nTotal: ${store.currency} ${total}`

    const whatsappUrl = `https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Catálogo no encontrado</h1>
          <p className="text-gray-600">Este catálogo no existe o ha sido eliminado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
              {store.description && (
                <p className="text-sm text-gray-600 mt-0.5">{store.description}</p>
              )}
            </div>
            <a
              href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-200 sticky top-[73px] z-30">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-2 py-3 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  !selectedCategory
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    selectedCategory === category.id
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product.id === product.id)
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition"
                >
                  <div className="aspect-square bg-gray-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-gray-600 text-sm mt-0.5">
                      {store.currency} {product.price.toFixed(2)}
                    </p>

                    {cartItem ? (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition"
                        >
                          -
                        </button>
                        <span className="font-medium">{cartItem.quantity}</span>
                        <button
                          onClick={() => addToCart(product)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full mt-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
                      >
                        + Agregar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Cart footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} producto(s)
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {store.currency} {getCartTotal().toFixed(2)}
                </p>
              </div>
              <button
                onClick={sendWhatsApp}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar pedido por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopifree branding (only for free plans) */}
      {store.plan !== 'premium' && (
        <div className="py-4 text-center text-sm text-gray-500">
          <a
            href="https://shopifree.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 transition"
          >
            Creado con Shopifree
          </a>
        </div>
      )}
    </div>
  )
}
