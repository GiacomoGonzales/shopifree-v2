import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product, ProductionOrder, Warehouse } from '../../types'

export default function Production() {
  const { store, firebaseUser } = useAuth()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('')  // only used for simple (no-combos) products
  const [comboQuantities, setComboQuantities] = useState<Record<string, string>>({})  // comboId -> qty (combo products)
  const [comboSearch, setComboSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [notes, setNotes] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Completing
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        const [oSnap, pSnap, wSnap] = await Promise.all([
          getDocs(query(collection(db, `stores/${store.id}/production_orders`), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/products`), orderBy('name'))),
          getDocs(query(collection(db, `stores/${store.id}/warehouses`), orderBy('createdAt'))),
        ])
        setOrders(oSnap.docs.map(d => {
          const data = d.data()
          return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date(), completedAt: data.completedAt?.toDate?.() || undefined } as ProductionOrder
        }))
        setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
        const wList = wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))
        setWarehouses(wList)
        const defaultW = wList.find(w => w.isDefault)
        if (defaultW) setWarehouseId(defaultW.id)
      } catch { /* */ }
      setLoading(false)
    }
    fetch()
  }, [store])

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const hasCombos = selectedProduct?.combinations && selectedProduct.combinations.length > 0
  const trackedProducts = products.filter(p => p.trackStock && p.active !== false)
  const filteredProducts = productSearch
    ? trackedProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))
    : trackedProducts

  const resetForm = () => {
    setSelectedProductId(''); setQuantity(''); setComboQuantities({}); setComboSearch(''); setNotes(''); setProductSearch('')
  }

  const comboQtyTotal = Object.values(comboQuantities).reduce((s, v) => s + (parseInt(v) || 0), 0)

  const handleSave = async () => {
    if (!store || !firebaseUser || !selectedProductId) return
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    const productHasCombos = product.combinations && product.combinations.length > 0
    if (productHasCombos) {
      if (comboQtyTotal <= 0) return
    } else {
      if (!quantity || parseInt(quantity) <= 0) return
    }

    setSaving(true)
    try {
      const warehouse = warehouses.find(w => w.id === warehouseId)
      const newOrders: (ProductionOrder & { _comboId?: string })[] = []

      if (productHasCombos) {
        // Create one production order per combo that has quantity > 0
        const targets = product.combinations!.filter(c => (parseInt(comboQuantities[c.id]) || 0) > 0)
        for (const combo of targets) {
          const qty = parseInt(comboQuantities[combo.id])
          const comboLabel = Object.values(combo.options).join(' / ')
          const data: Record<string, unknown> = {
            productId: selectedProductId,
            productName: product.name,
            variationName: Object.keys(combo.options).join(' / '),
            optionValue: comboLabel,
            quantity: qty,
            status: 'planned',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            _comboId: combo.id,
          }
          if (warehouseId) data.warehouseId = warehouseId
          if (warehouse?.name) data.warehouseName = warehouse.name
          if (notes.trim()) data.notes = notes.trim()
          const ref = await addDoc(collection(db, `stores/${store.id}/production_orders`), data)
          newOrders.push({ id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() } as ProductionOrder & { _comboId?: string })
        }
      } else {
        const data: Record<string, unknown> = {
          productId: selectedProductId,
          productName: product.name,
          quantity: parseInt(quantity),
          status: 'planned',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
        if (warehouseId) data.warehouseId = warehouseId
        if (warehouse?.name) data.warehouseName = warehouse.name
        if (notes.trim()) data.notes = notes.trim()
        const ref = await addDoc(collection(db, `stores/${store.id}/production_orders`), data)
        newOrders.push({ id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() } as ProductionOrder & { _comboId?: string })
      }

      if (newOrders.length > 0) {
        setOrders(prev => [...newOrders, ...prev])
      }
      setShowForm(false)
      resetForm()
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const handleComplete = async (order: ProductionOrder & { _comboId?: string | null }) => {
    if (!store || !firebaseUser) return
    setCompleting(order.id)
    try {
      const product = products.find(p => p.id === order.productId)
      if (!product) { setCompleting(null); return }

      const productRef = doc(db, `stores/${store.id}/products`, order.productId)
      const comboId = order._comboId || undefined

      if (comboId && product.combinations) {
        const updatedCombinations = product.combinations.map(c => {
          if (c.id !== comboId) return c
          const cws = { ...(c.warehouseStock || {}) }
          if (order.warehouseId) cws[order.warehouseId] = (cws[order.warehouseId] || 0) + order.quantity
          return { ...c, stock: c.stock + order.quantity, warehouseStock: cws }
        })
        const newTotal = updatedCombinations.reduce((s, c) => s + c.stock, 0)
        const updateData: Record<string, unknown> = { combinations: updatedCombinations, stock: newTotal }
        if (order.warehouseId) updateData[`warehouseStock.${order.warehouseId}`] = newTotal
        await updateDoc(productRef, updateData)
      } else {
        const newStock = (product.stock ?? 0) + order.quantity
        const updateData: Record<string, unknown> = { stock: newStock }
        if (order.warehouseId) updateData[`warehouseStock.${order.warehouseId}`] = newStock
        await updateDoc(productRef, updateData)
      }

      // Stock movement
      await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
        productId: order.productId,
        productName: order.productName,
        variationName: order.variationName || undefined,
        optionValue: order.optionValue || undefined,
        type: 'production',
        quantity: order.quantity,
        previousStock: product.stock ?? 0,
        newStock: (product.stock ?? 0) + order.quantity,
        referenceType: 'production_order',
        referenceId: order.id,
        reason: `Produccion completada${order.notes ? ` - ${order.notes}` : ''}`,
        warehouseId: order.warehouseId || undefined,
        warehouseName: order.warehouseName || undefined,
        createdBy: firebaseUser.uid,
        createdAt: Timestamp.now(),
      })

      // Update order status
      await updateDoc(doc(db, `stores/${store.id}/production_orders`, order.id), {
        status: 'completed', completedAt: Timestamp.now(), updatedAt: Timestamp.now(),
      })

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' as const, completedAt: new Date() } : o))
    } catch (err) {
      console.error(err)
    }
    setCompleting(null)
  }

  const handleCancel = async (orderId: string) => {
    if (!store) return
    try {
      await updateDoc(doc(db, `stores/${store.id}/production_orders`, orderId), {
        status: 'cancelled', updatedAt: Timestamp.now(),
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o))
    } catch (err) {
      console.error(err)
    }
  }

  const statusStyles: Record<string, string> = {
    planned: 'bg-amber-50 text-amber-600',
    in_progress: 'bg-[#F0F9FF] text-[#0284C7]',
    completed: 'bg-green-50 text-green-600',
    cancelled: 'bg-[#F1F5F9] text-[#A9B6C6]',
  }
  const statusLabels: Record<string, string> = {
    planned: 'Planificada',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-6 w-6 border-2 border-[#D8E2EC] border-t-[#1e3a5f]" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1e3a5f]">Produccion</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">Registra produccion para reponer stock</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm() }}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium">
          {showForm ? 'Cancelar' : '+ Nueva produccion'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 space-y-4 animate-[slideDown_0.2s_ease-out]">
          <h3 className="text-sm font-medium text-[#1e3a5f]">Nueva orden de produccion</h3>

          {/* Product selector */}
          <div>
            <label className="text-xs text-[#8898AA] mb-1 block">Producto</label>
            {!selectedProduct ? (
              <>
                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar producto..." autoFocus
                  className="w-full px-3 py-2 border border-[#E6EBF1] rounded-lg text-sm mb-2 focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                <div className="max-h-48 overflow-y-auto border border-[#E6EBF1] rounded-lg divide-y divide-gray-50">
                  {filteredProducts.slice(0, 10).map(p => (
                    <button key={p.id} onClick={() => { setSelectedProductId(p.id); setProductSearch('') }}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#F6F9FC] transition-colors text-left">
                      {p.image ? <img src={p.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        : <div className="w-7 h-7 rounded bg-[#F1F5F9] flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm text-[#1e3a5f] truncate">{p.name}</p>
                        <p className="text-[11px] text-[#A9B6C6]">{p.sku || 'Sin SKU'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-[#F6F9FC] rounded-lg">
                {selectedProduct.image ? <img src={selectedProduct.image} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  : <div className="w-9 h-9 rounded-lg bg-[#E1E8EF]" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1e3a5f]">{selectedProduct.name}</p>
                  <p className="text-xs text-[#A9B6C6]">{selectedProduct.sku || 'Sin SKU'}</p>
                </div>
                <button onClick={() => { setSelectedProductId(''); setComboQuantities({}) }}
                  className="text-xs text-[#A9B6C6] hover:text-[#425466] px-2 py-1 hover:bg-[#E1E8EF] rounded-md">Cambiar</button>
              </div>
            )}
          </div>

          {/* Combinations list with quantity per combo */}
          {selectedProduct && hasCombos && (
            <div className="animate-[slideDown_0.15s_ease-out] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#8898AA]">Combinaciones a producir</label>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setComboQuantities({})}
                    disabled={comboQtyTotal === 0}
                    className="text-[11px] text-[#A9B6C6] hover:text-[#425466] disabled:opacity-40">
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Combo search */}
              {selectedProduct.combinations!.length > 6 && (
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A9B6C6]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input type="text" value={comboSearch} onChange={e => setComboSearch(e.target.value)}
                    placeholder="Buscar combinacion..."
                    className="w-full pl-8 pr-3 py-1.5 border border-[#E6EBF1] rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                </div>
              )}

              <div className="border border-[#E6EBF1] rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {selectedProduct.combinations!
                    .filter(c => c.available)
                    .filter(c => {
                      if (!comboSearch) return true
                      const label = Object.values(c.options).join(' ').toLowerCase()
                      return label.includes(comboSearch.toLowerCase())
                    })
                    .map(combo => {
                      const label = Object.values(combo.options).join(' / ')
                      const qty = parseInt(comboQuantities[combo.id]) || 0
                      return (
                        <div key={combo.id} className={`px-3 py-2 flex items-center justify-between gap-3 ${qty > 0 ? 'bg-[#F0F9FF]/30' : ''}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-[#1e3a5f] truncate">{label}</p>
                            <p className="text-[11px] text-[#A9B6C6]">Stock actual: {combo.stock}{combo.sku ? ` · ${combo.sku}` : ''}</p>
                          </div>
                          <input type="number" min="0"
                            value={comboQuantities[combo.id] || ''}
                            onChange={e => setComboQuantities(prev => ({ ...prev, [combo.id]: e.target.value }))}
                            placeholder="0"
                            className={`w-20 px-2.5 py-1.5 border rounded-lg text-sm text-right focus:ring-1 focus:ring-[#1e3a5f]/10 ${
                              qty > 0 ? 'border-blue-300 bg-white' : 'border-[#E6EBF1]'
                            }`} />
                        </div>
                      )
                    })}
                </div>
              </div>
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-[#A9B6C6]">
                  {(() => {
                    const n = selectedProduct.combinations!.filter(c => (parseInt(comboQuantities[c.id]) || 0) > 0).length
                    return `${n} combinacion${n === 1 ? '' : 'es'} seleccionada${n === 1 ? '' : 's'}`
                  })()}
                </span>
                <span className="text-[#425466] font-medium">Total: {comboQtyTotal} uds</span>
              </div>
            </div>
          )}

          {/* Quantity (simple products only), warehouse, notes */}
          {selectedProduct && (
            <div className={`grid grid-cols-1 ${hasCombos ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 animate-[slideDown_0.15s_ease-out]`}>
              {!hasCombos && (
                <div>
                  <label className="text-xs text-[#8898AA] mb-1 block">Cantidad a producir</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                </div>
              )}
              <div>
                <label className="text-xs text-[#8898AA] mb-1 block">Almacen destino</label>
                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' (Principal)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8898AA] mb-1 block">Notas</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional"
                  className="w-full px-3 py-2 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleSave}
              disabled={saving || !selectedProductId || (hasCombos ? comboQtyTotal <= 0 : (!quantity || parseInt(quantity) <= 0))}
              className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
              {saving ? 'Guardando...' : hasCombos
                ? `Crear ${selectedProduct?.combinations!.filter(c => (parseInt(comboQuantities[c.id]) || 0) > 0).length || ''} orden${(selectedProduct?.combinations!.filter(c => (parseInt(comboQuantities[c.id]) || 0) > 0).length || 0) === 1 ? '' : 'es'}`.trim()
                : 'Crear orden'}
            </button>
          </div>
        </div>
      )}

      {/* Orders list */}
      <div className="bg-white rounded-[14px] border border-[#E6EBF1] overflow-hidden">
        {orders.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-[#A9B6C6]">Sin ordenes de produccion</p>
            <p className="text-xs text-[#C3CFDB] mt-1">Crea una orden para reponer stock de productos que produces internamente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map(order => (
              <div key={order.id} className="px-4 py-3 hover:bg-[#F6F9FC]/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusStyles[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-[#1e3a5f] truncate">
                        {order.productName}
                        {order.optionValue && <span className="text-[#A9B6C6]"> — {order.optionValue}</span>}
                      </p>
                      <p className="text-xs text-[#A9B6C6]">
                        {order.quantity} uds
                        {order.warehouseName && ` · ${order.warehouseName}`}
                        {order.notes && ` · ${order.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-[11px] text-[#A9B6C6]">
                      {(order.createdAt as Date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </p>
                    {order.status === 'planned' && (
                      <>
                        <button onClick={() => handleComplete(order as ProductionOrder & { _comboId?: string | null })}
                          disabled={completing === order.id}
                          className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors disabled:opacity-40">
                          {completing === order.id ? '...' : 'Completar'}
                        </button>
                        <button onClick={() => handleCancel(order.id)}
                          className="px-2 py-1 text-xs text-[#A9B6C6] hover:text-red-500 rounded-md hover:bg-[#F1F5F9] transition-colors">
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
