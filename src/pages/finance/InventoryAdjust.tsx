import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, Timestamp, where, limit as fbLimit } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product } from '../../types'

const REASONS = [
  'Conteo fisico',
  'Dano o merma',
  'Devolucion',
  'Correccion de error',
  'Robo o perdida',
  'Otro',
]

export default function InventoryAdjust() {
  const { store, firebaseUser } = useAuth()
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedId = searchParams.get('product')

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form
  const [selectedProductId, setSelectedProductId] = useState(preselectedId || '')
  const [search, setSearch] = useState('')
  const [newStock, setNewStock] = useState('')
  const [reason, setReason] = useState('Conteo fisico')
  const [notes, setNotes] = useState('')

  // Variant adjustment
  const [selectedVariantKey, setSelectedVariantKey] = useState('')

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(query(collection(db, `stores/${store.id}/products`), orderBy('name')))
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
      } catch {
        setProducts([])
      }
      setLoading(false)
    }
    fetch()
  }, [store])

  const trackedProducts = products.filter(p => p.trackStock && p.active !== false)
  const filteredProducts = search
    ? trackedProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
    : trackedProducts

  const selectedProduct = trackedProducts.find(p => p.id === selectedProductId)
  const hasVariants = selectedProduct?.hasVariations && selectedProduct.variations && selectedProduct.variations.length > 0

  // Get current stock for selected product/variant
  const getCurrentStock = () => {
    if (!selectedProduct) return 0
    if (selectedVariantKey && hasVariants) {
      for (const v of selectedProduct.variations!) {
        const opt = v.options.find(o => `${v.id}-${o.id}` === selectedVariantKey)
        if (opt) return opt.stock ?? 0
      }
      return 0
    }
    return selectedProduct.stock ?? 0
  }

  const getVariantLabel = () => {
    if (!selectedProduct || !selectedVariantKey || !hasVariants) return ''
    for (const v of selectedProduct.variations!) {
      const opt = v.options.find(o => `${v.id}-${o.id}` === selectedVariantKey)
      if (opt) return `${v.name}: ${opt.value}`
    }
    return ''
  }

  const currentStock = getCurrentStock()
  const newStockNum = newStock === '' ? null : parseInt(newStock)
  const delta = newStockNum !== null ? newStockNum - currentStock : 0

  const handleSave = async () => {
    if (!store || !selectedProduct || !firebaseUser || newStockNum === null || newStockNum === currentStock) return
    setSaving(true)
    try {
      const productRef = doc(db, `stores/${store.id}/products`, selectedProduct.id)

      // Find default warehouse to update warehouseStock too
      let defaultWarehouseId: string | null = null
      try {
        const wSnap = await getDocs(query(
          collection(db, `stores/${store.id}/warehouses`),
          where('isDefault', '==', true),
          fbLimit(1)
        ))
        if (!wSnap.empty) defaultWarehouseId = wSnap.docs[0].id
      } catch { /* no warehouses yet */ }

      if (selectedVariantKey && hasVariants) {
        // Update variant stock
        const updatedVariations = selectedProduct.variations!.map(v => ({
          ...v,
          options: v.options.map(o => {
            if (`${v.id}-${o.id}` === selectedVariantKey) {
              return { ...o, stock: newStockNum }
            }
            return o
          })
        }))
        const totalStock = updatedVariations.reduce((sum, v) => sum + v.options.reduce((s, o) => s + (o.stock ?? 0), 0), 0)
        const updateData: Record<string, unknown> = { variations: updatedVariations, stock: totalStock }
        if (defaultWarehouseId) {
          updateData[`warehouseStock.${defaultWarehouseId}`] = totalStock
        }
        await updateDoc(productRef, updateData)
      } else {
        const updateData: Record<string, unknown> = { stock: newStockNum }
        if (defaultWarehouseId) {
          updateData[`warehouseStock.${defaultWarehouseId}`] = newStockNum
        }
        await updateDoc(productRef, updateData)
      }

      // Create stock movement
      await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        variationName: selectedVariantKey && hasVariants ? getVariantLabel().split(': ')[0] : null,
        optionValue: selectedVariantKey && hasVariants ? getVariantLabel().split(': ')[1] : null,
        type: 'adjustment',
        quantity: delta,
        previousStock: currentStock,
        newStock: newStockNum,
        referenceType: 'manual',
        reason: `${reason}${notes ? ` - ${notes}` : ''}`,
        createdBy: firebaseUser.uid,
        createdAt: Timestamp.now(),
      })

      setSaved(true)
      // Reset form after a moment
      setTimeout(() => {
        setSelectedProductId('')
        setSelectedVariantKey('')
        setNewStock('')
        setNotes('')
        setSaved(false)
      }, 1500)
    } catch (err) {
      console.error('Error adjusting stock:', err)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#D8E2EC] border-t-[#1e3a5f]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1e3a5f]">Ajuste de inventario</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">Corrige el stock de un producto manualmente</p>
        </div>
        <button
          onClick={() => navigate(localePath('/finance/inventory'))}
          className="px-3 py-2 text-sm text-[#8898AA] hover:text-[#425466] hover:bg-[#F1F5F9] rounded-lg transition-colors"
        >
          Volver
        </button>
      </div>

      <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-5 space-y-5 animate-[slideDown_0.2s_ease-out]">
        {/* Product selector */}
        <div>
          <label className="text-xs text-[#8898AA] mb-1.5 block">Producto</label>
          {!selectedProduct ? (
            <div className="space-y-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9B6C6]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar producto por nombre o SKU..."
                  className="w-full pl-9 pr-4 py-2.5 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-[#E6EBF1] divide-y divide-gray-50">
                {filteredProducts.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[#A9B6C6] text-center">Sin productos con control de stock</p>
                ) : (
                  filteredProducts.slice(0, 20).map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProductId(p.id); setSearch(''); setSelectedVariantKey(''); setNewStock('') }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F6F9FC] transition-colors text-left"
                    >
                      {p.image ? (
                        <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1e3a5f] truncate">{p.name}</p>
                        <p className="text-xs text-[#A9B6C6]">{p.sku || 'Sin SKU'}</p>
                      </div>
                      <p className="text-sm text-[#8898AA] flex-shrink-0">{p.stock ?? 0} uds</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-[#F6F9FC] rounded-lg">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#E1E8EF]" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1e3a5f]">{selectedProduct.name}</p>
                <p className="text-xs text-[#A9B6C6]">{selectedProduct.sku || 'Sin SKU'}</p>
              </div>
              <button
                onClick={() => { setSelectedProductId(''); setSelectedVariantKey(''); setNewStock('') }}
                className="text-xs text-[#A9B6C6] hover:text-[#425466] px-2 py-1 hover:bg-[#E1E8EF] rounded-md transition-colors"
              >
                Cambiar
              </button>
            </div>
          )}
        </div>

        {/* Variant selector */}
        {selectedProduct && hasVariants && (
          <div className="animate-[slideDown_0.15s_ease-out]">
            <label className="text-xs text-[#8898AA] mb-1.5 block">Variante</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => { setSelectedVariantKey(''); setNewStock('') }}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  !selectedVariantKey ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]' : 'border-[#E6EBF1] text-[#8898AA] hover:border-[#D8E2EC]'
                }`}
              >
                Producto general
                <span className="block text-[10px] mt-0.5 opacity-60">{selectedProduct.stock ?? 0} uds</span>
              </button>
              {selectedProduct.variations!.map(v =>
                v.options.map(o => (
                  <button
                    key={`${v.id}-${o.id}`}
                    onClick={() => { setSelectedVariantKey(`${v.id}-${o.id}`); setNewStock('') }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                      selectedVariantKey === `${v.id}-${o.id}` ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]' : 'border-[#E6EBF1] text-[#8898AA] hover:border-[#D8E2EC]'
                    }`}
                  >
                    {v.name}: {o.value}
                    <span className="block text-[10px] mt-0.5 opacity-60">{o.stock ?? 0} uds</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Stock adjustment */}
        {selectedProduct && (
          <div className="animate-[slideDown_0.15s_ease-out] space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Current stock */}
              <div>
                <label className="text-xs text-[#8898AA] mb-1.5 block">Stock actual</label>
                <div className="px-3 py-2.5 bg-[#F6F9FC] rounded-lg text-sm font-medium text-[#1e3a5f]">
                  {currentStock}
                </div>
              </div>

              {/* New stock */}
              <div>
                <label className="text-xs text-[#8898AA] mb-1.5 block">Nuevo stock</label>
                <input
                  type="number"
                  value={newStock}
                  onChange={e => setNewStock(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                  autoFocus
                />
              </div>

              {/* Difference */}
              <div>
                <label className="text-xs text-[#8898AA] mb-1.5 block">Diferencia</label>
                <div className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                  delta > 0 ? 'bg-green-50 text-green-600' :
                  delta < 0 ? 'bg-red-50 text-red-500' :
                  'bg-[#F6F9FC] text-[#A9B6C6]'
                }`}>
                  {delta > 0 ? `+${delta}` : delta === 0 ? '0' : delta}
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#8898AA] mb-1.5 block">Motivo</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                >
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8898AA] mb-1.5 block">Nota (opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalle adicional..."
                  className="w-full px-3 py-2.5 border border-[#E6EBF1] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                />
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving || saved || newStockNum === null || newStockNum === currentStock}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  saved
                    ? 'bg-green-500 text-white'
                    : 'bg-[#1e3a5f] text-white hover:bg-[#2d6cb5]'
                }`}
              >
                {saving ? 'Guardando...' : saved ? 'Ajuste guardado' : 'Guardar ajuste'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
