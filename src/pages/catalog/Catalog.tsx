import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, analyticsService } from '../../lib/firebase'
import { getThemeComponent } from '../../themes/components'
import StoreSEO from '../../components/seo/StoreSEO'
import { getDeviceType, getReferrer } from '../../utils/deviceDetection'
import { optimizeImage } from '../../utils/cloudinary'
import type { Store, Product, Category } from '../../types'

interface CatalogProps {
  subdomainStore?: string
  customDomain?: string
  productSlug?: string
}

// Cache helpers - store logo/name in localStorage for instant display on repeat visits
function getCachedBranding(key: string): { logo?: string; name?: string } | null {
  try {
    const cached = localStorage.getItem(`store_branding_${key}`)
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

function setCachedBranding(key: string, logo?: string, name?: string) {
  try {
    localStorage.setItem(`store_branding_${key}`, JSON.stringify({ logo, name }))
  } catch { /* ignore */ }
}

// Clean loading spinner with optional store logo
function StoreLoader({ logo, name }: { logo?: string; name?: string }) {
  const tinyLogo = logo ? optimizeImage(logo, 'thumbnail') : undefined

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center w-24 h-24">
          {/* Spinner ring */}
          <svg className="absolute inset-0 w-24 h-24 animate-spin" style={{ animationDuration: '1.2s' }}>
            <circle
              cx="48" cy="48" r="44"
              fill="none" stroke="#e5e7eb" strokeWidth="3"
            />
            <circle
              cx="48" cy="48" r="44"
              fill="none" stroke="#111827" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="80 200"
            />
          </svg>

          {/* Logo or simple icon */}
          {tinyLogo ? (
            <img
              src={tinyLogo}
              alt=""
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100" />
          )}
        </div>

        {name && (
          <p className="mt-5 text-sm font-medium text-gray-800">{name}</p>
        )}
      </div>
    </div>
  )
}

export default function Catalog({ subdomainStore, customDomain, productSlug: productSlugProp }: CatalogProps) {
  const { storeSlug, productSlug: productSlugParam } = useParams<{ storeSlug: string; productSlug: string }>()
  const productSlug = productSlugProp || productSlugParam
  // Use subdomain prop if provided, otherwise use URL param
  const slug = subdomainStore || storeSlug
  const cacheKey = customDomain || slug || ''
  const cached = useRef(getCachedBranding(cacheKey)).current
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
          setCachedBranding(cacheKey, storeData.logo, storeData.name)

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
        // Fetch products and categories in parallel
        const productsRef = collection(db, 'stores', store.id, 'products')
        const productsQuery = query(productsRef, where('active', '==', true))
        const categoriesRef = collection(db, 'stores', store.id, 'categories')

        const [productsSnapshot, categoriesSnapshot] = await Promise.all([
          getDocs(productsQuery),
          getDocs(categoriesRef)
        ])

        setProducts(productsSnapshot.docs.map(doc => ({
          ...doc.data() as Product,
          id: doc.id,
          storeId: store.id
        })))
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

  // Show loader while loading - use cached branding for instant logo on repeat visits
  if (loadingStore || loadingProducts) {
    return <StoreLoader logo={store?.logo || cached?.logo} name={store?.name || cached?.name} />
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

  // Find initial product from URL slug (for /p/:productSlug routes)
  const initialProduct = productSlug
    ? products.find(p => p.slug === productSlug) || null
    : null

  return (
    <>
      <StoreSEO store={store} products={products} categories={categories} product={initialProduct} />
      <ThemeComponent
        store={store}
        products={products}
        categories={categories}
        onWhatsAppClick={handleWhatsAppClick}
        onProductView={handleProductView}
        onCartAdd={handleCartAdd}
        initialProduct={initialProduct}
      />
    </>
  )
}
