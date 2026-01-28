import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, analyticsService } from '../../lib/firebase'
import { getThemeComponent } from '../../themes/components'
import StoreSEO from '../../components/seo/StoreSEO'
import { getDeviceType, getReferrer } from '../../utils/deviceDetection'
import type { Store, Product, Category } from '../../types'

interface CatalogProps {
  subdomainStore?: string
  customDomain?: string
}

// Modern loading component with store logo
function StoreLoader({ logo, name }: { logo?: string; name?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        {/* Circular logo with animated spinner ring */}
        <div className="relative inline-flex items-center justify-center w-32 h-32">
          {/* Background ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>

          {/* Animated spinner ring */}
          <svg className="absolute inset-0 w-32 h-32 animate-spin" style={{ animationDuration: '1.5s' }}>
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="120 280"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e3a5f" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Circular logo */}
          <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden">
            {logo ? (
              <img
                src={logo}
                alt={name || 'Cargando'}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Store name or loading text */}
        <div className="mt-6">
          {name ? (
            <p className="text-lg font-semibold text-gray-800">{name}</p>
          ) : (
            <div className="h-5 w-32 bg-gray-200 rounded-full mx-auto animate-pulse"></div>
          )}
          <p className="mt-2 text-sm text-gray-500">Cargando catálogo...</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}

export default function Catalog({ subdomainStore, customDomain }: CatalogProps) {
  const { storeSlug } = useParams<{ storeSlug: string }>()
  // Use subdomain prop if provided, otherwise use URL param
  const slug = subdomainStore || storeSlug
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingStore, setLoadingStore] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const trackedRef = useRef(false)

  // Analytics callbacks - must be before any conditional returns
  const handleWhatsAppClick = useCallback(() => {
    if (store) {
      analyticsService.track(store.id, 'whatsapp_click')
    }
  }, [store])

  const handleProductView = useCallback((product: Product) => {
    if (store) {
      analyticsService.track(store.id, 'product_view', product.id, {
        productName: product.name
      })
    }
  }, [store])

  const handleCartAdd = useCallback((product: Product) => {
    if (store) {
      analyticsService.track(store.id, 'cart_add', product.id, {
        productName: product.name
      })
    }
  }, [store])

  // First: Load store data (fast - shows logo quickly)
  useEffect(() => {
    const fetchStore = async () => {
      if (!slug && !customDomain) return

      try {
        const storesRef = collection(db, 'stores')
        let storeQuery

        if (customDomain) {
          storeQuery = query(storesRef, where('customDomain', '==', customDomain))
        } else {
          storeQuery = query(storesRef, where('subdomain', '==', slug))
        }

        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          const storeId = storeSnapshot.docs[0].id
          setStore({ ...storeData, id: storeId })

          // Track page view (only once per session)
          if (!trackedRef.current) {
            trackedRef.current = true
            analyticsService.track(storeId, 'page_view', undefined, {
              deviceType: getDeviceType(),
              referrer: getReferrer()
            })
          }
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoadingStore(false)
      }
    }

    fetchStore()
  }, [slug, customDomain])

  // Second: Load products and categories (after store is loaded)
  useEffect(() => {
    const fetchProducts = async () => {
      if (!store) return

      try {
        // Fetch products from subcollection
        const productsRef = collection(db, 'stores', store.id, 'products')
        const productsQuery = query(
          productsRef,
          where('active', '==', true)
        )
        const productsSnapshot = await getDocs(productsQuery)
        setProducts(productsSnapshot.docs.map(doc => ({
          ...doc.data() as Product,
          id: doc.id,
          storeId: store.id
        })))

        // Fetch categories from subcollection
        const categoriesRef = collection(db, 'stores', store.id, 'categories')
        const categoriesSnapshot = await getDocs(categoriesRef)
        setCategories(
          categoriesSnapshot.docs
            .map(doc => ({
              ...doc.data() as Category,
              id: doc.id,
              storeId: store.id
            }))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        )
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [store])

  // Show loader while loading store or products
  if (loadingStore || loadingProducts) {
    return <StoreLoader logo={store?.logo} name={store?.name} />
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Catalogo no encontrado</h1>
          <p className="text-gray-600 mb-6">Este catalogo no existe o ha sido eliminado.</p>
          <a
            href="https://shopifree.app"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Crea tu propio catalogo en <span className="font-semibold">Shopifree</span>
          </a>
        </div>
      </div>
    )
  }

  // Get the theme component based on store's themeId
  const ThemeComponent = getThemeComponent(store.themeId || 'minimal')

  return (
    <>
      <StoreSEO store={store} products={products} categories={categories} />
      <ThemeComponent
        store={store}
        products={products}
        categories={categories}
        onWhatsAppClick={handleWhatsAppClick}
        onProductView={handleProductView}
        onCartAdd={handleCartAdd}
      />
    </>
  )
}
