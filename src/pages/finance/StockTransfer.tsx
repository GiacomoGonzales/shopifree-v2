import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product, Warehouse } from '../../types'

export default function StockTransfer() {
  const { store, firebaseUser } = useAuth()
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [quantity, setQuantity] = useState('')

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        const [pSnap, wSnap] = await Promise.all([
          getDocs(query(collection(db, `stores/${store.id}/products`), orderBy('name'))),
          getDocs(query(collection(db, `stores/${store.id}/warehouses`), orderBy('createdAt'))),
        ])
        setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
        setWarehouses(wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)))
      } catch { /* */ }
      setLoading(false)
    }
    fetch()
  }, [store])

  const tracked = products.filter(p => p.trackStock && p.active !== false)
  const filtered = productSearch
    ? tracked.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))
    : tracked

  const selectedProduct = tracked.find(p => p.id === selectedProductId)
  const ws = selectedProduct ? (selectedProduct as Product & { warehouseStock?: Record<string, number> }).warehouseStock : undefined

  const availableInFrom = useMemo(() => {
    if (!ws || !fromWarehouseId) return 0
    return ws[fromWarehouseId] || 0
  }, [ws, fromWarehouseId])

  const qtyNum = parseInt(quantity) || 0
  const isValid = selectedProductId && fromWarehouseId && toWarehouseId && fromWarehouseId !== toWarehouseId && qtyNum > 0 && qtyNum <= availableInFrom

  const handleTransfer = async () => {
    if (!store || !firebaseUser || !selectedProduct || !isValid) return
    setSaving(true)
    try {
      const ref = doc(db, `stores/${store.id}/products`, selectedProductId)
      const currentWs = { ...(ws || {}) }
      const fromW = warehouses.find(w => w.id === fromWarehouseId)
      const toW = warehouses.find(w => w.id === toWarehouseId)

      currentWs[fromWarehouseId] = (currentWs[fromWarehouseId] || 0) - qtyNum
      currentWs[toWarehouseId] = (currentWs[toWarehouseId] || 0) + qtyNum

      await updateDoc(ref, { warehouseStock: currentWs })

      // Stock movement - salida
      await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
        productId: selectedProductId,
        productName: selectedProduct.name,
        type: 'transfer',
        quantity: -qtyNum,
        previousStock: selectedProduct.stock ?? 0,
        newStock: selectedProduct.stock ?? 0,
        reason: `Transferencia a ${toW?.name || 'otro almacen'}`,
        warehouseId: fromWarehouseId,
        warehouseName: fromW?.name,
        createdBy: firebaseUser.uid,
        createdAt: Timestamp.now(),
      })

      // Stock movement - entrada
      await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
        productId: selectedProductId,
        productName: selectedProduct.name,
        type: 'transfer',
        quantity: qtyNum,
        previousStock: selectedProduct.stock ?? 0,
        newStock: selectedProduct.stock ?? 0,
        reason: `Transferencia desde ${fromW?.name || 'otro almacen'}`,
        warehouseId: toWarehouseId,
        warehouseName: toW?.name,
        createdBy: firebaseUser.uid,
        createdAt: Timestamp.now(),
      })

      setSaved(true)
      setTimeout(() => {
        setSelectedProductId('')
        setFromWarehouseId('')
        setToWarehouseId('')
        setQuantity('')
        setProductSearch('')
        setSaved(false)
      }, 1500)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" /></div>
  }

  if (warehouses.length < 2) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Transferencia de stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mover stock entre almacenes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-16 text-center">
          <p className="text-sm text-gray-400">Necesitas al menos 2 almacenes para hacer transferencias</p>
          <button onClick={() => navigate(localePath('/finance/warehouses'))}
            className="mt-3 text-xs text-[#1e3a5f] hover:text-[#2d6cb5] font-medium">
            Ir a Almacenes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Transferencia de stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mover stock entre almacenes</p>
        </div>
        <button onClick={() => navigate(localePath('/finance/inventory'))}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          Volver
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/60 p-5 space-y-5">
        {/* Product selector */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Producto</label>
          {!selectedProduct ? (
            <div className="space-y-2">
              <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="Buscar producto..." autoFocus
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                {filtered.slice(0, 15).map(p => (
                  <button key={p.id} onClick={() => { setSelectedProductId(p.id); setProductSearch('') }}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
                    {p.image ? <img src={p.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                      : <div className="w-7 h-7 rounded bg-gray-100 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-400">Stock: {p.stock ?? 0}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {selectedProduct.image ? <img src={selectedProduct.image} alt="" className="w-9 h-9 rounded-lg object-cover" />
                : <div className="w-9 h-9 rounded-lg bg-gray-200" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-xs text-gray-400">Stock total: {selectedProduct.stock ?? 0}</p>
              </div>
              <button onClick={() => { setSelectedProductId(''); setFromWarehouseId(''); setToWarehouseId(''); setQuantity('') }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-200 rounded-md">Cambiar</button>
            </div>
          )}
        </div>

        {/* Warehouses + quantity */}
        {selectedProduct && (
          <div className="space-y-4 animate-[slideDown_0.15s_ease-out]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {/* From */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Desde</label>
                <select value={fromWarehouseId} onChange={e => { setFromWarehouseId(e.target.value); setQuantity('') }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                  <option value="">Seleccionar almacen</option>
                  {warehouses.map(w => {
                    const stock = ws?.[w.id] || 0
                    return <option key={w.id} value={w.id}>{w.name} ({stock} uds)</option>
                  })}
                </select>
              </div>

              {/* Arrow */}
              <div className="hidden sm:flex items-center justify-center pb-1">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>

              {/* To */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Hacia</label>
                <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                  <option value="">Seleccionar almacen</option>
                  {warehouses.filter(w => w.id !== fromWarehouseId).map(w => {
                    const stock = ws?.[w.id] || 0
                    return <option key={w.id} value={w.id}>{w.name} ({stock} uds)</option>
                  })}
                </select>
              </div>
            </div>

            {/* Quantity */}
            {fromWarehouseId && toWarehouseId && (
              <div className="animate-[slideDown_0.15s_ease-out]">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1.5 block">Cantidad a transferir</label>
                    <input type="number" min="1" max={availableInFrom} value={quantity} onChange={e => setQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                  </div>
                  <div className="text-right pt-5">
                    <p className="text-xs text-gray-400">Disponible: <span className="font-medium text-gray-700">{availableInFrom}</span></p>
                  </div>
                </div>
                {qtyNum > availableInFrom && availableInFrom > 0 && (
                  <p className="text-xs text-red-500 mt-1">No puedes transferir mas de lo disponible</p>
                )}
              </div>
            )}

            {/* Save */}
            <div className="flex justify-end pt-2">
              <button onClick={handleTransfer} disabled={saving || saved || !isValid}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  saved ? 'bg-green-500 text-white' : 'bg-[#1e3a5f] text-white hover:bg-[#2d6cb5]'
                }`}>
                {saving ? 'Transfiriendo...' : saved ? 'Transferencia completada' : 'Transferir'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
