import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { apiUrl } from '../../utils/apiBase'
import { getCurrencySymbol } from '../../lib/currency'
import { useLanguage } from '../../hooks/useLanguage'
import type { Category } from '../../types'

// Fallback rates in case API fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, MXN: 17.5, COP: 4200, PEN: 3.75, ARS: 900,
  CLP: 950, BRL: 5.1, VES: 36.5, UYU: 39, BOB: 6.9, PYG: 7300,
  GTQ: 7.8, HNL: 24.7, NIO: 36.7, CRC: 510, PAB: 1, DOP: 58,
}

async function getExchangeRates(): Promise<Record<string, number>> {
  const CACHE_KEY = 'cj_exchange_rates'
  const CACHE_TTL = 24 * 60 * 60 * 1000
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) return rates
    }
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    if (data.result === 'success' && data.rates) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, timestamp: Date.now() }))
      return data.rates
    }
  } catch { /* fall through */ }
  return FALLBACK_RATES
}

interface CJProduct {
  pid: string
  name: string
  image: string
  sellPrice: number
  categoryName?: string
}

interface CJVariant {
  vid: string
  name: string
  image: string
  sellPrice: number
  sku: string
  variantKey: string
  weight?: number
}

interface CJProductDetail {
  pid: string
  sku: string
  name: string
  description: string
  image: string
  images: string[]
  sellPrice: number
  suggestSellPrice?: string
  weight?: number
  categoryName?: string
  materials?: string[]
  variants: CJVariant[]
  variantKeyNames: string[]
}

export default function Dropshipping() {
  const { store } = useAuth()
  const { showToast } = useToast()
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const currency = store?.currency || 'USD'
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)

  useEffect(() => { getExchangeRates().then(setRates) }, [])

  const rate = rates[currency] || FALLBACK_RATES[currency] || 1

  // Search state
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<CJProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Quick browse categories (search by keyword)
  const BROWSE_CATEGORIES = [
    { label: 'Ropa', keyword: 'clothing' },
    { label: 'Electronica', keyword: 'electronics' },
    { label: 'Accesorios', keyword: 'accessories' },
    { label: 'Hogar', keyword: 'home decor' },
    { label: 'Belleza', keyword: 'beauty' },
    { label: 'Deportes', keyword: 'sports' },
    { label: 'Juguetes', keyword: 'toys' },
    { label: 'Mascotas', keyword: 'pets' },
    { label: 'Cocina', keyword: 'kitchen' },
    { label: 'Herramientas', keyword: 'tools' },
    { label: 'Bolsos', keyword: 'bags' },
    { label: 'Relojes', keyword: 'watches' },
  ]
  const [activeCategory, setActiveCategory] = useState<string>('')

  // Featured products
  const [featured, setFeatured] = useState<CJProduct[]>([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)

  // Detail state
  const [selectedProduct, setSelectedProduct] = useState<CJProductDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Import state
  const [importName, setImportName] = useState('')
  const [importPrice, setImportPrice] = useState('')
  const [importing, setImporting] = useState(false)

  // Freight estimation state
  const [freightOptions, setFreightOptions] = useState<{ carrier: string; days: string; costUSD: number }[]>([])
  const [freightLoading, setFreightLoading] = useState(false)

  // Store categories for import
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const hasCJKey = !!store?.integrations?.cjApiKey

  const cjPost = useCallback(async (body: Record<string, any>) => {
    const res = await fetch(apiUrl('/api/cj'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, storeId: store?.id })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data
  }, [store?.id])

  // Load featured products + categories on mount
  useEffect(() => {
    if (!store?.id) return

    // Load featured products — fetch from several popular niches and mix them
    const featuredKeywords = ['trending gadgets', 'fashion women', 'phone accessories', 'home organization', 'jewelry minimalist', 'fitness']
    Promise.allSettled(
      featuredKeywords.map(kw =>
        cjPost({ action: 'search', keyword: kw, page: 1, pageSize: 6 })
      )
    ).then(results => {
      const all: CJProduct[] = []
      const seen = new Set<string>()
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.products) {
          for (const p of r.value.products) {
            if (!seen.has(p.pid)) {
              seen.add(p.pid)
              all.push(p)
            }
          }
        }
      }
      setFeatured(all)
    }).finally(() => setLoadingFeatured(false))

    // Load store categories
    categoryService.getAll(store.id).then(cats => setCategories(cats.filter(c => c.active)))
  }, [store?.id, cjPost])

  const search = async (newPage = 1, keywordOverride?: string) => {
    const searchKeyword = keywordOverride ?? keyword.trim()
    if (!searchKeyword) return
    setSearching(true)
    try {
      const data = await cjPost({ action: 'search', keyword: searchKeyword, page: newPage, pageSize: 20 })
      if (data.products) {
        setResults(data.products)
        setTotal(data.total || 0)
        setPage(newPage)
      }
    } catch (err: any) {
      showToast(err.message || 'Error buscando productos', 'error')
    } finally {
      setSearching(false)
    }
  }

  const browseCategory = (cat: typeof BROWSE_CATEGORIES[0]) => {
    if (activeCategory === cat.keyword) {
      setActiveCategory('')
      setResults([])
      setTotal(0)
      return
    }
    setActiveCategory(cat.keyword)
    setKeyword('')
    search(1, cat.keyword)
  }

  const viewDetail = async (pid: string) => {
    setLoadingDetail(true)
    setFreightOptions([])
    try {
      const data = await cjPost({ action: 'details', pid })
      if (data.pid) {
        setSelectedProduct(data)
        setImportName(data.name)
        const localCost = data.sellPrice * rate
        const suggestedPrice = Math.ceil(localCost * 2.5)
        setImportPrice(String(suggestedPrice))

        const countryCode = store?.location?.country
        if (countryCode) {
          const variants = data.variants || []
          let vid: string | undefined
          if (variants.length > 0) {
            const sorted = [...variants].sort((a: CJVariant, b: CJVariant) => (b.weight || 0) - (a.weight || 0))
            vid = sorted[0].vid
          }
          setFreightLoading(true)
          cjPost({ action: 'freight', vid: vid || data.pid, countryCode })
            .then(freight => { if (freight.options) setFreightOptions(freight.options) })
            .catch(() => {})
            .finally(() => setFreightLoading(false))
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error cargando producto', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const buildVariations = (product: CJProductDetail) => {
    if (!product.variants.length || !product.variantKeyNames.length) return undefined
    const groups: Record<string, Set<string>> = {}
    const imagesByValue: Record<string, string> = {}
    for (const name of product.variantKeyNames) groups[name] = new Set()
    for (const v of product.variants) {
      const parts = v.variantKey.split('-').map(s => s.trim())
      product.variantKeyNames.forEach((name, i) => {
        if (parts[i]) {
          groups[name].add(parts[i])
          if (i === 0 && v.image) imagesByValue[parts[i]] = v.image
        }
      })
    }
    return product.variantKeyNames
      .filter(name => groups[name]?.size > 0)
      .map(name => ({
        id: `var-${Math.random().toString(36).substring(2, 9)}`,
        name,
        options: Array.from(groups[name]).map(value => ({
          id: `opt-${Math.random().toString(36).substring(2, 9)}`,
          value,
          image: imagesByValue[value] || undefined,
          available: true,
        }))
      }))
  }

  const importProduct = async () => {
    if (!store || !selectedProduct || !importName.trim() || !importPrice) return
    setImporting(true)
    try {
      const slug = importName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const variations = buildVariations(selectedProduct)
      const productData: Record<string, unknown> = {
        name: importName.trim(),
        slug,
        price: parseFloat(importPrice),
        image: selectedProduct.image,
        images: selectedProduct.images?.slice(0, 10) || [],
        description: selectedProduct.description || '',
        active: true,
        cjProductId: selectedProduct.pid,
        sku: selectedProduct.sku || undefined,
        weight: selectedProduct.weight || undefined,
        categoryId: selectedCategoryId || null,
      }
      if (variations && variations.length > 0) {
        productData.hasVariations = true
        productData.variations = variations
      }
      await productService.create(store.id, productData as any)
      showToast('Producto importado con variantes', 'success')
      setSelectedProduct(null)
    } catch (err) {
      console.error('Error importing:', err)
      showToast('Error importando producto', 'error')
    } finally {
      setImporting(false)
    }
  }

  const goBack = () => {
    setSelectedProduct(null)
    setImportName('')
    setImportPrice('')
    setFreightOptions([])
    setSelectedCategoryId('')
  }

  const totalPages = Math.ceil(total / 20)
  const hasSearchResults = results.length > 0
  const showingProducts = hasSearchResults ? results : featured
  const showingLabel = hasSearchResults ? `${total} productos encontrados` : 'Productos destacados'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {selectedProduct && (
            <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedProduct ? 'Importar producto' : 'Dropshipping'}
            </h1>
            <p className="text-sm text-gray-400">
              {selectedProduct ? 'Ajusta nombre y precio antes de importar' : 'Explora y agrega productos de CJ Dropshipping'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(localePath('/dashboard/products'))}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Mis productos
        </button>
      </div>

      {selectedProduct ? (
        /* === DETAIL / IMPORT VIEW === */
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Product preview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex gap-5">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-40 h-40 object-cover rounded-xl ring-1 ring-black/5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{selectedProduct.name}</h2>
                <p className="text-xs text-gray-400 mb-1">Precio CJ (costo)</p>
                <p className="text-xl font-bold text-red-600">
                  ${selectedProduct.sellPrice} USD
                  {currency !== 'USD' && (
                    <span className="text-sm font-medium text-gray-400 ml-2">
                      ({getCurrencySymbol(currency)}{Math.ceil(selectedProduct.sellPrice * rate)} {currency})
                    </span>
                  )}
                </p>
                {selectedProduct.images.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {selectedProduct.images.slice(0, 6).map((img, i) => (
                      <img key={i} src={img} alt="" className="w-14 h-14 object-cover rounded-lg ring-1 ring-black/5 shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit fields */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del producto</label>
              <input
                type="text"
                value={importName}
                onChange={e => setImportName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Precio de venta ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={importPrice}
                onChange={e => setImportPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
              {importPrice && selectedProduct.sellPrice && (() => {
                const costInLocal = selectedProduct.sellPrice * rate
                const profit = parseFloat(importPrice) - costInLocal
                return (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Ganancia estimada: <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {getCurrencySymbol(currency)}{profit.toFixed(2)} {currency}
                    </span>
                    {' '}por venta
                  </p>
                )
              })()}
            </div>
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm bg-white"
                >
                  <option value="">Sin categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="flex flex-wrap gap-3 text-xs">
            {selectedProduct.sku && (
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">SKU: {selectedProduct.sku}</span>
            )}
            {selectedProduct.weight && selectedProduct.weight > 0 && (
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">Peso: {selectedProduct.weight}g</span>
            )}
            {selectedProduct.materials && selectedProduct.materials.length > 0 && (
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">Material: {selectedProduct.materials.join(', ')}</span>
            )}
          </div>

          {/* CJ Shipping estimation */}
          {(freightLoading || freightOptions.length > 0) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Envio CJ a {store?.location?.country || '?'}
              </p>
              {freightLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-xs text-blue-600">Calculando envio...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {freightOptions.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 text-xs">
                        <span className="font-medium text-gray-700">{opt.carrier}</span>
                        <span className="text-gray-400">{opt.days}</span>
                        <span className="font-bold text-blue-700">
                          ${opt.costUSD.toFixed(2)} USD
                          {currency !== 'USD' && (
                            <span className="font-normal text-gray-400 ml-1">
                              ({getCurrencySymbol(currency)}{Math.ceil(opt.costUSD * rate)})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Incluye este costo en tu precio de envio al cliente
                    {selectedProduct.variants.length > 1 && (
                      <span className="block text-blue-400 mt-0.5">
                        Estimado para la variante mas pesada — puede variar
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Variants */}
          {selectedProduct.variants.length > 0 && selectedProduct.variantKeyNames.length > 0 && (() => {
            const groups: Record<string, Set<string>> = {}
            for (const name of selectedProduct.variantKeyNames) groups[name] = new Set()
            for (const v of selectedProduct.variants) {
              const parts = v.variantKey.split('-').map(s => s.trim())
              selectedProduct.variantKeyNames.forEach((name, i) => {
                if (parts[i]) groups[name].add(parts[i])
              })
            }
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                {selectedProduct.variantKeyNames.map(name => (
                  groups[name].size > 0 && (
                    <div key={name}>
                      <p className="text-sm font-medium text-gray-700 mb-1.5">{name} ({groups[name].size})</p>
                      <div className="flex gap-2 flex-wrap">
                        {Array.from(groups[name]).map(val => (
                          <span key={val} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{val}</span>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                <p className="text-xs text-gray-400">{selectedProduct.variants.length} combinaciones totales</p>
              </div>
            )
          })()}

          {/* Description */}
          {selectedProduct.description && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-sm font-medium text-gray-700 mb-1.5">Descripcion</p>
              <div
                className="text-xs text-gray-500 max-h-48 overflow-y-auto prose prose-xs"
                dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
              />
            </div>
          )}

          {/* Import button */}
          {hasCJKey ? (
            <button
              onClick={importProduct}
              disabled={importing || !importName.trim() || !importPrice}
              className="w-full py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl font-semibold hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : 'Importar a mi tienda'}
            </button>
          ) : (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-orange-800 font-medium">
                Para importar este producto, conecta tu cuenta de CJ Dropshipping.
              </p>
              <p className="text-xs text-orange-600">
                Registrate gratis en cjdropshipping.com, obtiene tu API Key y pegala en la pagina de Integraciones.
              </p>
              <div className="flex gap-2">
                <a
                  href="https://cjdropshipping.com/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all"
                >
                  Crear cuenta CJ (gratis)
                </a>
                <button
                  onClick={() => navigate(localePath('/dashboard/integrations'))}
                  className="flex-1 py-2.5 bg-white border border-orange-200 text-orange-700 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-all"
                >
                  Ir a Integraciones
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* === BROWSE VIEW === */
        <div className="space-y-5">
          {/* Search bar */}
          <form onSubmit={e => { e.preventDefault(); setActiveCategory(''); search() }} className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={e => { setKeyword(e.target.value); if (activeCategory) setActiveCategory('') }}
              placeholder="Buscar productos (ej: camiseta, reloj, funda)..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={searching || !keyword.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl font-semibold hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all disabled:opacity-50 text-sm"
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </form>

          {/* Browse categories */}
          <div className="flex gap-2 flex-wrap">
            {BROWSE_CATEGORIES.map(cat => (
              <button
                key={cat.keyword}
                onClick={() => browseCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.keyword
                    ? 'bg-[#1e3a5f] text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Products grid */}
          {searching || loadingFeatured ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5]"></div>
            </div>
          ) : showingProducts.length > 0 ? (
            <>
              <p className="text-sm text-gray-400">{showingLabel}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {showingProducts.map(product => (
                  <button
                    key={product.pid}
                    onClick={() => viewDetail(product.pid)}
                    className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all text-left group"
                  >
                    <div className="aspect-square bg-gray-50">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-tight">
                        {product.name}
                      </p>
                      <p className="text-sm font-bold text-[#1e3a5f] mt-1">
                        ${product.sellPrice} USD
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination (only for search results) */}
              {hasSearchResults && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => search(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                  <button
                    onClick={() => search(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          ) : (keyword || activeCategory) ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No se encontraron productos</p>
            </div>
          ) : null}

          {/* Loading detail overlay */}
          {loadingDetail && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2d6cb5]"></div>
                <span className="text-sm text-gray-600">Cargando producto...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
