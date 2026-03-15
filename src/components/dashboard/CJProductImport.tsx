import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { productService } from '../../lib/firebase'
import { useToast } from '../ui/Toast'
import { apiUrl } from '../../utils/apiBase'

interface CJProduct {
  pid: string
  name: string
  image: string
  sellPrice: number
  categoryName?: string
}

interface CJProductDetail {
  pid: string
  name: string
  description: string
  image: string
  images: string[]
  sellPrice: number
  weight?: number
  categoryName?: string
  variants: { vid: string; name: string; image: string; sellPrice: number; sku: string }[]
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

  if (!show) return null

  const search = async (newPage = 1) => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const res = await fetch(apiUrl('/api/cj'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', keyword: keyword.trim(), page: newPage, pageSize: 20 })
      })
      const data = await res.json()
      if (data.products) {
        setResults(data.products)
        setTotal(data.total || 0)
        setPage(newPage)
      }
    } catch {
      showToast('Error buscando productos', 'error')
    } finally {
      setSearching(false)
    }
  }

  const viewDetail = async (pid: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(apiUrl('/api/cj'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'details', pid })
      })
      const data = await res.json()
      if (data.pid) {
        setSelectedProduct(data)
        setImportName(data.name)
        // Suggest a markup price (2x the CJ price)
        const suggestedPrice = (data.sellPrice * 2).toFixed(2)
        setImportPrice(suggestedPrice)
      }
    } catch {
      showToast('Error cargando producto', 'error')
    } finally {
      setLoadingDetail(false)
    }
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

      await productService.create(store.id, {
        name: importName.trim(),
        slug,
        price: parseFloat(importPrice),
        image: selectedProduct.image,
        images: selectedProduct.images?.slice(0, 5) || [],
        description: selectedProduct.description || '',
        active: true,
        cjProductId: selectedProduct.pid,
      })

      showToast('Producto importado', 'success')
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
                  <p className="text-lg font-bold text-red-600">${selectedProduct.sellPrice} USD</p>
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
                  {importPrice && selectedProduct.sellPrice && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Ganancia estimada: <span className="text-green-600 font-medium">
                        ${(parseFloat(importPrice) - selectedProduct.sellPrice).toFixed(2)} {currency}
                      </span>
                      {' '}por venta
                    </p>
                  )}
                </div>
              </div>

              {/* Variants info */}
              {selectedProduct.variants.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Variantes disponibles ({selectedProduct.variants.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedProduct.variants.slice(0, 10).map(v => (
                      <span key={v.vid} className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                        {v.name}
                      </span>
                    ))}
                    {selectedProduct.variants.length > 10 && (
                      <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-400">
                        +{selectedProduct.variants.length - 10} mas
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Import button */}
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
