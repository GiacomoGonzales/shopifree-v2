import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product, Warehouse, VariantCombination } from '../../types'

/**
 * StockEditModal — Quick inline editing of stock for a single product.
 *
 * Why this exists:
 *   Until now, the only way to change stock quantities was to go to
 *   Finance → Purchases and register a whole purchase order, OR to Finance
 *   → Inventory for adjustments. A merchant who just wants to fix the
 *   number of units in stock for "Talla M / Negro" shouldn't have to leave
 *   the products page.
 *
 *   This modal lets them tap "Stock" on any product card, type the new
 *   absolute quantity per combination (or just one field for simple
 *   products), and save. Each change is logged as a stock_movement with
 *   type='adjustment' so the audit trail in Finance → Stock Movements stays
 *   complete.
 *
 * Multi-warehouse handling:
 *   - 0 or 1 warehouses → edit the global stock directly
 *   - 2+ warehouses → show a warehouse picker; edits apply to that warehouse
 *     while preserving the stock in the other warehouses
 */

interface StockEditModalProps {
  storeId: string
  userId: string
  product: Product
  onClose: () => void
  onSaved: (updated: Product) => void
}

type ProductWithWarehouse = Product & { warehouseStock?: Record<string, number> }

function hasCombinations(product: Product): boolean {
  return Array.isArray(product.combinations) && product.combinations.length > 0
}

function comboLabel(combo: VariantCombination): string {
  return Object.values(combo.options || {}).join(' / ') || combo.id
}

export default function StockEditModal({
  storeId,
  userId,
  product: productProp,
  onClose,
  onSaved,
}: StockEditModalProps) {
  const { t } = useTranslation('dashboard')
  // We never mutate the product inside the modal — saves call onSaved with a
  // freshly built object and the parent updates its own state. Casting once
  // keeps the warehouseStock field accessible.
  const product = productProp as ProductWithWarehouse
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [loadingWarehouses, setLoadingWarehouses] = useState(true)

  // Map of combinationId → string input value. Strings (not numbers) so the
  // user can clear the field while typing without it snapping to 0.
  const [comboInputs, setComboInputs] = useState<Record<string, string>>({})
  const [simpleInput, setSimpleInput] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load warehouses once. We need them to know whether to show a picker and
  // to record warehouseId / warehouseName in stock_movements.
  useEffect(() => {
    let cancelled = false
    async function loadWarehouses() {
      try {
        const snap = await getDocs(
          query(collection(db, `stores/${storeId}/warehouses`), orderBy('createdAt'))
        )
        if (cancelled) return
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))
        setWarehouses(list)
        // Pick the default warehouse if one exists, otherwise the first one
        const def = list.find(w => w.isDefault) || list[0]
        if (def) setSelectedWarehouseId(def.id)
      } catch (err) {
        console.error('[StockEditModal] failed to load warehouses:', err)
      } finally {
        if (!cancelled) setLoadingWarehouses(false)
      }
    }
    loadWarehouses()
    return () => { cancelled = true }
  }, [storeId])

  // Initialize input values from the product. For multi-warehouse stores,
  // show stock for the SELECTED warehouse so edits apply where the user
  // intends. For single/no-warehouse stores, show the global stock.
  useEffect(() => {
    if (hasCombinations(product)) {
      const next: Record<string, string> = {}
      for (const c of product.combinations || []) {
        if (warehouses.length > 1 && selectedWarehouseId) {
          next[c.id] = String(c.warehouseStock?.[selectedWarehouseId] ?? 0)
        } else {
          next[c.id] = String(c.stock ?? 0)
        }
      }
      setComboInputs(next)
    } else {
      if (warehouses.length > 1 && selectedWarehouseId) {
        setSimpleInput(String(product.warehouseStock?.[selectedWarehouseId] ?? 0))
      } else {
        setSimpleInput(String(product.stock ?? 0))
      }
    }
  }, [product, selectedWarehouseId, warehouses.length])

  const isMultiWarehouse = warehouses.length > 1

  // Net total preview (so the user sees what product.stock will become).
  const previewTotal = useMemo(() => {
    if (hasCombinations(product)) {
      // Need to compute the projected combinations[].stock per combo
      let total = 0
      for (const c of product.combinations || []) {
        const inputStr = comboInputs[c.id] ?? '0'
        const inputNum = parseInt(inputStr) || 0
        if (isMultiWarehouse && selectedWarehouseId) {
          // The combo's other-warehouse stock stays the same; only the
          // selected warehouse's amount changes.
          const otherWh = Object.entries(c.warehouseStock || {})
            .filter(([wid]) => wid !== selectedWarehouseId)
            .reduce((s, [, qty]) => s + (qty || 0), 0)
          total += otherWh + inputNum
        } else {
          total += inputNum
        }
      }
      return total
    }
    const inputNum = parseInt(simpleInput) || 0
    if (isMultiWarehouse && selectedWarehouseId) {
      const otherWh = Object.entries(product.warehouseStock || {})
        .filter(([wid]) => wid !== selectedWarehouseId)
        .reduce((s, [, qty]) => s + (qty || 0), 0)
      return otherWh + inputNum
    }
    return inputNum
  }, [product, comboInputs, simpleInput, selectedWarehouseId, isMultiWarehouse])

  const handleSave = async () => {
    if (saving) return
    setError(null)
    setSaving(true)

    const warehouseInUse = isMultiWarehouse && selectedWarehouseId
      ? warehouses.find(w => w.id === selectedWarehouseId) || null
      : warehouses.length === 1
        ? warehouses[0]
        : null

    try {
      const movements: Record<string, unknown>[] = []
      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (hasCombinations(product)) {
        const newCombinations: VariantCombination[] = (product.combinations || []).map(c => ({ ...c }))
        let newTotalStock = 0
        const newWarehouseStock: Record<string, number> = {}

        for (const combo of newCombinations) {
          const inputStr = comboInputs[combo.id] ?? '0'
          const newQty = Math.max(0, parseInt(inputStr) || 0)

          if (warehouseInUse) {
            const prevWh = combo.warehouseStock?.[warehouseInUse.id] ?? 0
            if (newQty !== prevWh) {
              const nextWs = { ...(combo.warehouseStock || {}), [warehouseInUse.id]: newQty }
              combo.warehouseStock = nextWs
              // combo.stock is the sum across warehouses, so recompute
              combo.stock = Object.values(nextWs).reduce((s, n) => s + (n || 0), 0)

              movements.push({
                productId: product.id,
                productName: product.name,
                combinationId: combo.id,
                combinationLabel: comboLabel(combo),
                type: 'adjustment',
                quantity: newQty - prevWh,
                previousStock: prevWh,
                newStock: newQty,
                warehouseId: warehouseInUse.id,
                warehouseName: warehouseInUse.name,
                referenceType: 'manual',
                reason: t('products.stockEdit.movementReason', { defaultValue: 'Edicion rapida desde Productos' }),
                createdBy: userId,
                createdAt: Timestamp.now(),
              })
            }
          } else {
            // No warehouse model — edit combo.stock directly
            const prev = combo.stock ?? 0
            if (newQty !== prev) {
              combo.stock = newQty
              movements.push({
                productId: product.id,
                productName: product.name,
                combinationId: combo.id,
                combinationLabel: comboLabel(combo),
                type: 'adjustment',
                quantity: newQty - prev,
                previousStock: prev,
                newStock: newQty,
                referenceType: 'manual',
                reason: t('products.stockEdit.movementReason', { defaultValue: 'Edicion rapida desde Productos' }),
                createdBy: userId,
                createdAt: Timestamp.now(),
              })
            }
          }

          newTotalStock += combo.stock || 0
          // Aggregate warehouseStock at the product level (mirrors the
          // recompute logic in firebase.ts decrementCombinationStock).
          if (combo.warehouseStock) {
            for (const [wid, qty] of Object.entries(combo.warehouseStock)) {
              newWarehouseStock[wid] = (newWarehouseStock[wid] || 0) + (qty || 0)
            }
          }
        }

        updateData.combinations = newCombinations
        updateData.stock = newTotalStock
        if (Object.keys(newWarehouseStock).length > 0) {
          updateData.warehouseStock = newWarehouseStock
        }
      } else {
        // Simple product (no combinations)
        const newQty = Math.max(0, parseInt(simpleInput) || 0)

        if (warehouseInUse) {
          const prevWs = { ...(product.warehouseStock || {}) }
          const prevWh = prevWs[warehouseInUse.id] ?? 0
          if (newQty !== prevWh) {
            const nextWs = { ...prevWs, [warehouseInUse.id]: newQty }
            updateData.warehouseStock = nextWs
            updateData.stock = Object.values(nextWs).reduce((s, n) => s + (n || 0), 0)

            movements.push({
              productId: product.id,
              productName: product.name,
              type: 'adjustment',
              quantity: newQty - prevWh,
              previousStock: prevWh,
              newStock: newQty,
              warehouseId: warehouseInUse.id,
              warehouseName: warehouseInUse.name,
              referenceType: 'manual',
              reason: t('products.stockEdit.movementReason', { defaultValue: 'Edicion rapida desde Productos' }),
              createdBy: userId,
              createdAt: Timestamp.now(),
            })
          }
        } else {
          const prev = product.stock ?? 0
          if (newQty !== prev) {
            updateData.stock = newQty
            movements.push({
              productId: product.id,
              productName: product.name,
              type: 'adjustment',
              quantity: newQty - prev,
              previousStock: prev,
              newStock: newQty,
              referenceType: 'manual',
              reason: t('products.stockEdit.movementReason', { defaultValue: 'Edicion rapida desde Productos' }),
              createdBy: userId,
              createdAt: Timestamp.now(),
            })
          }
        }
      }

      // Nothing changed → just close
      if (movements.length === 0) {
        onClose()
        return
      }

      // Apply the product update first; only log movements after Firestore
      // confirms the write so the audit trail can't claim a change that
      // never landed.
      await updateDoc(doc(db, `stores/${storeId}/products`, product.id), updateData)
      for (const m of movements) {
        try {
          await addDoc(collection(db, `stores/${storeId}/stock_movements`), m)
        } catch (mErr) {
          console.error('[StockEditModal] failed to log stock_movement:', mErr)
          // Don't fail the whole save if logging the audit row fails — the
          // stock change itself succeeded.
        }
      }

      // Build the updated product shape so the parent can refresh its state
      // without refetching from Firestore.
      const updated: Product = {
        ...product,
        ...(updateData.combinations !== undefined ? { combinations: updateData.combinations as VariantCombination[] } : {}),
        ...(updateData.stock !== undefined ? { stock: updateData.stock as number } : {}),
        ...(updateData.warehouseStock !== undefined ? { warehouseStock: updateData.warehouseStock as Record<string, number> } as Partial<Product> : {}),
      } as Product
      onSaved(updated)
      onClose()
    } catch (err) {
      console.error('[StockEditModal] save failed:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-[#1e3a5f]">
            {t('products.stockEdit.title', { defaultValue: 'Editar stock' })}
          </h3>
          <p className="text-sm text-gray-500 mt-1 truncate">{product.name}</p>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loadingWarehouses ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#2d6cb5] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Warehouse picker — only when there's more than one */}
              {isMultiWarehouse && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('products.stockEdit.warehouse', { defaultValue: 'Almacén' })}
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6cb5]/30 focus:border-[#2d6cb5]"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}{w.isDefault ? ' (' + t('products.stockEdit.default', { defaultValue: 'por defecto' }) + ')' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {t('products.stockEdit.warehouseHint', {
                      defaultValue: 'Los cambios afectan solo a este almacén. El stock de otros almacenes se conserva.',
                    })}
                  </p>
                </div>
              )}

              {/* Combinations grid OR simple input */}
              {hasCombinations(product) ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 grid grid-cols-[1fr_auto] gap-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    <span>{t('products.stockEdit.combination', { defaultValue: 'Combinación' })}</span>
                    <span className="text-right w-24">{t('products.stockEdit.qty', { defaultValue: 'Cantidad' })}</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {(product.combinations || []).map(combo => (
                      <div key={combo.id} className="px-3 py-2 grid grid-cols-[1fr_auto] gap-3 items-center">
                        <span className="text-sm text-gray-800 truncate">{comboLabel(combo)}</span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={comboInputs[combo.id] ?? ''}
                          onChange={e => setComboInputs(prev => ({ ...prev, [combo.id]: e.target.value }))}
                          className="w-24 px-2 py-1 border border-gray-200 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2d6cb5]/30 focus:border-[#2d6cb5]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('products.stockEdit.qty', { defaultValue: 'Cantidad' })}
                  </label>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={simpleInput}
                    onChange={e => setSimpleInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6cb5]/30 focus:border-[#2d6cb5]"
                  />
                </div>
              )}

              {/* Preview total */}
              <div className="mt-4 px-3 py-2 bg-[#f0f7ff] rounded-lg flex items-center justify-between text-sm">
                <span className="text-[#1e3a5f]">
                  {t('products.stockEdit.newTotal', { defaultValue: 'Nuevo stock total' })}
                </span>
                <span className="font-bold text-[#1e3a5f]">{previewTotal}</span>
              </div>

              {error && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('products.stockEdit.cancel', { defaultValue: 'Cancelar' })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingWarehouses}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#2d6cb5] rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving
              ? t('products.stockEdit.saving', { defaultValue: 'Guardando...' })
              : t('products.stockEdit.save', { defaultValue: 'Guardar' })}
          </button>
        </div>
      </div>
    </div>
  )
}
