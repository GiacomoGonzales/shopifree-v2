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
  const [selectedComboId, setSelectedComboId] = useState('')
  const [quantity, setQuantity] = useState('')
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
    setSelectedProductId(''); setSelectedComboId(''); setQuantity(''); setNotes(''); setProductSearch('')
  }

  const handleSave = async () => {
    if (!store || !firebaseUser || !selectedProductId || !quantity || parseInt(quantity) <= 0) return
    setSaving(true)
    try {
      const product = products.find(p => p.id === selectedProductId)!
      const warehouse = warehouses.find(w => w.id === warehouseId)
      const combo = hasCombos ? product.combinations!.find(c => c.id === selectedComboId) : null
      const comboLabel = combo ? Object.values(combo.options).join(' / ') : null

      const data = {
        productId: selectedProductId,
        productName: product.name,
        variationName: comboLabel ? Object.keys(combo!.options).join(' / ') : undefined,
        optionValue: comboLabel,
        quantity: parseInt(quantity),
        status: 'planned' as const,
        warehouseId: warehouseId || undefined,
        warehouseName: warehouse?.name || undefined,
        notes: notes.trim() || undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        _comboId: combo?.id || undefined,
      }
      const ref = await addDoc(collection(db, `stores/${store.id}/production_orders`), data)
      setOrders(prev => [{ id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() } as ProductionOrder & { _comboId?: string }, ...prev])
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
          if (c.id === comboId) return { ...c, stock: c.stock + order.quantity }
          return c
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
    in_progress: 'bg-blue-50 text-blue-600',
    completed: 'bg-green-50 text-green-600',
    cancelled: 'bg-gray-100 text-gray-400',
  }
  const statusLabels: Record<string, string> = {
    planned: 'Planificada',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Produccion</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra produccion para reponer stock</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm() }}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium">
          {showForm ? 'Cancelar' : '+ Nueva produccion'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-4 animate-[slideDown_0.2s_ease-out]">
          <h3 className="text-sm font-medium text-gray-900">Nueva orden de produccion</h3>

          {/* Product selector */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Producto</label>
            {!selectedProduct ? (
              <>
                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar producto..." autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                  {filteredProducts.slice(0, 10).map(p => (
                    <button key={p.id} onClick={() => { setSelectedProductId(p.id); setProductSearch('') }}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
                      {p.image ? <img src={p.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        : <div className="w-7 h-7 rounded bg-gray-100 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-400">{p.sku || 'Sin SKU'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {selectedProduct.image ? <img src={selectedProduct.image} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  : <div className="w-9 h-9 rounded-lg bg-gray-200" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-400">{selectedProduct.sku || 'Sin SKU'}</p>
                </div>
                <button onClick={() => { setSelectedProductId(''); setSelectedComboId('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-200 rounded-md">Cambiar</button>
              </div>
            )}
          </div>

          {/* Combination selector */}
          {selectedProduct && hasCombos && (
            <div className="animate-[slideDown_0.15s_ease-out]">
              <label className="text-xs text-gray-500 mb-1.5 block">Combinacion</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedProduct.combinations!.filter(c => c.available).map(combo => {
                  const label = Object.values(combo.options).join(' / ')
                  return (
                    <button key={combo.id} type="button"
                      onClick={() => setSelectedComboId(combo.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                        selectedComboId === combo.id ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {label}
                      <span className="block text-[10px] mt-0.5 opacity-60">Stock: {combo.stock}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity, warehouse, notes */}
          {selectedProduct && (!hasCombos || selectedComboId) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-[slideDown_0.15s_ease-out]">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cantidad a producir</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Almacen destino</label>
                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' (Principal)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving || !selectedProductId || !quantity || parseInt(quantity) <= 0 || (hasCombos && !selectedComboId)}
              className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
              {saving ? 'Guardando...' : 'Crear orden'}
            </button>
          </div>
        </div>
      )}

      {/* Orders list */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {orders.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">Sin ordenes de produccion</p>
            <p className="text-xs text-gray-300 mt-1">Crea una orden para reponer stock de productos que produces internamente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map(order => (
              <div key={order.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusStyles[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {order.productName}
                        {order.optionValue && <span className="text-gray-400"> — {order.optionValue}</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.quantity} uds
                        {order.warehouseName && ` · ${order.warehouseName}`}
                        {order.notes && ` · ${order.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-[11px] text-gray-400">
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
                          className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 transition-colors">
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
