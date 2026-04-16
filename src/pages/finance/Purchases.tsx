import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product, Supplier, Purchase, PurchaseItem, Warehouse } from '../../types'

type Period = '30d' | '90d' | 'year' | 'all'
type StatusFilter = 'all' | 'received' | 'cancelled'

export default function Purchases() {
  const { store, firebaseUser } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [purchaseNotes, setPurchaseNotes] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])

  // Product picker
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  // Expanded purchase
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [period, setPeriod] = useState<Period>('30d')
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Cancel flow
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        const [pSnap, sSnap, prodSnap, wSnap] = await Promise.all([
          getDocs(query(collection(db, `stores/${store.id}/purchases`), orderBy('date', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/suppliers`), orderBy('name'))),
          getDocs(query(collection(db, `stores/${store.id}/products`), orderBy('name'))),
          getDocs(query(collection(db, `stores/${store.id}/warehouses`), orderBy('createdAt'))),
        ])
        setPurchases(pSnap.docs.map(d => {
          const data = d.data()
          return { id: d.id, ...data, date: data.date?.toDate?.() || new Date(), createdAt: data.createdAt?.toDate?.() || new Date() } as Purchase
        }))
        setSuppliers(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)))
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
        const wList = wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))
        setWarehouses(wList)
        const defaultW = wList.find(w => w.isDefault)
        if (defaultW) setWarehouseId(defaultW.id)
      } catch { /* */ }
      setLoading(false)
    }
    fetch()
  }, [store])

  // Add product to items
  const addProduct = (product: Product) => {
    const hasCombos = product.combinations && product.combinations.length > 0

    if (hasCombos) {
      // Add one item per combination
      const newItems = product.combinations!
        .filter(c => c.available)
        .map(combo => ({
          productId: product.id,
          productName: product.name,
          quantity: 0,
          unitCost: combo.cost || product.cost || 0,
          totalCost: 0,
          variationName: Object.keys(combo.options).join(' / '),
          optionValue: Object.values(combo.options).join(' / '),
          _comboId: combo.id, // internal ref
        }))
      setItems(prev => [...prev, ...newItems as PurchaseItem[]])
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 0,
        unitCost: product.cost || 0,
        totalCost: 0,
      }])
    }
    setShowProductPicker(false)
    setProductSearch('')
  }

  const updateItem = (index: number, updates: Partial<PurchaseItem & { _comboId?: string }>) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, ...updates }
      updated.totalCost = (updated.quantity || 0) * (updated.unitCost || 0)
      return updated
    }))
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const total = items.reduce((s, i) => s + i.totalCost, 0)
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0)

  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))
    : products

  const handleSave = async () => {
    if (!store || !firebaseUser || items.length === 0 || totalQty === 0) return
    setSaving(true)
    try {
      const supplier = suppliers.find(s => s.id === supplierId)
      const warehouse = warehouses.find(w => w.id === warehouseId)
      const activeItems = items.filter(i => i.quantity > 0)

      // 1. Create purchase — build dynamically to avoid undefined (Firestore rejects it)
      const purchaseData: Record<string, unknown> = {
        supplierName: supplier?.name || 'Sin proveedor',
        items: activeItems.map(({ ...i }) => {
          const { _comboId, ...clean } = i as PurchaseItem & { _comboId?: string }
          return clean
        }),
        subtotal: total,
        total,
        status: 'received',
        date: Timestamp.fromDate(new Date(purchaseDate + 'T12:00:00')),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
      if (supplierId) purchaseData.supplierId = supplierId
      if (warehouseId) purchaseData.warehouseId = warehouseId
      if (warehouse?.name) purchaseData.warehouseName = warehouse.name
      if (purchaseNotes.trim()) purchaseData.notes = purchaseNotes.trim()
      const purchaseRef = await addDoc(collection(db, `stores/${store.id}/purchases`), purchaseData)

      // 2. Update stock per product + create stock movements
      for (const item of activeItems) {
        const product = products.find(p => p.id === item.productId)
        if (!product || !product.trackStock) continue

        const comboId = (item as PurchaseItem & { _comboId?: string })._comboId
        const productRef = doc(db, `stores/${store.id}/products`, item.productId)

        if (comboId && product.combinations) {
          // Update combination stock + combo warehouseStock
          const updatedCombinations = product.combinations.map(c => {
            if (c.id !== comboId) return c
            const cws = { ...(c.warehouseStock || {}) }
            if (warehouseId) cws[warehouseId] = (cws[warehouseId] || 0) + item.quantity
            return { ...c, stock: c.stock + item.quantity, warehouseStock: cws }
          })
          const newTotal = updatedCombinations.reduce((s, c) => s + c.stock, 0)
          const updateData: Record<string, unknown> = { combinations: updatedCombinations, stock: newTotal }
          if (warehouseId) updateData[`warehouseStock.${warehouseId}`] = newTotal
          await updateDoc(productRef, updateData)
        } else {
          // Simple product
          const newStock = (product.stock ?? 0) + item.quantity
          const updateData: Record<string, unknown> = { stock: newStock }
          if (warehouseId) updateData[`warehouseStock.${warehouseId}`] = newStock
          await updateDoc(productRef, updateData)
        }

        // Stock movement — build dynamically to avoid undefined
        const movement: Record<string, unknown> = {
          productId: item.productId,
          productName: item.productName,
          type: 'purchase',
          quantity: item.quantity,
          previousStock: product.stock ?? 0,
          newStock: (product.stock ?? 0) + item.quantity,
          referenceType: 'purchase',
          referenceId: purchaseRef.id,
          reason: `Compra a ${supplier?.name || 'proveedor'}`,
          createdBy: firebaseUser.uid,
          createdAt: Timestamp.now(),
        }
        if (item.variationName) movement.variationName = item.variationName
        if (item.optionValue) movement.optionValue = item.optionValue
        if (warehouseId) movement.warehouseId = warehouseId
        if (warehouse?.name) movement.warehouseName = warehouse.name
        await addDoc(collection(db, `stores/${store.id}/stock_movements`), movement)
      }

      // 3. Auto-create expense
      const expenseRef = await addDoc(collection(db, `stores/${store.id}/expenses`), {
        description: `Compra a ${supplier?.name || 'proveedor'} - ${activeItems.length} producto${activeItems.length > 1 ? 's' : ''}`,
        amount: total,
        category: 'Inventario',
        date: Timestamp.fromDate(new Date(purchaseDate + 'T12:00:00')),
        createdAt: Timestamp.now(),
      })

      // Link expense to purchase
      await updateDoc(doc(db, `stores/${store.id}/purchases`, purchaseRef.id), { expenseId: expenseRef.id })

      // Update local state — use our original typed locals rather than the
      // Record<string, unknown> purchaseData (whose values are `unknown`).
      const newPurchase: Purchase = {
        id: purchaseRef.id,
        supplierId: supplierId || '',
        supplierName: supplier?.name || 'Sin proveedor',
        items: activeItems.map(({ ...i }) => {
          const { _comboId: _unused, ...clean } = i as PurchaseItem & { _comboId?: string }
          void _unused
          return clean
        }),
        subtotal: total,
        total,
        status: 'received',
        date: new Date(purchaseDate + 'T12:00:00'),
        createdAt: new Date(),
        updatedAt: new Date(),
        expenseId: expenseRef.id,
      }
      if (warehouseId) newPurchase.warehouseId = warehouseId
      if (warehouse?.name) newPurchase.warehouseName = warehouse.name
      if (purchaseNotes.trim()) newPurchase.notes = purchaseNotes.trim()
      setPurchases(prev => [newPurchase, ...prev])

      // Reset form
      setShowForm(false)
      setItems([])
      setSupplierId('')
      setPurchaseNotes('')
      setPurchaseDate(new Date().toISOString().split('T')[0])
    } catch (err) {
      console.error('Error saving purchase:', err)
    }
    setSaving(false)
  }

  // Cancel a purchase: reverses stock, deletes linked expense, marks as cancelled
  const handleCancelPurchase = async (purchase: Purchase) => {
    if (!store || !firebaseUser) return
    if (purchase.status === 'cancelled') return
    const ok = confirm(
      `Cancelar esta compra revertira el stock agregado y eliminara el gasto asociado. Continuar?\n\nProveedor: ${purchase.supplierName}\nTotal: ${fmt(purchase.total)}`
    )
    if (!ok) return

    setCancellingId(purchase.id)
    try {
      // 1. Reverse stock for each item
      for (const item of purchase.items) {
        const product = products.find(p => p.id === item.productId)
        if (!product || !product.trackStock) continue

        const productRef = doc(db, `stores/${store.id}/products`, item.productId)

        // For combo items (variationName/optionValue was set when the item was added)
        const hasCombo = !!item.variationName && !!item.optionValue && !!product.combinations?.length
        if (hasCombo && product.combinations) {
          const targetCombo = product.combinations.find(c =>
            Object.keys(c.options).join(' / ') === item.variationName
            && Object.values(c.options).join(' / ') === item.optionValue
          )
          if (!targetCombo) continue

          const updatedCombinations = product.combinations.map(c => {
            if (c.id !== targetCombo.id) return c
            const cws = { ...(c.warehouseStock || {}) }
            if (purchase.warehouseId) {
              cws[purchase.warehouseId] = Math.max(0, (cws[purchase.warehouseId] || 0) - item.quantity)
            }
            return { ...c, stock: Math.max(0, c.stock - item.quantity), warehouseStock: cws }
          })
          const newTotal = updatedCombinations.reduce((s, c) => s + c.stock, 0)
          const updateData: Record<string, unknown> = { combinations: updatedCombinations, stock: newTotal }
          if (purchase.warehouseId) {
            const currentWarehouseStock = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock?.[purchase.warehouseId] || 0
            updateData[`warehouseStock.${purchase.warehouseId}`] = Math.max(0, currentWarehouseStock - item.quantity)
          }
          await updateDoc(productRef, updateData)
        } else {
          const newStock = Math.max(0, (product.stock ?? 0) - item.quantity)
          const updateData: Record<string, unknown> = { stock: newStock }
          if (purchase.warehouseId) {
            const currentWarehouseStock = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock?.[purchase.warehouseId] || 0
            updateData[`warehouseStock.${purchase.warehouseId}`] = Math.max(0, currentWarehouseStock - item.quantity)
          }
          await updateDoc(productRef, updateData)
        }

        // Log reversal movement
        const movement: Record<string, unknown> = {
          productId: item.productId,
          productName: item.productName,
          type: 'adjustment',
          quantity: -item.quantity,
          previousStock: product.stock ?? 0,
          newStock: Math.max(0, (product.stock ?? 0) - item.quantity),
          referenceType: 'purchase',
          referenceId: purchase.id,
          reason: `Cancelacion de compra a ${purchase.supplierName}`,
          createdBy: firebaseUser.uid,
          createdAt: Timestamp.now(),
        }
        if (item.variationName) movement.variationName = item.variationName
        if (item.optionValue) movement.optionValue = item.optionValue
        if (purchase.warehouseId) movement.warehouseId = purchase.warehouseId
        if (purchase.warehouseName) movement.warehouseName = purchase.warehouseName
        await addDoc(collection(db, `stores/${store.id}/stock_movements`), movement)
      }

      // 2. Delete linked expense (so cancelled purchase doesn't affect cashflow)
      if (purchase.expenseId) {
        try {
          await deleteDoc(doc(db, `stores/${store.id}/expenses`, purchase.expenseId))
        } catch (err) {
          console.error('Could not delete expense:', err)
        }
      }

      // 3. Mark purchase as cancelled
      await updateDoc(doc(db, `stores/${store.id}/purchases`, purchase.id), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      })

      // Update local state + refresh products (stock changed)
      setPurchases(prev => prev.map(p => p.id === purchase.id ? { ...p, status: 'cancelled' as const, updatedAt: new Date() } : p))
      // Refresh products in-memory (subtract quantities)
      setProducts(prev => prev.map(p => {
        const affectedItems = purchase.items.filter(i => i.productId === p.id)
        if (affectedItems.length === 0) return p
        const totalQty = affectedItems.reduce((s, i) => s + i.quantity, 0)
        return { ...p, stock: Math.max(0, (p.stock ?? 0) - totalQty) } as Product
      }))
    } catch (err) {
      console.error('Error cancelling purchase:', err)
      alert('Error al cancelar la compra. Revisa la consola.')
    }
    setCancellingId(null)
  }

  // Period boundary
  const periodStartTs = useMemo(() => {
    const now = Date.now()
    if (period === '30d') return now - 30 * 24 * 60 * 60 * 1000
    if (period === '90d') return now - 90 * 24 * 60 * 60 * 1000
    if (period === 'year') return now - 365 * 24 * 60 * 60 * 1000
    return 0
  }, [period])

  // Filtered purchases
  const filtered = useMemo(() => {
    return purchases.filter(p => {
      if (period !== 'all' && p.date.getTime() < periodStartTs) return false
      if (supplierFilter !== 'all' && p.supplierId !== supplierFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchesSupplier = p.supplierName.toLowerCase().includes(q)
        const matchesNotes = (p.notes || '').toLowerCase().includes(q)
        const matchesItems = p.items.some(i => i.productName.toLowerCase().includes(q))
        if (!matchesSupplier && !matchesNotes && !matchesItems) return false
      }
      return true
    })
  }, [purchases, period, periodStartTs, supplierFilter, statusFilter, search])

  // Summary stats over filtered (excluding cancelled from money totals)
  const stats = useMemo(() => {
    const valid = filtered.filter(p => p.status !== 'cancelled')
    const totalSpend = valid.reduce((s, p) => s + (p.total || 0), 0)
    const count = valid.length
    const avg = count > 0 ? totalSpend / count : 0

    const bySupplier: Record<string, { name: string; total: number }> = {}
    valid.forEach(p => {
      const key = p.supplierId || '__none__'
      if (!bySupplier[key]) bySupplier[key] = { name: p.supplierName || 'Sin proveedor', total: 0 }
      bySupplier[key].total += p.total || 0
    })
    const topSupplier = Object.values(bySupplier).sort((a, b) => b.total - a.total)[0]

    return { totalSpend, count, avg, topSupplier, cancelledCount: filtered.length - valid.length }
  }, [filtered])

  // Group filtered purchases by month (YYYY-MM)
  const grouped = useMemo(() => {
    const map: Record<string, Purchase[]> = {}
    filtered.forEach(p => {
      const d = p.date
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(p)
    })
    // Already sorted desc by date in state; preserve order
    return Object.entries(map).map(([month, items]) => {
      const monthDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1, 1)
      const label = monthDate.toLocaleDateString('es', { month: 'long', year: 'numeric' })
      const monthTotal = items.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.total || 0), 0)
      return { month, label, items, monthTotal }
    })
  }, [filtered])

  const periods: { key: Period; label: string }[] = [
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'year', label: '1 ano' },
    { key: 'all', label: 'Todo' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">{purchases.length} compra{purchases.length !== 1 ? 's' : ''} registrada{purchases.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {periods.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium">
            {showForm ? 'Cancelar' : '+ Nueva compra'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {purchases.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-400 mb-1">Total gastado</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{fmt(stats.totalSpend)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">en el periodo</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-400 mb-1">Compras</p>
            <p className="text-xl font-semibold text-gray-900">{stats.count}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {stats.cancelledCount > 0 && <span className="text-red-400">{stats.cancelledCount} canceladas · </span>}
              {stats.count > 0 ? fmt(stats.avg) + ' promedio' : 'Sin compras'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-400 mb-1">Proveedor principal</p>
            <p className="text-xl font-semibold text-gray-900 truncate">{stats.topSupplier?.name || '—'}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{stats.topSupplier ? fmt(stats.topSupplier.total) : 'Sin datos'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-400 mb-1">Resultados filtrados</p>
            <p className="text-xl font-semibold text-gray-900">{filtered.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">de {purchases.length} totales</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {purchases.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por proveedor, producto o notas..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
          </div>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
            <option value="all">Todos los proveedores</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
            <option value="all">Todos</option>
            <option value="received">Recibidas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      )}

      {/* New purchase form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-4 animate-[slideDown_0.2s_ease-out]">
          <h3 className="text-sm font-medium text-gray-900">Registrar compra</h3>

          {/* Supplier, warehouse, date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proveedor</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                <option value="">Sin proveedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Almacen destino</label>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' (Principal)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
            </div>
          </div>

          {/* Product picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">Productos</label>
              <button type="button" onClick={() => setShowProductPicker(!showProductPicker)}
                className="text-xs text-[#1e3a5f] hover:text-[#2d6cb5] font-medium">
                + Agregar producto
              </button>
            </div>

            {showProductPicker && (
              <div className="mb-3 animate-[slideDown_0.15s_ease-out]">
                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar producto por nombre o SKU..." autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                  {filteredProducts.slice(0, 15).map(p => {
                    const hasCombos = p.combinations && p.combinations.length > 0
                    return (
                      <button key={p.id} onClick={() => addProduct(p)}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
                        {p.image ? <img src={p.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                          : <div className="w-7 h-7 rounded bg-gray-100 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-gray-400">{p.sku || 'Sin SKU'}
                            {hasCombos && <span className="ml-1">({p.combinations!.length} combinaciones)</span>}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Items table */}
            {items.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">Agrega productos a esta compra</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50/80 text-[11px] text-gray-400 uppercase tracking-wider font-medium border-b border-gray-100">
                  <div className="col-span-5">Producto</div>
                  <div className="col-span-2 text-right">Cantidad</div>
                  <div className="col-span-2 text-right">Costo unit.</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={idx} className="px-3 py-2">
                      {/* Mobile */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-900 truncate flex-1">{item.productName}</p>
                          <button onClick={() => removeItem(idx)} className="p-1 text-gray-300 hover:text-red-400 ml-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {item.optionValue && <p className="text-[11px] text-gray-400">{item.optionValue}</p>}
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" min="0" value={item.quantity || ''} placeholder="Cant."
                            onChange={e => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                            className="px-2 py-1.5 border border-gray-200 rounded-md text-xs text-right" />
                          <input type="number" min="0" step="0.01" value={item.unitCost || ''} placeholder="Costo"
                            onChange={e => updateItem(idx, { unitCost: Number(e.target.value) || 0 })}
                            className="px-2 py-1.5 border border-gray-200 rounded-md text-xs text-right" />
                          <p className="px-2 py-1.5 text-xs text-right text-gray-700 font-medium">{fmt(item.totalCost)}</p>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{item.productName}</p>
                          {item.optionValue && <p className="text-[11px] text-gray-400">{item.optionValue}</p>}
                        </div>
                        <div className="col-span-2">
                          <input type="number" min="0" value={item.quantity || ''} placeholder="0"
                            onChange={e => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs text-right focus:ring-1 focus:ring-[#1e3a5f]/10" />
                        </div>
                        <div className="col-span-2">
                          <input type="number" min="0" step="0.01" value={item.unitCost || ''} placeholder="0"
                            onChange={e => updateItem(idx, { unitCost: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs text-right focus:ring-1 focus:ring-[#1e3a5f]/10" />
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-xs font-medium text-gray-700">{fmt(item.totalCost)}</p>
                        </div>
                        <div className="col-span-1 text-right">
                          <button onClick={() => removeItem(idx)} className="p-1 text-gray-300 hover:text-red-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <p className="text-xs text-gray-500">{totalQty} unidades</p>
                  <p className="text-sm font-medium text-gray-900">Total: {fmt(total)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas (opcional)</label>
            <input type="text" value={purchaseNotes} onChange={e => setPurchaseNotes(e.target.value)} placeholder="Numero de factura, observaciones..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving || items.length === 0 || totalQty === 0}
              className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
              {saving ? 'Guardando...' : 'Registrar compra'}
            </button>
          </div>
        </div>
      )}

      {/* Purchase list — grouped by month */}
      {purchases.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-16 text-center">
          <p className="text-sm text-gray-400">Sin compras registradas</p>
          <p className="text-xs text-gray-300 mt-1">Registra una compra para actualizar el stock y el flujo de caja</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-16 text-center">
          <p className="text-sm text-gray-400">Sin resultados para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(group => (
            <div key={group.month}>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{group.label}</p>
                <p className="text-[11px] text-gray-500 tabular-nums">{fmt(group.monthTotal)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden divide-y divide-gray-50">
                {group.items.map(p => {
                  const isOpen = expandedId === p.id
                  const isCancelled = p.status === 'cancelled'
                  const isCancelling = cancellingId === p.id
                  return (
                    <div key={p.id} className={isCancelled ? 'opacity-60' : ''}>
                      <div
                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isOpen ? null : p.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            p.status === 'received' ? 'bg-green-500' : p.status === 'cancelled' ? 'bg-red-400' : 'bg-amber-400'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={`text-sm truncate ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>
                                {p.supplierName}
                              </p>
                              {isCancelled && (
                                <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] font-medium rounded">Cancelada</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400">
                                {p.date.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                                {' · '}{p.items.length} item{p.items.length !== 1 ? 's' : ''}
                              </span>
                              {p.warehouseName && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">
                                  {p.warehouseName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className={`text-sm font-medium tabular-nums ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                            {fmt(p.total)}
                          </p>
                          <svg className={`w-4 h-4 text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="px-4 pb-3 border-t border-gray-50 bg-gray-50/30 animate-[slideDown_0.15s_ease-out]">
                          <div className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-100 mt-3">
                            {p.items.map((item, idx) => (
                              <div key={idx} className="px-3 py-2 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-700">{item.productName}</p>
                                  {item.optionValue && <p className="text-[11px] text-gray-400">{item.optionValue}</p>}
                                </div>
                                <div className="text-right flex-shrink-0 ml-3">
                                  <p className="text-[11px] text-gray-500">{item.quantity} × {fmt(item.unitCost)}</p>
                                  <p className="text-sm font-medium text-gray-700 tabular-nums">{fmt(item.totalCost)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {p.notes && (
                            <div className="mt-2 bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <p className="text-[11px] text-gray-400 mb-0.5">Notas</p>
                              <p className="text-xs text-gray-600 whitespace-pre-wrap">{p.notes}</p>
                            </div>
                          )}
                          {!isCancelled && (
                            <div className="flex justify-end mt-3">
                              <button
                                onClick={() => handleCancelPurchase(p)}
                                disabled={isCancelling}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                              >
                                {isCancelling ? 'Cancelando...' : 'Cancelar compra'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
