import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getThemeComponent } from '../../themes/components'
import type { Store, Product, Category } from '../../types'

interface CatalogProps {
  subdomainStore?: string
}

export default function Catalog({ subdomainStore }: CatalogProps) {
  const { storeSlug } = useParams<{ storeSlug: string }>()
  // Use subdomain prop if provided, otherwise use URL param
  const slug = subdomainStore || storeSlug
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return

      try {
        // Fetch store by subdomain
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('subdomain', '==', slug))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          const storeId = storeSnapshot.docs[0].id
          setStore({ ...storeData, id: storeId })

          // Fetch products from subcollection
          const productsRef = collection(db, 'stores', storeId, 'products')
          const productsQuery = query(
            productsRef,
            where('active', '==', true)
          )
          const productsSnapshot = await getDocs(productsQuery)
          setProducts(productsSnapshot.docs.map(doc => ({
            ...doc.data() as Product,
            id: doc.id,
            storeId
          })))

          // Fetch categories from subcollection
          const categoriesRef = collection(db, 'stores', storeId, 'categories')
          const categoriesSnapshot = await getDocs(categoriesRef)
          setCategories(
            categoriesSnapshot.docs
              .map(doc => ({
                ...doc.data() as Category,
                id: doc.id,
                storeId
              }))
              .sort((a, b) => (a.order || 0) - (b.order || 0))
          )
        }
      } catch (error) {
        console.error('Error fetching catalog:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Cargando catalogo...</p>
        </div>
      </div>
    )
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
    <ThemeComponent
      store={store}
      products={products}
      categories={categories}
    />
  )
}
