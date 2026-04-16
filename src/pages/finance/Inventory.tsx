import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, Timestamp, where, limit as fbLimit } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product, Category, Warehouse, Branch } from '../../types'

type StockFilter = 'all' | 'low' | 'out' | 'ok'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

export default function Inventory() {
  const { store, firebaseUser } = useAuth()
  const { localePath } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [onlyTracked, setOnlyTracked] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Inline adjust (for simple products)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustValue, setAdjustValue] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  // Action menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Transfer modal
  const [transferProduct, setTransferProduct] = useState<Product | null>(null)
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferQty, setTransferQty] = useState('')  // for simple products
  const [transferComboQtys, setTransferComboQtys] = useState<Record<string, string>>({})  // comboId -> qty
  const [transferNote, setTransferNote] = useState('')
  const [transferSaving, setTransferSaving] = useState(false)

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkChanges, setBulkChanges] = useState<Record<string, string>>({})
  const [bulkSaving, setBulkSaving] = useState(false)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return
    const handler = () => setMenuOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpenId])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  // For products with variants, real stock = sum of combination stocks (or legacy variant stocks)
  const getRealStock = (p: Product): number => {
    if (p.combinations && p.combinations.length > 0) {
      return p.combinations.reduce((sum, c) => sum + c.stock, 0)
    }
    if (p.hasVariations && p.variations && p.variations.length > 0) {
      return p.variations.reduce((sum, v) => sum + v.options.reduce((s, o) => s + (o.stock ?? 0), 0), 0)
    }
    return p.stock ?? 0
  }

  const hasCombinations = (p: Product) => p.combinations && p.combinations.length > 0

  const fetchData = async () => {
    if (!store) return
    setLoading(true)
    try {
      const [prodSnap, catSnap, wSnap, bSnap] = await Promise.all([
        getDocs(query(collection(db, `stores/${store.id}/products`), orderBy('name'))),
        getDocs(query(collection(db, `stores/${store.id}/categories`), orderBy('order'))),
        getDocs(query(collection(db, `stores/${store.id}/warehouses`), orderBy('createdAt'))),
        getDocs(query(collection(db, `stores/${store.id}/branches`), orderBy('createdAt'))),
      ])
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
      setWarehouses(wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)))
      setBranches(bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Branch)))
    } catch {
      setProducts([])
      setCategories([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [store])

  // Get default warehouse ID
  const getDefaultWarehouseId = async (): Promise<string | null> => {
    if (!store) return null
    try {
      const wSnap = await getDocs(query(collection(db, `stores/${store.id}/warehouses`), where('isDefault', '==', true), fbLimit(1)))
      return wSnap.empty ? null : wSnap.docs[0].id
    } catch { return null }
  }

  // Inline adjust save
  const handleInlineAdjust = async (product: Product) => {
    if (!store || !firebaseUser || adjustValue === '') return
    const newStockNum = parseInt(adjustValue)
    if (isNaN(newStockNum) || newStockNum === (product.stock ?? 0)) { setAdjustingId(null); return }

    setAdjustSaving(true)
    try {
      const defaultWId = await getDefaultWarehouseId()
      const updateData: Record<string, unknown> = { stock: newStockNum }
      if (defaultWId) updateData[`warehouseStock.${defaultWId}`] = newStockNum
      await updateDoc(doc(db, `stores/${store.id}/products`, product.id), updateData)

      await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
        productId: product.id, productName: product.name,
        type: 'adjustment', quantity: newStockNum - (product.stock ?? 0),
        previousStock: product.stock ?? 0, newStock: newStockNum,
        referenceType: 'manual', reason: 'Ajuste rapido',
        createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
      })

      // Update local state
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStockNum } : p))
      setAdjustingId(null)
      setAdjustValue('')
    } catch (err) {
      console.error(err)
    }
    setAdjustSaving(false)
  }

  // Bulk save
  const handleBulkSave = async () => {
    if (!store || !firebaseUser) return
    const changes = Object.entries(bulkChanges).filter(([id, val]) => {
      const p = products.find(x => x.id === id)
      return val !== '' && p && parseInt(val) !== (p.stock ?? 0)
    })
    if (changes.length === 0) { setBulkMode(false); return }

    setBulkSaving(true)
    try {
      const defaultWId = await getDefaultWarehouseId()
      for (const [productId, val] of changes) {
        const product = products.find(p => p.id === productId)
        if (!product) continue
        const newStockNum = parseInt(val)
        const updateData: Record<string, unknown> = { stock: newStockNum }
        if (defaultWId) updateData[`warehouseStock.${defaultWId}`] = newStockNum
        await updateDoc(doc(db, `stores/${store.id}/products`, productId), updateData)

        await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
          productId, productName: product.name,
          type: 'adjustment', quantity: newStockNum - (product.stock ?? 0),
          previousStock: product.stock ?? 0, newStock: newStockNum,
          referenceType: 'manual', reason: 'Recuento masivo',
          createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
        })
      }
      // Update local
      setProducts(prev => prev.map(p => {
        const newVal = bulkChanges[p.id]
        if (newVal !== undefined && newVal !== '') return { ...p, stock: parseInt(newVal) }
        return p
      }))
      setBulkChanges({})
      setBulkMode(false)
    } catch (err) {
      console.error(err)
    }
    setBulkSaving(false)
  }

  // Transfer
  const openTransfer = (product: Product) => {
    setTransferProduct(product)
    setTransferFrom('')
    setTransferTo('')
    setTransferQty('')
    setTransferComboQtys({})
    setTransferNote('')
    setMenuOpenId(null)
  }

  const transferHasCombos = transferProduct?.combinations && transferProduct.combinations.length > 0

  const transferAvailable = (() => {
    if (!transferProduct || !transferFrom) return 0
    const ws = (transferProduct as Product & { warehouseStock?: Record<string, number> }).warehouseStock
    return ws?.[transferFrom] || 0
  })()

  const transferTotalQty = transferHasCombos
    ? Object.values(transferComboQtys).reduce((s, v) => s + (parseInt(v) || 0), 0)
    : (parseInt(transferQty) || 0)

  const transferIsValid = transferFrom && transferTo && transferFrom !== transferTo && transferTotalQty > 0 && transferTotalQty <= transferAvailable

  const handleTransfer = async () => {
    if (!store || !firebaseUser || !transferProduct || !transferIsValid) return
    setTransferSaving(true)
    try {
      const ref = doc(db, `stores/${store.id}/products`, transferProduct.id)
      const ws = { ...((transferProduct as Product & { warehouseStock?: Record<string, number> }).warehouseStock || {}) }
      const fromW = warehouses.find(w => w.id === transferFrom)
      const toW = warehouses.find(w => w.id === transferTo)

      ws[transferFrom] = (ws[transferFrom] || 0) - transferTotalQty
      ws[transferTo] = (ws[transferTo] || 0) + transferTotalQty
      await updateDoc(ref, { warehouseStock: ws })

      // Stock movements per combo or one for simple
      if (transferHasCombos) {
        for (const combo of transferProduct.combinations!) {
          const qty = parseInt(transferComboQtys[combo.id]) || 0
          if (qty <= 0) continue
          const comboLabel = Object.values(combo.options).join(' / ')
          const baseReason = transferNote.trim() || `Transferencia a ${toW?.name || 'otro almacen'}`

          await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
            productId: transferProduct.id, productName: transferProduct.name,
            variationName: Object.keys(combo.options).join(' / '), optionValue: comboLabel,
            type: 'transfer', quantity: -qty,
            previousStock: transferProduct.stock ?? 0, newStock: transferProduct.stock ?? 0,
            reason: baseReason, warehouseId: transferFrom, warehouseName: fromW?.name,
            createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
          })
          await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
            productId: transferProduct.id, productName: transferProduct.name,
            variationName: Object.keys(combo.options).join(' / '), optionValue: comboLabel,
            type: 'transfer', quantity: qty,
            previousStock: transferProduct.stock ?? 0, newStock: transferProduct.stock ?? 0,
            reason: transferNote.trim() || `Transferencia desde ${fromW?.name || 'otro almacen'}`,
            warehouseId: transferTo, warehouseName: toW?.name,
            createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
          })
        }
      } else {
        const reason = transferNote.trim() || `Transferencia a ${toW?.name || 'otro almacen'}`
        await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
          productId: transferProduct.id, productName: transferProduct.name,
          type: 'transfer', quantity: -transferTotalQty,
          previousStock: transferProduct.stock ?? 0, newStock: transferProduct.stock ?? 0,
          reason, warehouseId: transferFrom, warehouseName: fromW?.name,
          createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
        })
        await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
          productId: transferProduct.id, productName: transferProduct.name,
          type: 'transfer', quantity: transferTotalQty,
          previousStock: transferProduct.stock ?? 0, newStock: transferProduct.stock ?? 0,
          reason: transferNote.trim() || `Transferencia desde ${fromW?.name || 'otro almacen'}`,
          warehouseId: transferTo, warehouseName: toW?.name,
          createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
        })
      }

      setProducts(prev => prev.map(p => p.id === transferProduct.id ? { ...p, warehouseStock: ws } as Product : p))
      setTransferProduct(null)
    } catch (err) {
      console.error(err)
    }
    setTransferSaving(false)
  }

  const bulkChangeCount = Object.entries(bulkChanges).filter(([id, val]) => {
    const p = products.find(x => x.id === id)
    return val !== '' && p && parseInt(val) !== (p.stock ?? 0)
  }).length

  const filtered = useMemo(() => {
    let list = products.filter(p => p.active !== false)
    if (onlyTracked) list = list.filter(p => p.trackStock)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q))
    }
    if (categoryFilter) list = list.filter(p => p.categoryId === categoryFilter)
    if (stockFilter === 'out') list = list.filter(p => p.trackStock && getRealStock(p) === 0)
    else if (stockFilter === 'low') list = list.filter(p => p.trackStock && getRealStock(p) > 0 && getRealStock(p) <= (p.lowStockAlert ?? 5))
    else if (stockFilter === 'ok') list = list.filter(p => !p.trackStock || getRealStock(p) > (p.lowStockAlert ?? 5))
    return list
  }, [products, search, categoryFilter, stockFilter])

  const stats = useMemo(() => {
    const tracked = products.filter(p => p.trackStock && p.active !== false)
    const outOfStock = tracked.filter(p => getRealStock(p) === 0).length
    const lowStock = tracked.filter(p => getRealStock(p) > 0 && getRealStock(p) <= (p.lowStockAlert ?? 5)).length
    const totalValue = tracked.reduce((sum, p) => sum + (p.cost || p.price) * getRealStock(p), 0)
    const totalUnits = tracked.reduce((sum, p) => sum + getRealStock(p), 0)
    return { total: products.filter(p => p.active !== false).length, tracked: tracked.length, outOfStock, lowStock, totalValue, totalUnits }
  }, [products])

  const getStockStatus = (p: Product) => {
    if (!p.trackStock) return 'untracked'
    const s = getRealStock(p)
    if (s === 0) return 'out'
    if (s <= (p.lowStockAlert ?? 5)) return 'low'
    return 'ok'
  }

  const stockFilters: { key: StockFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'Todos', count: stats.total },
    { key: 'low', label: 'Bajo stock', count: stats.lowStock },
    { key: 'out', label: 'Sin stock', count: stats.outOfStock },
    { key: 'ok', label: 'Normal' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.tracked} productos con control de stock</p>
        </div>
        <div className="flex items-center gap-2">
          {bulkMode ? (
            <>
              <button onClick={() => { setBulkMode(false); setBulkChanges({}) }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
              <button onClick={handleBulkSave} disabled={bulkSaving || bulkChangeCount === 0}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
                {bulkSaving ? 'Guardando...' : `Guardar ${bulkChangeCount > 0 ? `(${bulkChangeCount})` : ''}`}
              </button>
            </>
          ) : (
            <>
              <Link to={localePath('/finance/inventory/diagnostic')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Diagnostico
              </Link>
              <button onClick={() => setBulkMode(true)}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium">
                Recuento
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk mode banner */}
      {bulkMode && (
        <div className="bg-blue-50 border border-blue-200/60 rounded-xl px-4 py-3 text-sm text-blue-700 animate-[slideDown_0.2s_ease-out]">
          Modo recuento: edita las cantidades directamente y guarda todos los cambios de una vez.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200/60 p-3">
          <p className="text-[11px] text-gray-400 mb-1">Unidades totales</p>
          <p className="text-lg font-semibold text-gray-900">{stats.totalUnits.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-3">
          <p className="text-[11px] text-gray-400 mb-1">Valor del inventario</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(stats.totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-3">
          <p className="text-[11px] text-gray-400 mb-1">Bajo stock</p>
          <p className={`text-lg font-semibold ${stats.lowStock > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{stats.lowStock}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-3">
          <p className="text-[11px] text-gray-400 mb-1">Sin stock</p>
          <p className={`text-lg font-semibold ${stats.outOfStock > 0 ? 'text-red-500' : 'text-gray-900'}`}>{stats.outOfStock}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU o codigo..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
          <option value="">Todas las categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Stock filter pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setOnlyTracked(!onlyTracked)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            onlyTracked ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <div className={`w-3 h-3 rounded border flex items-center justify-center ${onlyTracked ? 'border-white/40 bg-white/20' : 'border-gray-300'}`}>
            {onlyTracked && <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
          </div>
          Solo con stock
        </button>
        <div className="flex items-center gap-1">
        {stockFilters.map(f => (
          <button key={f.key} onClick={() => setStockFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              stockFilter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}>
            {f.label}
            {f.count !== undefined && f.count > 0 && <span className={`ml-1.5 ${stockFilter === f.key ? 'text-gray-300' : 'text-gray-400'}`}>{f.count}</span>}
          </button>
        ))}
        </div>
      </div>

      {/* Products list */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">No se encontraron productos</p>
          </div>
        ) : (
          <>
            {/* Table header - desktop */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-medium">
              <div className="col-span-4">Producto</div>
              <div className="col-span-2 text-right">Stock</div>
              <div className="col-span-2 text-right">Costo</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-right">Estado</div>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.map(product => {
                const status = getStockStatus(product)
                const stock = getRealStock(product)
                const cost = product.cost || product.price
                const value = cost * stock
                const hasVariants = product.hasVariations && product.variations && product.variations.length > 0
                const isExpanded = expanded.has(product.id)
                const isAdjusting = adjustingId === product.id

                return (
                  <div key={product.id}>
                    <div className="px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => !bulkMode && product.trackStock && toggleExpand(product.id)}>

                      {/* Mobile */}
                      <div className="sm:hidden flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {product.trackStock && !bulkMode && <ChevronIcon open={isExpanded} />}
                          {product.image ? <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400">{product.sku || 'Sin SKU'}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {bulkMode && product.trackStock ? (
                            <input type="number" min="0"
                              value={bulkChanges[product.id] ?? String(stock)}
                              onChange={e => setBulkChanges(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className={`w-16 px-2 py-1 text-sm text-right border rounded-md ${
                                bulkChanges[product.id] !== undefined && parseInt(bulkChanges[product.id]) !== stock
                                  ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                              }`}
                              onClick={e => e.stopPropagation()} />
                          ) : (
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{product.trackStock ? stock : '--'}</p>
                              <StatusBadge status={status} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          {product.trackStock && !bulkMode && <ChevronIcon open={isExpanded} />}
                          {product.image ? <img src={product.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400">{product.sku || 'Sin SKU'}
                              {hasVariants && <span className="ml-1 text-gray-300">({product.variations!.reduce((n, v) => n + v.options.length, 0)} var.)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2 text-right">
                          {bulkMode && product.trackStock ? (
                            <input type="number" min="0"
                              value={bulkChanges[product.id] ?? String(stock)}
                              onChange={e => setBulkChanges(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className={`w-20 px-2 py-1 text-sm text-right border rounded-md ml-auto block ${
                                bulkChanges[product.id] !== undefined && parseInt(bulkChanges[product.id]) !== stock
                                  ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                              }`}
                              onClick={e => e.stopPropagation()} />
                          ) : isAdjusting ? (
                            <div className="flex items-center gap-1 justify-end">
                              <input type="number" min="0" autoFocus
                                value={adjustValue}
                                onChange={e => setAdjustValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleInlineAdjust(product); if (e.key === 'Escape') setAdjustingId(null) }}
                                className="w-16 px-2 py-1 text-sm text-right border border-blue-400 bg-blue-50 rounded-md"
                                onClick={e => e.stopPropagation()} />
                              <button onClick={e => { e.stopPropagation(); handleInlineAdjust(product) }}
                                disabled={adjustSaving}
                                className="p-1 text-blue-500 hover:text-blue-700 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              </button>
                              <button onClick={e => { e.stopPropagation(); setAdjustingId(null) }}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{product.trackStock ? stock : '--'}</p>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm text-gray-600">{fmt(cost)}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm text-gray-600">{product.trackStock ? fmt(value) : '--'}</p>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <StatusBadge status={status} />
                          {!bulkMode && product.trackStock && (
                            <div className="relative">
                              <button onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === product.id ? null : product.id) }}
                                className="p-1 text-gray-300 hover:text-gray-500 rounded-md hover:bg-gray-100 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                </svg>
                              </button>
                              {menuOpenId === product.id && (
                                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40 animate-[slideDown_0.1s_ease-out]"
                                  onClick={e => e.stopPropagation()}>
                                  {!hasVariants && (
                                    <button onClick={() => { setAdjustingId(product.id); setAdjustValue(String(stock)); setMenuOpenId(null) }}
                                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                      Ajustar stock
                                    </button>
                                  )}
                                  {warehouses.length >= 2 && (
                                    <button onClick={() => openTransfer(product)}
                                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                      Transferir
                                    </button>
                                  )}
                                  <button onClick={() => { toggleExpand(product.id); setMenuOpenId(null) }}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                    {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded: Sucursales > Almacenes > Variantes */}
                    {isExpanded && !bulkMode && (
                      <div className="border-t border-gray-100 bg-gray-50/20 px-4 py-3 space-y-2 animate-[slideDown_0.15s_ease-out]">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium pl-1">Stock por Sucursal y Almacen</p>
                        {branches.length === 0 ? (
                          <p className="text-xs text-gray-400 pl-1">Sin sucursales configuradas</p>
                        ) : (
                          branches.map(branch => {
                            const branchWarehouses = warehouses.filter(w => w.branchId === branch.id)
                            return (
                              <div key={branch.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                                {/* Branch header */}
                                <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100">
                                  <p className="text-xs font-medium text-gray-700">{branch.name}</p>
                                </div>
                                {/* Warehouses in branch */}
                                {branchWarehouses.length === 0 ? (
                                  <p className="px-3 py-2 text-[11px] text-gray-400">Sin almacenes</p>
                                ) : (
                                  <div className="divide-y divide-gray-50">
                                    {branchWarehouses.map(w => {
                                      const pWs = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock
                                      const wStock = pWs?.[w.id] ?? (w.isDefault && !pWs ? (product.stock ?? 0) : 0)

                                      return (
                                        <div key={w.id}>
                                          <div className="px-3 py-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5M10.5 21H3m1.125-9.75H3.375c-.621 0-1.125-.504-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125H4.125Z" />
                                              </svg>
                                              <p className="text-xs text-gray-600">{w.name}</p>
                                              {w.isDefault && <span className="px-1 py-0.5 bg-blue-50 text-blue-500 text-[9px] font-medium rounded">Principal</span>}
                                            </div>
                                            <p className="text-xs font-medium text-gray-700">{wStock} total</p>
                                          </div>
                                          {/* Combinations inside this warehouse */}
                                          {hasCombinations(product) && (
                                            <div className="pl-8 pr-3 pb-2 space-y-0.5">
                                              {product.combinations!.map(combo => {
                                                const comboLabel = Object.values(combo.options).join(' / ')
                                                return (
                                                  <div key={combo.id} className="flex items-center justify-between py-0.5">
                                                    <div className="flex items-center gap-2">
                                                      <p className="text-[11px] text-gray-600">{comboLabel}</p>
                                                      {combo.sku && <span className="text-[10px] text-gray-300">{combo.sku}</span>}
                                                    </div>
                                                    <p className="text-[11px] font-medium tabular-nums text-gray-700">{combo.stock}</p>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                          {/* Legacy: variants without combinations */}
                                          {hasVariants && !hasCombinations(product) && (
                                            <div className="pl-8 pr-3 pb-2 space-y-0.5">
                                              {product.variations!.map(variation =>
                                                variation.options.map(option => (
                                                  <div key={`${variation.id}-${option.id}`} className="flex items-center justify-between py-0.5">
                                                    <p className="text-[11px] text-gray-500">
                                                      <span className="text-gray-400">{variation.name}:</span> {option.value}
                                                    </p>
                                                    <p className="text-[11px] font-medium tabular-nums text-gray-700">{option.stock ?? 0}</p>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}

                        {/* Variants without warehouse context (if no warehouses) */}
                        {hasVariants && warehouses.length === 0 && (
                          <div className="bg-white rounded-lg border border-gray-100 p-3 space-y-1">
                            <p className="text-[11px] text-gray-400 mb-1">Variantes</p>
                            {product.variations!.map(variation =>
                              variation.options.map(option => (
                                <div key={`${variation.id}-${option.id}`} className="flex items-center justify-between py-0.5">
                                  <p className="text-[11px] text-gray-500">{variation.name}: {option.value}</p>
                                  <p className="text-[11px] font-medium text-gray-700">{option.stock ?? 0}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transfer modal inline */}
                    {transferProduct?.id === product.id && (
                      <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-4 animate-[slideDown_0.15s_ease-out]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-900">Transferir stock</h3>
                          <button onClick={() => setTransferProduct(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                        </div>

                        {/* Warehouses */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Desde</label>
                            <select value={transferFrom} onChange={e => { setTransferFrom(e.target.value); setTransferQty(''); setTransferComboQtys({}) }}
                              className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                              <option value="">Seleccionar</option>
                              {warehouses.map(w => {
                                const pws = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock
                                return <option key={w.id} value={w.id}>{w.name} ({pws?.[w.id] || 0})</option>
                              })}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Hacia</label>
                            <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                              className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                              <option value="">Seleccionar</option>
                              {warehouses.filter(w => w.id !== transferFrom).map(w => {
                                const pws = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock
                                return <option key={w.id} value={w.id}>{w.name} ({pws?.[w.id] || 0})</option>
                              })}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Nota</label>
                            <input type="text" value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Motivo (opcional)"
                              className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                          </div>
                        </div>

                        {/* Quantity: simple product */}
                        {transferFrom && transferTo && !transferHasCombos && (
                          <div className="mb-3 animate-[slideDown_0.1s_ease-out]">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="text-[11px] text-gray-500 mb-1 block">Cantidad <span className="text-gray-400">(disponible: {transferAvailable})</span></label>
                                <input type="number" min="1" max={transferAvailable} value={transferQty} onChange={e => setTransferQty(e.target.value)}
                                  placeholder="0"
                                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quantity per combination */}
                        {transferFrom && transferTo && transferHasCombos && (
                          <div className="mb-3 animate-[slideDown_0.1s_ease-out]">
                            <label className="text-[11px] text-gray-500 mb-2 block">Cantidad por combinacion <span className="text-gray-400">(disponible total: {transferAvailable})</span></label>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                                {product.combinations!.map(combo => {
                                  const comboLabel = Object.values(combo.options).join(' / ')
                                  return (
                                    <div key={combo.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs text-gray-700">{comboLabel}</p>
                                        <p className="text-[10px] text-gray-400">Stock: {combo.stock}</p>
                                      </div>
                                      <input type="number" min="0" max={combo.stock}
                                        value={transferComboQtys[combo.id] || ''}
                                        onChange={e => setTransferComboQtys(prev => ({ ...prev, [combo.id]: e.target.value }))}
                                        placeholder="0"
                                        className="w-16 px-2 py-1 border border-gray-200 rounded-md text-xs text-right focus:ring-1 focus:ring-[#1e3a5f]/10" />
                                    </div>
                                  )
                                })}
                              </div>
                              {transferTotalQty > 0 && (
                                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                  <p className="text-[11px] text-gray-500">Total a transferir</p>
                                  <p className="text-xs font-medium text-gray-900">{transferTotalQty} uds</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button onClick={handleTransfer}
                            disabled={transferSaving || !transferIsValid}
                            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-xs font-medium disabled:opacity-40">
                            {transferSaving ? 'Transfiriendo...' : `Transferir${transferTotalQty > 0 ? ` (${transferTotalQty})` : ''}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'ok' | 'low' | 'out' | 'untracked' }) {
  const styles = { ok: 'bg-green-50 text-green-600', low: 'bg-amber-50 text-amber-600', out: 'bg-red-50 text-red-500', untracked: 'bg-gray-50 text-gray-400' }
  const labels = { ok: 'Normal', low: 'Bajo', out: 'Agotado', untracked: 'Sin control' }
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${styles[status]}`}>{labels[status]}</span>
}
