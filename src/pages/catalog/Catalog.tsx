import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, analyticsService } from '../../lib/firebase'
import { getThemeComponent } from '../../themes/components'
import StoreSEO from '../../components/seo/StoreSEO'
import { getDeviceType, getReferrer } from '../../utils/deviceDetection'
import { optimizeImage } from '../../utils/cloudinary'
import type { Store, Product, Category } from '../../types'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { Capacitor } from '@capacitor/core'
import { getPlanLimits, type PlanType } from '../../lib/stripe'

interface CatalogProps {
  subdomainStore?: string
  customDomain?: string
  productSlug?: string
}

// Cache helpers - store data in localStorage for faster subsequent loads
function getCachedStore(key: string): { id?: string; logo?: string; name?: string } | null {
  try {
    const cached = localStorage.getItem(`store_cache_${key}`)
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

function setCachedStore(key: string, id: string, logo?: string, name?: string) {
  try {
    localStorage.setItem(`store_cache_${key}`, JSON.stringify({ id, logo, name }))
  } catch { /* ignore */ }
}

// Simple loader for web (native uses splash screen)
function StoreLoader({ logo, name }: { logo?: string; name?: string }) {
  const optimizedLogo = logo ? optimizeImage(logo, 'thumbnail') : undefined

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <div className="text-center">
        {optimizedLogo ? (
          <img src={optimizedLogo} alt="" className="w-24 h-24 rounded-[22%] object-cover mx-auto" />
        ) : (
          <div className="w-24 h-24 rounded-[22%] bg-white/10 mx-auto" />
        )}
        {name && <p className="mt-5 text-base font-semibold text-white tracking-wide">{name}</p>}
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
  const cached = useRef(getCachedStore(cacheKey)).current
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const trackedRef = useRef(false)

  // Register push notifications on native app
  usePushNotifications(store?.id)

  // Sync status bar + navigation bar colors with theme header on native apps
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !store) return

    // Wait for theme to render, then read the header's background color
    const timer = setTimeout(() => {
      const header = document.querySelector('header')
      if (!header) return

      const bg = getComputedStyle(header).backgroundColor
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (match) {
          const [r, g, b] = [match[1], match[2], match[3]]
          const hex = '#' + [r, g, b].map(c => parseInt(c).toString(16).padStart(2, '0')).join('')
          const isDark = (parseInt(r) * 299 + parseInt(g) * 587 + parseInt(b) * 114) / 1000 < 128

          import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
            StatusBar.setBackgroundColor({ color: hex })
            StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
          }).catch(() => {})
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [store, loading])

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

  // Load all data in one effect - optimized for speed
  useEffect(() => {
    const loadAll = async () => {
      if (!slug && !customDomain) return

      try {
        // Step 1: Get store
        const storesRef = collection(db, 'stores')
        const storeQuery = customDomain
          ? query(storesRef, where('customDomain', '==', customDomain))
          : query(storesRef, where('subdomain', '==', slug))

        const storeSnapshot = await getDocs(storeQuery)
        if (storeSnapshot.empty) {
          setLoading(false)
          return
        }

        const storeData = storeSnapshot.docs[0].data() as Store
        const storeId = storeSnapshot.docs[0].id
        const fullStore = { ...storeData, id: storeId }
        setStore(fullStore)
        setCachedStore(cacheKey, storeId, storeData.logo, storeData.name)

        // Step 2: Get products + categories in parallel
        const [productsSnapshot, categoriesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'stores', storeId, 'products'), where('active', '==', true))),
          getDocs(collection(db, 'stores', storeId, 'categories'))
        ])

        // Get all products then limit based on plan
        const allProducts = productsSnapshot.docs.map(doc => ({
          ...doc.data() as Product,
          id: doc.id,
          storeId
        }))

        // Apply plan limit - only show products up to plan limit
        const planLimits = getPlanLimits((storeData.plan || 'free') as PlanType)
        const productLimit = planLimits.products
        const limitedProducts = productLimit === -1
          ? allProducts
          : allProducts.slice(0, productLimit)

        setProducts(limitedProducts)
        setCategories(
          categoriesSnapshot.docs
            .map(doc => ({ ...doc.data() as Category, id: doc.id, storeId }))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        )

        // Track page view (async, don't block)
        if (!trackedRef.current) {
          trackedRef.current = true
          analyticsService.track(storeId, 'page_view', undefined, {
            deviceType: getDeviceType(),
            referrer: getReferrer()
          })
        }
      } catch (error) {
        console.error('Error loading store:', error)
      } finally {
        setLoading(false)
        if (Capacitor.isNativePlatform()) {
          import('@capacitor/splash-screen').then(({ SplashScreen }) => {
            SplashScreen.hide({ fadeOutDuration: 300 })
          }).catch(() => {})
        }
      }
    }

    loadAll()
  }, [slug, customDomain, cacheKey])

  // Store not found
  if (!store && !loading) {
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

  // Loading state
  if (loading || !store) {
    // Native: empty div (splash covers everything)
    // Web: show loader
    return Capacitor.isNativePlatform()
      ? <div style={{ background: '#000' }} />
      : <StoreLoader logo={cached?.logo} name={cached?.name} />
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
