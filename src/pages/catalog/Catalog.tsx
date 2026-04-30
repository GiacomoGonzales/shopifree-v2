import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, analyticsService } from '../../lib/firebase'
import { getThemeComponent } from '../../themes/components'
import StoreSEO from '../../components/seo/StoreSEO'
import { getDeviceType, getReferrer } from '../../utils/deviceDetection'
import type { Store, Product, Category } from '../../types'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { Capacitor } from '@capacitor/core'
import { getPlanLimits, getEffectivePlan } from '../../lib/stripe'

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
function StoreLoader({ name }: { logo?: string; name?: string }) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div
        className="w-8 h-8 rounded-full border-[2.5px] border-gray-200 border-t-gray-900 animate-spin"
        aria-label="Cargando"
      />
      {name && (
        <p className="mt-5 text-[13px] font-medium text-gray-500 tracking-wide">
          {name}
        </p>
      )}
    </div>
  )
}

// Mirrors the iOS LaunchScreen / Android splash drawable inside React. We use
// `position: fixed; inset: 0` (covers the full viewport including the safe
// area) and center the logo at viewport center — same geometry as the
// storyboard's scaleAspectFill. While this overlay is mounted, the native
// splash can hide instantly: the user sees identical pixels underneath, so
// there is no visible "splash → app" jump. We then fade the overlay once the
// theme has actually painted, so the only thing the user perceives is the
// logo gracefully disappearing into the catalog.
const SPLASH_COLOR = (import.meta.env.VITE_SPLASH_COLOR as string) || '#ffffff'
const SPLASH_LOGO_URL = (import.meta.env.VITE_STORE_LOGO_URL as string) || ''

function NativeSplashOverlay({
  logo,
  fading,
  onDone,
}: {
  logo?: string
  fading: boolean
  onDone: () => void
}) {
  return (
    <div
      onTransitionEnd={(e) => {
        if (e.propertyName === 'opacity' && fading) onDone()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: SPLASH_COLOR,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        opacity: fading ? 0 : 1,
        transition: 'opacity 500ms ease-out',
        pointerEvents: 'none',
      }}
    >
      {logo && (
        <img
          src={logo}
          alt=""
          style={{
            width: '32%',
            maxWidth: 240,
            objectFit: 'contain',
          }}
        />
      )}
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

        // Trial expiration is enforced server-side by the scheduled
        // `expireTrials` Cloud Function (functions/src/index.ts). This catalog
        // read path no longer mutates the store plan — the previous check
        // ignored admin-set `planExpiresAt` and silently downgraded comped
        // stores on every catalog load. Gate UI features through
        // `getEffectivePlan()` instead.

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

        // Apply plan limits - use effective plan (considers subscription status)
        const effectivePlan = getEffectivePlan(storeData)
        const planLimits = getPlanLimits(effectivePlan)

        // Limit products count
        const productLimit = planLimits.products
        const limitedProducts = productLimit === -1
          ? allProducts
          : allProducts.slice(0, productLimit)

        // Limit images per product
        const maxImages = planLimits.imagesPerProduct
        const productsWithLimitedImages = limitedProducts.map(product => ({
          ...product,
          images: product.images?.slice(0, maxImages),
          // Keep first image as main image (for backward compatibility)
          image: product.images?.[0] || product.image
        }))

        // Apply catalog settings: optionally hide out-of-stock products.
        // Default = show them (with the "Agotado" badge on the card).
        const showOutOfStock = storeData.catalogSettings?.showOutOfStock !== false
        const visibleProducts = showOutOfStock
          ? productsWithLimitedImages
          : productsWithLimitedImages.filter(p => {
              if (!p.trackStock) return true
              const stock = typeof p.stock === 'number' ? p.stock : 0
              return stock > 0
            })

        setProducts(visibleProducts)

        // Limit categories
        const categoryLimit = planLimits.categories
        const allCategories = categoriesSnapshot.docs
          .map(doc => ({ ...doc.data() as Category, id: doc.id, storeId }))
          .sort((a, b) => (a.order || 0) - (b.order || 0))
        const limitedCategories = categoryLimit === -1
          ? allCategories
          : allCategories.slice(0, categoryLimit)

        setCategories(limitedCategories)

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
      }
    }

    loadAll()
  }, [slug, customDomain, cacheKey])

  // React-side splash overlay state. The flow is:
  //   1. Mount overlay immediately on native (matches the LaunchScreen pixels).
  //   2. As soon as the React tree paints, hide the native splash with a short
  //      crossfade — the overlay covers any seam, so the user sees no jump.
  //   3. Once the theme has rendered, start the overlay fade-out.
  //   4. transitionend → unmount the overlay; catalog is now fully visible.
  const [splashFading, setSplashFading] = useState(false)
  const [splashGone, setSplashGone] = useState(!Capacitor.isNativePlatform())
  const splashLogo = SPLASH_LOGO_URL || cached?.logo || store?.logo

  // Hide the native iOS/Android splash as soon as our React overlay has
  // painted at least one frame — anything earlier risks a black webview gap.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        import('@capacitor/splash-screen').then(({ SplashScreen }) => {
          SplashScreen.hide({ fadeOutDuration: 200 })
        }).catch(() => {})
      })
    })
    return () => { cancelled = true }
  }, [])

  // Fade the React overlay only after the theme has actually committed —
  // otherwise the user sees the overlay disappear into an unpainted webview.
  useEffect(() => {
    if (loading || !store || !Capacitor.isNativePlatform() || splashGone) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSplashFading(true))
    })
  }, [loading, store, splashGone])

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

  // Loading state on web. Native loading is covered by the splash overlay
  // rendered below.
  if ((loading || !store) && !Capacitor.isNativePlatform()) {
    return <StoreLoader logo={cached?.logo} name={cached?.name} />
  }

  // Get the theme component (only when store is ready). The splash overlay is
  // rendered alongside so it can fade out smoothly once the theme paints.
  const ThemeComponent = store ? getThemeComponent(store.themeId || 'minimal') : null

  // Find initial product from URL slug (for /p/:productSlug routes)
  const initialProduct = productSlug
    ? products.find(p => p.slug === productSlug) || null
    : null

  return (
    <>
      {store && ThemeComponent && (
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
      )}
      {!splashGone && Capacitor.isNativePlatform() && (
        <NativeSplashOverlay
          key="native-splash"
          logo={splashLogo}
          fading={splashFading}
          onDone={() => setSplashGone(true)}
        />
      )}
    </>
  )
}
