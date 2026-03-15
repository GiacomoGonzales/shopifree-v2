import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { productService } from '../../lib/firebase'
import { useToast } from '../ui/Toast'
import { apiUrl } from '../../utils/apiBase'
import { getCurrencySymbol } from '../../lib/currency'

// Fallback rates in case API fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, MXN: 17.5, COP: 4200, PEN: 3.75, ARS: 900,
  CLP: 950, BRL: 5.1, VES: 36.5, UYU: 39, BOB: 6.9, PYG: 7300,
  GTQ: 7.8, HNL: 24.7, NIO: 36.7, CRC: 510, PAB: 1, DOP: 58,
}

// Fetch and cache exchange rates (cached 24h in localStorage)
async function getExchangeRates(): Promise<Record<string, number>> {
  const CACHE_KEY = 'cj_exchange_rates'
  const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

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

interface Props {
  show: boolean
  onClose: () => void
  onImported: () => void
  currency: string
}

export default function CJProductImport({ show, onClose, onImported, currency }: Props) {
  const { store } = useAuth()
  const { showToast } = useToast()
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)

  useEffect(() => {
    getExchangeRates().then(setRates)
  }, [])

  const rate = rates[currency] || FALLBACK_RATES[currency] || 1

  // Search state
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<CJProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

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

  if (!show) return null

  const hasCJKey = !!store?.integrations?.cjApiKey

  const cjPost = async (body: Record<string, any>) => {
    const res = await fetch(apiUrl('/api/cj'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, storeId: store?.id })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data
  }

  const search = async (newPage = 1) => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const data = await cjPost({ action: 'search', keyword: keyword.trim(), page: newPage, pageSize: 20 })
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

  const viewDetail = async (pid: string) => {
    setLoadingDetail(true)
    setFreightOptions([])
    try {
      const data = await cjPost({ action: 'details', pid })
      if (data.pid) {
        setSelectedProduct(data)
        setImportName(data.name)
        // Convert USD cost to local currency and suggest 2.5x markup
        const localCost = data.sellPrice * rate
        const suggestedPrice = Math.ceil(localCost * 2.5)
        setImportPrice(String(suggestedPrice))

        // Fetch freight estimation — use heaviest variant for worst-case estimate, or pid as fallback
        const countryCode = store?.location?.country
        if (countryCode) {
          const variants = data.variants || []
          let vid: string | undefined
          if (variants.length > 0) {
            // Pick the heaviest variant for a worst-case shipping estimate
            const sorted = [...variants].sort((a: CJVariant, b: CJVariant) => (b.weight || 0) - (a.weight || 0))
            vid = sorted[0].vid
          }
          setFreightLoading(true)
          cjPost({ action: 'freight', vid: vid || data.pid, countryCode })
            .then(freight => {
              if (freight.options) setFreightOptions(freight.options)
            })
            .catch(() => { /* silent - freight is informational */ })
            .finally(() => setFreightLoading(false))
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error cargando producto', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  // Build Shopifree variations from CJ variant data
  const buildVariations = (product: CJProductDetail) => {
    if (!product.variants.length || !product.variantKeyNames.length) return undefined

    // Group variant values by attribute name
    // e.g. variantKey "Cherry wood-IPhone11" + variantKeyNames ["Color","Style"]
    // → Color: ["Cherry wood"], Style: ["IPhone11"]
    const groups: Record<string, Set<string>> = {}
    const imagesByValue: Record<string, string> = {}

    for (const name of product.variantKeyNames) {
      groups[name] = new Set()
    }

    for (const v of product.variants) {
      const parts = v.variantKey.split('-').map(s => s.trim())
      product.variantKeyNames.forEach((name, i) => {
        if (parts[i]) {
          groups[name].add(parts[i])
          // Save image for first attribute (usually color)
          if (i === 0 && v.image) {
            imagesByValue[parts[i]] = v.image
          }
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
      }

      if (variations && variations.length > 0) {
        productData.hasVariations = true
        productData.variations = variations
      }

      await productService.create(store.id, productData as any)

      showToast('Producto importado con variantes', 'success')
      setSelectedProduct(null)
      onImported()
      onClose()
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
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {selectedProduct && (
              <button onClick={goBack} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {selectedProduct ? 'Importar producto' : 'CJ Dropshipping'}
              </h2>
              <p className="text-sm text-gray-400">
                {selectedProduct ? 'Ajusta nombre y precio antes de importar' : 'Busca productos para tu tienda'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {selectedProduct ? (
            /* === DETAIL / IMPORT VIEW === */
            <div className="space-y-5">
              {/* Product preview */}
              <div className="flex gap-4">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-32 h-32 object-cover rounded-xl ring-1 ring-black/5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Precio CJ (costo)</p>
                  <p className="text-lg font-bold text-red-600">
                    ${selectedProduct.sellPrice} USD
                    {currency !== 'USD' && (
                      <span className="text-sm font-medium text-gray-400 ml-2">
                        ({getCurrencySymbol(currency)}{Math.ceil(selectedProduct.sellPrice * rate)} {currency})
                      </span>
                    )}
                  </p>
                  {selectedProduct.images.length > 0 && (
                    <div className="flex gap-1.5 mt-3 overflow-x-auto">
                      {selectedProduct.images.slice(0, 5).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-12 h-12 object-cover rounded-lg ring-1 ring-black/5 shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit fields */}
              <div className="space-y-4">
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
              </div>

              {/* Product details */}
              <div className="flex flex-wrap gap-3 text-xs">
                {selectedProduct.sku && (
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">
                    SKU: {selectedProduct.sku}
                  </span>
                )}
                {selectedProduct.weight && selectedProduct.weight > 0 && (
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">
                    Peso: {selectedProduct.weight}g
                  </span>
                )}
                {selectedProduct.materials && selectedProduct.materials.length > 0 && (
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">
                    Material: {selectedProduct.materials.join(', ')}
                  </span>
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

              {/* Variants grouped by attribute */}
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
                  <div className="space-y-3">
                    {selectedProduct.variantKeyNames.map(name => (
                      groups[name].size > 0 && (
                        <div key={name}>
                          <p className="text-sm font-medium text-gray-700 mb-1.5">{name} ({groups[name].size})</p>
                          <div className="flex gap-2 flex-wrap">
                            {Array.from(groups[name]).map(val => (
                              <span key={val} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                                {val}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                    <p className="text-xs text-gray-400">{selectedProduct.variants.length} combinaciones totales</p>
                  </div>
                )
              })()}

              {/* Description preview */}
              {selectedProduct.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Descripcion</p>
                  <div
                    className="text-xs text-gray-500 max-h-32 overflow-y-auto bg-gray-50 rounded-xl p-3 prose prose-xs"
                    dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                  />
                </div>
              )}

              {/* Import button or CJ setup prompt */}
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
                      onClick={onClose}
                      className="flex-1 py-2.5 bg-white border border-orange-200 text-orange-700 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-all"
                    >
                      Ir a Integraciones
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* === SEARCH VIEW === */
            <div className="space-y-4">
              {/* Search bar */}
              <form onSubmit={e => { e.preventDefault(); search() }} className="flex gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="Buscar productos (ej: camiseta, reloj, funda)..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={searching || !keyword.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl font-semibold hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all disabled:opacity-50 text-sm"
                >
                  {searching ? '...' : 'Buscar'}
                </button>
              </form>

              {/* Results */}
              {searching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5]"></div>
                </div>
              ) : results.length > 0 ? (
                <>
                  <p className="text-sm text-gray-400">{total} productos encontrados</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {results.map(product => (
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => search(page - 1)}
                        disabled={page <= 1}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-gray-500">
                        {page} / {totalPages}
                      </span>
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
              ) : keyword && !searching ? (
                <div className="text-center py-16">
                  <p className="text-gray-400">No se encontraron productos</p>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Busca productos en CJ Dropshipping</p>
                  <p className="text-gray-400 text-sm mt-1">Miles de productos listos para vender</p>
                </div>
              )}

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
      </div>
    </div>
  )
}
