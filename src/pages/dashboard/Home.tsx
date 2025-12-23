import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import type { Store, Product } from '../../types'

export default function DashboardHome() {
  const { user } = useAuth()
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch store
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('userId', '==', user.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          setStore({ ...storeData, id: storeSnapshot.docs[0].id })

          // Fetch products
          const productsRef = collection(db, 'products')
          const productsQuery = query(productsRef, where('storeId', '==', storeSnapshot.docs[0].id))
          const productsSnapshot = await getDocs(productsQuery)

          setProducts(productsSnapshot.docs.map(doc => ({
            ...doc.data() as Product,
            id: doc.id
          })))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const catalogUrl = store ? `${window.location.origin}/c/${store.subdomain}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(catalogUrl)
    alert('Link copiado!')
  }

  const shareWhatsApp = () => {
    const text = `Mira mi catálogo: ${catalogUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Catálogo</h1>
        <p className="text-gray-600 mt-1">
          Bienvenido, {store?.name || 'tu tienda'}
        </p>
      </div>

      {/* Quick share */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Tu link:</h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-900">
            {catalogUrl}
          </code>
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            Copiar
          </button>
          <button
            onClick={shareWhatsApp}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-3xl font-bold text-gray-900">{products.length}</p>
          <p className="text-gray-600 text-sm mt-1">Productos</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="text-gray-600 text-sm mt-1">Visitas esta semana</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="text-gray-600 text-sm mt-1">Clicks en WhatsApp</p>
        </div>
      </div>

      {/* Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Tus Productos ({products.length})
          </h2>
          <Link
            to="/dashboard/products/new"
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
          >
            + Agregar producto
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes productos aún
            </h3>
            <p className="text-gray-600 mb-6">
              Agrega tu primer producto para empezar a vender
            </p>
            <Link
              to="/dashboard/products/new"
              className="inline-flex px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium"
            >
              Agregar mi primer producto
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/dashboard/products/${product.id}`}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition group"
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
                  <h3 className="font-medium text-gray-900 truncate group-hover:text-black">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {store?.currency} {product.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">¿Quieres más funciones?</h3>
            <p className="text-gray-300 mt-1">
              Productos ilimitados, múltiples fotos, categorías, cupones y más
            </p>
          </div>
          <Link
            to="/dashboard/settings#plans"
            className="px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Ver planes
          </Link>
        </div>
      </div>
    </div>
  )
}
