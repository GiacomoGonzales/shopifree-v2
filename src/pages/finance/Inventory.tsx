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
  const [collapsedWarehouses, setCollapsedWarehouses] = useState<Set<string>>(new Set())  // keys: `${productId}:${warehouseId}` — collapsed = combo breakdown hidden

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
  const [transferSearch, setTransferSearch] = useState('')

  // Bulk mode (recuento por almacen)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkWarehouseId, setBulkWarehouseId] = useState('')  // selected warehouse for bulk count
  const [bulkChanges, setBulkChanges] = useState<Record<string, string>>({})  // productId -> new stock in selected warehouse (simple products)
  const [bulkComboChanges, setBulkComboChanges] = useState<Record<string, Record<string, string>>>({})  // productId -> comboId -> new stock in selected warehouse
  const [bulkSaving, setBulkSaving] = useState(false)

  // Sync (migration) — fix products whose combos have stock but no warehouseStock
  const [syncing, setSyncing] = useState(false)

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

  // Detect desync scenarios:
  //  (a) Combos with stock > 0 but no warehouseStock distribution.
  //  (b) Orphan product-level stock: product has combos but product.stock / product.warehouseStock
  //      don't match the sum of combos (e.g. had stock before variants were added).
  //  (c) Simple products with stock > 0 and no product-level warehouseStock.
  const isDesynced = (p: Product): boolean => {
    if (!p.trackStock) return false
    const pWs = (p as Product & { warehouseStock?: Record<string, number> }).warehouseStock || {}
    if (p.combinations && p.combinations.length > 0) {
      // (a)
      if (p.combinations.some(c => (c.stock || 0) > 0 && (!c.warehouseStock || Object.keys(c.warehouseStock).length === 0))) return true
      // (b) compare product-level vs sum of combos
      const combosSum: Record<string, number> = {}
      for (const c of p.combinations) {
        for (const [wid, qty] of Object.entries(c.warehouseStock || {})) {
          combosSum[wid] = (combosSum[wid] || 0) + (qty || 0)
        }
      }
      const allKeys = new Set([...Object.keys(pWs), ...Object.keys(combosSum)])
      for (const k of allKeys) {
        if ((pWs[k] || 0) !== (combosSum[k] || 0)) return true
      }
      const combosTotal = p.combinations.reduce((s, c) => s + (c.stock || 0), 0)
      if ((p.stock ?? 0) !== combosTotal) return true
      return false
    }
    // (c) Simple product
    return (p.stock ?? 0) > 0 && Object.keys(pWs).length === 0
  }

  const desyncedProducts = products.filter(isDesynced)
  const desyncedCount = desyncedProducts.length

  // Self-healing: assigns all combo.stock (and product.stock for simple) to the default warehouse.
  const handleSync = async () => {
    if (!store || !firebaseUser) return
    const defaultWId = await getDefaultWarehouseId()
    if (!defaultWId) {
      alert('No hay un almacen marcado como principal. Marca uno en Almacenes primero.')
      return
    }
    const defaultW = warehouses.find(w => w.id === defaultWId)
    const defaultWName = defaultW?.name || 'Almacen principal'

    const toFix = products.filter(isDesynced)
    if (toFix.length === 0) return

    setSyncing(true)
    const updatedProducts: Record<string, Product> = {}
    try {
      for (const product of toFix) {
        if (product.combinations && product.combinations.length > 0) {
          const newCombos = product.combinations.map(c => {
            if ((c.stock || 0) > 0 && (!c.warehouseStock || Object.keys(c.warehouseStock).length === 0)) {
              return { ...c, warehouseStock: { [defaultWId]: c.stock } }
            }
            return c
          })
          // Recompute product-level warehouseStock as sum of combos (source of truth)
          const newWs: Record<string, number> = {}
          for (const c of newCombos) {
            for (const [wid, qty] of Object.entries(c.warehouseStock || {})) {
              newWs[wid] = (newWs[wid] || 0) + (qty || 0)
            }
          }
          const newTotal = newCombos.reduce((s, c) => s + (c.stock || 0), 0)
          await updateDoc(doc(db, `stores/${store.id}/products`, product.id), {
            combinations: newCombos,
            warehouseStock: newWs,
            stock: newTotal,
          })
          updatedProducts[product.id] = { ...product, combinations: newCombos, warehouseStock: newWs, stock: newTotal } as Product
          // Log one adjustment movement per combo that was healed
          for (const c of newCombos) {
            const was = product.combinations!.find(o => o.id === c.id)
            const prev = was?.warehouseStock?.[defaultWId] ?? 0
            const now = c.warehouseStock?.[defaultWId] ?? 0
            if (prev === now) continue
            const comboLabel = Object.values(c.options).join(' / ')
            await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
              productId: product.id, productName: product.name,
              variationName: Object.keys(c.options).join(' / '), optionValue: comboLabel,
              type: 'adjustment', quantity: now - prev,
              previousStock: prev, newStock: now,
              referenceType: 'manual', reason: `Sincronizacion: asignado a ${defaultWName}`,
              warehouseId: defaultWId, warehouseName: defaultWName,
              createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
            })
          }
          // Log orphan cleanup: product-level stock removed that didn't exist in any combo
          const oldPWs = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock || {}
          for (const [wid, prevQty] of Object.entries(oldPWs)) {
            const newQty = newWs[wid] || 0
            if (prevQty === newQty) continue
            // Only log if this warehouse was actually reduced without a matching combo healing
            const wh = warehouses.find(w => w.id === wid)
            await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
              productId: product.id, productName: product.name,
              type: 'adjustment', quantity: newQty - prevQty,
              previousStock: prevQty, newStock: newQty,
              referenceType: 'manual', reason: `Sincronizacion: stock huerfano removido (sin variante asignada)`,
              warehouseId: wid, warehouseName: wh?.name,
              createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
            })
          }
        } else {
          // Simple product: put all stock in default warehouse
          const total = product.stock ?? 0
          const newWs = { [defaultWId]: total }
          await updateDoc(doc(db, `stores/${store.id}/products`, product.id), {
            warehouseStock: newWs,
          })
          updatedProducts[product.id] = { ...product, warehouseStock: newWs } as Product
          await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
            productId: product.id, productName: product.name,
            type: 'adjustment', quantity: 0,
            previousStock: 0, newStock: total,
            referenceType: 'manual', reason: `Sincronizacion: asignado a ${defaultWName}`,
            warehouseId: defaultWId, warehouseName: defaultWName,
            createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
          })
        }
      }
      if (Object.keys(updatedProducts).length > 0) {
        setProducts(prev => prev.map(p => updatedProducts[p.id] || p))
      }
    } catch (err) {
      console.error(err)
    }
    setSyncing(false)
  }

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
      const prevWs = { ...((product as Product & { warehouseStock?: Record<string, number> }).warehouseStock || {}) }
      const prevTotal = product.stock ?? 0
      const delta = newStockNum - prevTotal

      const updateData: Record<string, unknown> = {}
      let newWs = prevWs
      let warehouseForMovement: { id: string; name: string } | null = null

      if (defaultWId) {
        const wh = warehouses.find(w => w.id === defaultWId)
        warehouseForMovement = wh ? { id: wh.id, name: wh.name } : null
        const prevWhStock = prevWs[defaultWId] ?? 0
        // Apply delta to default warehouse (not just overwrite — preserves other warehouses).
        const nextWhStock = Math.max(0, prevWhStock + delta)
        newWs = { ...prevWs, [defaultWId]: nextWhStock }
        updateData.warehouseStock = newWs
        updateData.stock = Object.values(newWs).reduce((s, n) => s + (n || 0), 0)
      } else {
        // No default warehouse: just set top-level stock (legacy mode).
        updateData.stock = newStockNum
      }

      await updateDoc(doc(db, `stores/${store.id}/products`, product.id), updateData)

      const movement: Record<string, unknown> = {
        productId: product.id, productName: product.name,
        type: 'adjustment', quantity: delta,
        previousStock: warehouseForMovement ? (prevWs[warehouseForMovement.id] ?? 0) : prevTotal,
        newStock: warehouseForMovement ? (newWs[warehouseForMovement.id] ?? 0) : newStockNum,
        referenceType: 'manual', reason: 'Ajuste rapido',
        createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
      }
      if (warehouseForMovement) {
        movement.warehouseId = warehouseForMovement.id
        movement.warehouseName = warehouseForMovement.name
      }
      await addDoc(collection(db, `stores/${store.id}/stock_movements`), movement)

      // Update local state with new totals
      setProducts(prev => prev.map(p => p.id === product.id
        ? { ...p, stock: (updateData.stock as number), warehouseStock: newWs } as Product
        : p))
      setAdjustingId(null)
      setAdjustValue('')
    } catch (err) {
      console.error(err)
    }
    setAdjustSaving(false)
  }

  // Bulk save (recuento por almacen)
  const handleBulkSave = async () => {
    if (!store || !firebaseUser || !bulkWarehouseId) return
    const wh = warehouses.find(w => w.id === bulkWarehouseId)
    if (!wh) return

    setBulkSaving(true)
    const updatedProducts: Record<string, Product> = {}
    try {
      // 1) Simple products (no combinations)
      for (const [productId, val] of Object.entries(bulkChanges)) {
        if (val === '') continue
        const product = products.find(p => p.id === productId)
        if (!product || hasCombinations(product)) continue
        const newWhStock = parseInt(val)
        if (isNaN(newWhStock) || newWhStock < 0) continue

        const ws = { ...((product as Product & { warehouseStock?: Record<string, number> }).warehouseStock || {}) }
        const prevWhStock = ws[bulkWarehouseId] ?? 0
        if (newWhStock === prevWhStock) continue
        ws[bulkWarehouseId] = newWhStock
        const newTotal = Object.values(ws).reduce((s, n) => s + (n || 0), 0)

        await updateDoc(doc(db, `stores/${store.id}/products`, productId), {
          stock: newTotal,
          warehouseStock: ws,
        })
        await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
          productId, productName: product.name,
          type: 'adjustment', quantity: newWhStock - prevWhStock,
          previousStock: prevWhStock, newStock: newWhStock,
          referenceType: 'manual', reason: `Recuento (${wh.name})`,
          warehouseId: bulkWarehouseId, warehouseName: wh.name,
          createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
        })
        updatedProducts[productId] = { ...product, stock: newTotal, warehouseStock: ws } as Product
      }

      // 2) Products with combinations
      for (const [productId, comboMap] of Object.entries(bulkComboChanges)) {
        const product = products.find(p => p.id === productId)
        if (!product || !product.combinations) continue
        const baseProduct = updatedProducts[productId] || product

        let combosChanged = false
        const newCombos = baseProduct.combinations!.map(combo => {
          const raw = comboMap[combo.id]
          if (raw === undefined || raw === '') return combo
          const newWhStock = parseInt(raw)
          if (isNaN(newWhStock) || newWhStock < 0) return combo
          const cws = { ...(combo.warehouseStock || {}) }
          const prevWhStock = cws[bulkWarehouseId] ?? 0
          if (newWhStock === prevWhStock) return combo
          cws[bulkWarehouseId] = newWhStock
          const newComboTotal = Object.values(cws).reduce((s, n) => s + (n || 0), 0)
          combosChanged = true
          return { ...combo, stock: newComboTotal, warehouseStock: cws }
        })
        if (!combosChanged) continue

        // Recompute product-level warehouseStock and stock as sums of combos
        const newProductWs: Record<string, number> = {}
        for (const c of newCombos) {
          for (const [wid, qty] of Object.entries(c.warehouseStock || {})) {
            newProductWs[wid] = (newProductWs[wid] || 0) + (qty || 0)
          }
        }
        const newProductTotal = newCombos.reduce((s, c) => s + (c.stock || 0), 0)

        await updateDoc(doc(db, `stores/${store.id}/products`, productId), {
          combinations: newCombos,
          stock: newProductTotal,
          warehouseStock: newProductWs,
        })

        // One movement per changed combination
        const prevCombosById = Object.fromEntries((product.combinations || []).map(c => [c.id, c]))
        for (const c of newCombos) {
          const prev = prevCombosById[c.id]
          const prevWhStock = prev?.warehouseStock?.[bulkWarehouseId] ?? 0
          const newWhStock = c.warehouseStock?.[bulkWarehouseId] ?? 0
          if (prevWhStock === newWhStock) continue
          const comboLabel = Object.values(c.options).join(' / ')
          await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
            productId, productName: product.name,
            variationName: Object.keys(c.options).join(' / '), optionValue: comboLabel,
            type: 'adjustment', quantity: newWhStock - prevWhStock,
            previousStock: prevWhStock, newStock: newWhStock,
            referenceType: 'manual', reason: `Recuento (${wh.name})`,
            warehouseId: bulkWarehouseId, warehouseName: wh.name,
            createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
          })
        }

        updatedProducts[productId] = {
          ...baseProduct,
          combinations: newCombos,
          stock: newProductTotal,
          warehouseStock: newProductWs,
        } as Product
      }

      if (Object.keys(updatedProducts).length > 0) {
        setProducts(prev => prev.map(p => updatedProducts[p.id] || p))
      }
      setBulkChanges({})
      setBulkComboChanges({})
      setBulkMode(false)
      setBulkWarehouseId('')
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
    // For combo products, sum combo-level stock in source warehouse (source of truth)
    if (transferProduct.combinations && transferProduct.combinations.length > 0) {
      return transferProduct.combinations.reduce((s, c) => s + (c.warehouseStock?.[transferFrom] ?? 0), 0)
    }
    const ws = (transferProduct as Product & { warehouseStock?: Record<string, number> }).warehouseStock
    return ws?.[transferFrom] || 0
  })()

  const transferTotalQty = transferHasCombos
    ? Object.values(transferComboQtys).reduce((s, v) => s + (parseInt(v) || 0), 0)
    : (parseInt(transferQty) || 0)

  // Per-combo validation: each entered qty must not exceed the combo's stock in the source warehouse
  const transferCombosWithinLimit = transferHasCombos && transferFrom
    ? transferProduct!.combinations!.every(combo => {
        const qty = parseInt(transferComboQtys[combo.id]) || 0
        const available = combo.warehouseStock?.[transferFrom] ?? 0
        return qty <= available
      })
    : true

  const transferIsValid = transferFrom && transferTo && transferFrom !== transferTo && transferTotalQty > 0 && transferTotalQty <= transferAvailable && transferCombosWithinLimit

  const handleTransfer = async () => {
    if (!store || !firebaseUser || !transferProduct || !transferIsValid) return
    setTransferSaving(true)
    try {
      const ref = doc(db, `stores/${store.id}/products`, transferProduct.id)
      const prevWs = { ...((transferProduct as Product & { warehouseStock?: Record<string, number> }).warehouseStock || {}) }
      const ws = { ...prevWs }
      const fromW = warehouses.find(w => w.id === transferFrom)
      const toW = warehouses.find(w => w.id === transferTo)

      // Update product-level warehouseStock
      const prevFromTotal = prevWs[transferFrom] || 0
      const prevToTotal = prevWs[transferTo] || 0
      ws[transferFrom] = prevFromTotal - transferTotalQty
      ws[transferTo] = prevToTotal + transferTotalQty
      const updateData: Record<string, unknown> = { warehouseStock: ws }

      // Update combo-level warehouseStock
      let updatedCombinations = transferProduct.combinations
      if (transferHasCombos) {
        updatedCombinations = transferProduct.combinations!.map(combo => {
          const qty = parseInt(transferComboQtys[combo.id]) || 0
          if (qty <= 0) return combo
          const cws = { ...(combo.warehouseStock || {}) }
          cws[transferFrom] = (cws[transferFrom] || 0) - qty
          cws[transferTo] = (cws[transferTo] || 0) + qty
          return { ...combo, warehouseStock: cws }
        })
        updateData.combinations = updatedCombinations
      }
      await updateDoc(ref, updateData)

      // Stock movements — previousStock/newStock reflect warehouse-specific values
      if (transferHasCombos) {
        for (const combo of transferProduct.combinations!) {
          const qty = parseInt(transferComboQtys[combo.id]) || 0
          if (qty <= 0) continue
          const comboLabel = Object.values(combo.options).join(' / ')
          const prevFrom = combo.warehouseStock?.[transferFrom] ?? 0
          const prevTo = combo.warehouseStock?.[transferTo] ?? 0
          await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
            productId: transferProduct.id, productName: transferProduct.name,
            variationName: Object.keys(combo.options).join(' / '), optionValue: comboLabel,
            type: 'transfer', quantity: -qty,
            previousStock: prevFrom, newStock: prevFrom - qty,
            reason: transferNote.trim() || `Transferencia a ${toW?.name || 'otro almacen'}`,
            warehouseId: transferFrom, warehouseName: fromW?.name,
            createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
          })
          await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
            productId: transferProduct.id, productName: transferProduct.name,
            variationName: Object.keys(combo.options).join(' / '), optionValue: comboLabel,
            type: 'transfer', quantity: qty,
            previousStock: prevTo, newStock: prevTo + qty,
            reason: transferNote.trim() || `Transferencia desde ${fromW?.name || 'otro almacen'}`,
            warehouseId: transferTo, warehouseName: toW?.name,
            createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
          })
        }
      } else {
        await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
          productId: transferProduct.id, productName: transferProduct.name,
          type: 'transfer', quantity: -transferTotalQty,
          previousStock: prevFromTotal, newStock: prevFromTotal - transferTotalQty,
          reason: transferNote.trim() || `Transferencia a ${toW?.name || 'otro almacen'}`,
          warehouseId: transferFrom, warehouseName: fromW?.name,
          createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
        })
        await addDoc(collection(db, `stores/${store.id}/stock_movements`), {
          productId: transferProduct.id, productName: transferProduct.name,
          type: 'transfer', quantity: transferTotalQty,
          previousStock: prevToTotal, newStock: prevToTotal + transferTotalQty,
          reason: transferNote.trim() || `Transferencia desde ${fromW?.name || 'otro almacen'}`,
          warehouseId: transferTo, warehouseName: toW?.name,
          createdBy: firebaseUser.uid, createdAt: Timestamp.now(),
        })
      }

      setProducts(prev => prev.map(p => p.id === transferProduct.id ? { ...p, warehouseStock: ws, combinations: updatedCombinations } as Product : p))
      setTransferProduct(null)
    } catch (err) {
      console.error(err)
    }
    setTransferSaving(false)
  }

  const bulkChangeCount = (() => {
    if (!bulkWarehouseId) return 0
    let n = 0
    // Simple products: changes in selected warehouse
    for (const [id, val] of Object.entries(bulkChanges)) {
      if (val === '') continue
      const p = products.find(x => x.id === id)
      if (!p || hasCombinations(p)) continue
      const cur = (p as Product & { warehouseStock?: Record<string, number> }).warehouseStock?.[bulkWarehouseId] ?? 0
      const next = parseInt(val)
      if (!isNaN(next) && next !== cur) n++
    }
    // Combo products: changes per combination in selected warehouse
    for (const [pid, comboMap] of Object.entries(bulkComboChanges)) {
      const p = products.find(x => x.id === pid)
      if (!p || !p.combinations) continue
      for (const [cid, val] of Object.entries(comboMap)) {
        if (val === '') continue
        const combo = p.combinations.find(c => c.id === cid)
        if (!combo) continue
        const cur = combo.warehouseStock?.[bulkWarehouseId] ?? 0
        const next = parseInt(val)
        if (!isNaN(next) && next !== cur) n++
      }
    }
    return n
  })()

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
              <button onClick={() => { setBulkMode(false); setBulkChanges({}); setBulkComboChanges({}); setBulkWarehouseId('') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
              <button onClick={handleBulkSave} disabled={bulkSaving || bulkChangeCount === 0 || !bulkWarehouseId}
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

      {/* Desync banner */}
      {!bulkMode && desyncedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-amber-800 font-medium">
                {desyncedCount} {desyncedCount === 1 ? 'producto tiene' : 'productos tienen'} stock desincronizado
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Stock sin asignar a almacenes o stock general huerfano tras agregar variantes. Sincroniza para asignarlo al almacen principal o limpiar el residuo.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {desyncedProducts.slice(0, 8).map(p => (
                  <span key={p.id} className="inline-flex items-center px-2 py-0.5 bg-white border border-amber-200 rounded-md text-[11px] text-amber-800">
                    {p.name}
                    {p.sku && <span className="ml-1 text-amber-400">· {p.sku}</span>}
                  </span>
                ))}
                {desyncedProducts.length > 8 && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] text-amber-700 font-medium">
                    +{desyncedProducts.length - 8} mas
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-40 flex-shrink-0"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      )}

      {/* Bulk mode banner with warehouse selector */}
      {bulkMode && (
        <div className="bg-blue-50 border border-blue-200/60 rounded-xl px-4 py-3 animate-[slideDown_0.2s_ease-out] space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-blue-700">
              {bulkWarehouseId
                ? 'Modo recuento: edita el stock de cada combinacion en el almacen seleccionado.'
                : 'Selecciona un almacen para empezar el recuento.'}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-blue-700 font-medium">Almacen:</label>
              <select
                value={bulkWarehouseId}
                onChange={e => { setBulkWarehouseId(e.target.value); setBulkChanges({}); setBulkComboChanges({}) }}
                className="px-3 py-1.5 border border-blue-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              >
                <option value="">-- Elegir --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
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
                const productHasCombos = hasCombinations(product)
                const productWhStock = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock?.[bulkWarehouseId] ?? 0

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
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {bulkMode && product.trackStock && bulkWarehouseId && !productHasCombos ? (
                            <input type="number" min="0"
                              value={bulkChanges[product.id] ?? String(productWhStock)}
                              onChange={e => setBulkChanges(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className={`w-16 px-2 py-1 text-sm text-right border rounded-md ${
                                bulkChanges[product.id] !== undefined && parseInt(bulkChanges[product.id]) !== productWhStock
                                  ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                              }`}
                              onClick={e => e.stopPropagation()} />
                          ) : bulkMode && product.trackStock && productHasCombos ? (
                            <div className="text-right">
                              <p className="text-[11px] text-gray-400">{product.combinations!.length} combinaciones</p>
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{product.trackStock ? stock : '--'}</p>
                              <StatusBadge status={status} />
                            </div>
                          )}
                          {/* Action menu (mobile) */}
                          {!bulkMode && product.trackStock && (
                            <div className="relative">
                              <button onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === product.id ? null : product.id) }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                </svg>
                              </button>
                              {menuOpenId === product.id && (
                                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40 animate-[slideDown_0.1s_ease-out]"
                                  onClick={e => e.stopPropagation()}>
                                  {!hasVariants && !productHasCombos && (
                                    <button onClick={() => { setAdjustingId(product.id); setAdjustValue(String(stock)); setMenuOpenId(null); toggleExpand(product.id) }}
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
                          {bulkMode && product.trackStock && bulkWarehouseId && !productHasCombos ? (
                            <input type="number" min="0"
                              value={bulkChanges[product.id] ?? String(productWhStock)}
                              onChange={e => setBulkChanges(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className={`w-20 px-2 py-1 text-sm text-right border rounded-md ml-auto block ${
                                bulkChanges[product.id] !== undefined && parseInt(bulkChanges[product.id]) !== productWhStock
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
                                  {!hasVariants && !productHasCombos && (
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

                    {/* Bulk mode: per-combination inputs for selected warehouse */}
                    {bulkMode && bulkWarehouseId && productHasCombos && product.trackStock && (
                      <div className="border-t border-gray-100 bg-blue-50/20 px-4 py-3 animate-[slideDown_0.15s_ease-out]">
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2">
                          Combinaciones - stock en {warehouses.find(w => w.id === bulkWarehouseId)?.name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {product.combinations!.map(combo => {
                            const comboLabel = Object.values(combo.options).join(' / ')
                            const cur = combo.warehouseStock?.[bulkWarehouseId] ?? 0
                            const editedRaw = bulkComboChanges[product.id]?.[combo.id]
                            const inputVal = editedRaw ?? String(cur)
                            const changed = editedRaw !== undefined && editedRaw !== '' && parseInt(editedRaw) !== cur
                            return (
                              <div key={combo.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-gray-100 rounded-md">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-700 truncate">{comboLabel}</p>
                                  <p className="text-[10px] text-gray-400">Actual: {cur}</p>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  value={inputVal}
                                  onChange={e => setBulkComboChanges(prev => ({
                                    ...prev,
                                    [product.id]: { ...(prev[product.id] || {}), [combo.id]: e.target.value }
                                  }))}
                                  className={`w-16 px-2 py-1 text-sm text-right border rounded-md ${
                                    changed ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                                  }`}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

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
                                      const hasAnyDistribution = pWs && Object.keys(pWs).length > 0
                                      // When the product has combinations, combos are the source of truth:
                                      // sum their stock in this warehouse. Any product-level leftover is orphan data.
                                      const wStock = hasCombinations(product)
                                        ? product.combinations!.reduce((s, c) => s + (c.warehouseStock?.[w.id] ?? 0), 0)
                                        : (pWs?.[w.id] ?? (w.isDefault && !hasAnyDistribution ? (product.stock ?? 0) : 0))
                                      const whKey = `${product.id}:${w.id}`
                                      const showsBreakdown = hasCombinations(product) || (hasVariants && !hasCombinations(product))
                                      const isCollapsed = collapsedWarehouses.has(whKey)

                                      return (
                                        <div key={w.id}>
                                          <div
                                            className={`px-3 py-2 flex items-center justify-between ${showsBreakdown ? 'cursor-pointer hover:bg-gray-50/60' : ''}`}
                                            onClick={() => {
                                              if (!showsBreakdown) return
                                              setCollapsedWarehouses(prev => {
                                                const next = new Set(prev)
                                                if (next.has(whKey)) next.delete(whKey)
                                                else next.add(whKey)
                                                return next
                                              })
                                            }}
                                          >
                                            <div className="flex items-center gap-2">
                                              {showsBreakdown && (
                                                <svg className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                </svg>
                                              )}
                                              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5M10.5 21H3m1.125-9.75H3.375c-.621 0-1.125-.504-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125H4.125Z" />
                                              </svg>
                                              <p className="text-xs text-gray-600">{w.name}</p>
                                              {w.isDefault && <span className="px-1 py-0.5 bg-blue-50 text-blue-500 text-[9px] font-medium rounded">Principal</span>}
                                            </div>
                                            <p className="text-xs font-medium text-gray-700">{wStock} total</p>
                                          </div>
                                          {/* Combinations per warehouse */}
                                          {hasCombinations(product) && !isCollapsed && (
                                            <div className="pl-8 pr-3 pb-2 space-y-0.5">
                                              {product.combinations!.map(combo => {
                                                const comboLabel = Object.values(combo.options).join(' / ')
                                                const comboWStock = combo.warehouseStock?.[w.id] ?? 0
                                                const isZero = comboWStock === 0
                                                return (
                                                  <div key={combo.id} className="flex items-center justify-between py-0.5">
                                                    <p className={`text-[11px] ${isZero ? 'text-gray-300' : 'text-gray-600'}`}>{comboLabel}</p>
                                                    <p className={`text-[11px] font-medium tabular-nums ${isZero ? 'text-gray-300' : 'text-gray-700'}`}>{comboWStock}</p>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                          {/* Legacy: variants without combinations */}
                                          {hasVariants && !hasCombinations(product) && !isCollapsed && (
                                            <div className="pl-8 pr-3 pb-2 space-y-0.5">
                                              {product.variations!.map(variation =>
                                                variation.options.map(option => {
                                                  const optStock = option.stock ?? 0
                                                  const isZero = optStock === 0
                                                  return (
                                                    <div key={`${variation.id}-${option.id}`} className="flex items-center justify-between py-0.5">
                                                      <p className={`text-[11px] ${isZero ? 'text-gray-300' : 'text-gray-500'}`}>
                                                        <span className="text-gray-400">{variation.name}:</span> {option.value}
                                                      </p>
                                                      <p className={`text-[11px] font-medium tabular-nums ${isZero ? 'text-gray-300' : 'text-gray-700'}`}>{optStock}</p>
                                                    </div>
                                                  )
                                                })
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

                        {/* Combinations at product level removed — now shown per warehouse above */}

                        {/* Legacy variants without combinations */}
                        {hasVariants && !hasCombinations(product) && warehouses.length === 0 && (
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

                    {/* Transfer handled in modal below */}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Transfer Modal */}
      {transferProduct && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={() => setTransferProduct(null)} />
          <div className="fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 animate-[slideDown_0.2s_ease-out]">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200/60 max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Transferir stock</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{transferProduct.name}</p>
                </div>
                <button onClick={() => setTransferProduct(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
                {/* Warehouses */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Desde</label>
                    <select value={transferFrom} onChange={e => { setTransferFrom(e.target.value); setTransferQty(''); setTransferComboQtys({}); setTransferSearch('') }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                      <option value="">Seleccionar almacen</option>
                      {warehouses.map(w => {
                        const pws = (transferProduct as Product & { warehouseStock?: Record<string, number> }).warehouseStock
                        const whStock = transferProduct.combinations && transferProduct.combinations.length > 0
                          ? transferProduct.combinations.reduce((s, c) => s + (c.warehouseStock?.[w.id] ?? 0), 0)
                          : (pws?.[w.id] || 0)
                        return <option key={w.id} value={w.id}>{w.name} ({whStock} uds)</option>
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Hacia</label>
                    <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                      <option value="">Seleccionar almacen</option>
                      {warehouses.filter(w => w.id !== transferFrom).map(w => {
                        const pws = (transferProduct as Product & { warehouseStock?: Record<string, number> }).warehouseStock
                        const whStock = transferProduct.combinations && transferProduct.combinations.length > 0
                          ? transferProduct.combinations.reduce((s, c) => s + (c.warehouseStock?.[w.id] ?? 0), 0)
                          : (pws?.[w.id] || 0)
                        return <option key={w.id} value={w.id}>{w.name} ({whStock} uds)</option>
                      })}
                    </select>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Motivo (opcional)</label>
                  <input type="text" value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Ej: Reposicion sucursal norte"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                </div>

                {/* Quantity: simple product */}
                {transferFrom && transferTo && !transferHasCombos && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cantidad <span className="text-gray-400">(disponible: {transferAvailable})</span></label>
                    <input type="number" min="1" max={transferAvailable} value={transferQty}
                      onChange={e => {
                        const raw = e.target.value
                        if (raw === '') { setTransferQty(''); return }
                        const n = parseInt(raw)
                        if (isNaN(n) || n < 0) return
                        setTransferQty(String(Math.min(n, transferAvailable)))
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                  </div>
                )}

                {/* Quantity per combination */}
                {transferFrom && transferTo && transferHasCombos && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500">Combinaciones <span className="text-gray-400">(disponible: {transferAvailable})</span></label>
                    </div>
                    {/* Search */}
                    <div className="relative mb-2">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                      <input type="text" value={transferSearch} onChange={e => setTransferSearch(e.target.value)}
                        placeholder="Buscar combinacion..."
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                        {transferProduct.combinations!
                          .filter(c => {
                            if (!transferSearch) return true
                            const label = Object.values(c.options).join(' ').toLowerCase()
                            return label.includes(transferSearch.toLowerCase())
                          })
                          .map(combo => {
                            const comboLabel = Object.values(combo.options).join(' / ')
                            const qty = parseInt(transferComboQtys[combo.id]) || 0
                            const comboAvailable = combo.warehouseStock?.[transferFrom] ?? 0
                            const exceeds = qty > comboAvailable
                            return (
                              <div key={combo.id} className={`px-3 py-2.5 flex items-center justify-between gap-3 ${qty > 0 ? 'bg-blue-50/30' : ''}`}>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-gray-800">{comboLabel}</p>
                                  <p className="text-[11px] text-gray-400">Stock: {comboAvailable}</p>
                                </div>
                                <input type="number" min="0" max={comboAvailable}
                                  disabled={comboAvailable === 0}
                                  value={transferComboQtys[combo.id] || ''}
                                  onChange={e => {
                                    const raw = e.target.value
                                    if (raw === '') {
                                      setTransferComboQtys(prev => ({ ...prev, [combo.id]: '' }))
                                      return
                                    }
                                    const n = parseInt(raw)
                                    if (isNaN(n) || n < 0) return
                                    const clamped = Math.min(n, comboAvailable)
                                    setTransferComboQtys(prev => ({ ...prev, [combo.id]: String(clamped) }))
                                  }}
                                  placeholder="0"
                                  className={`w-20 px-2.5 py-1.5 border rounded-lg text-sm text-right focus:ring-1 focus:ring-[#1e3a5f]/10 disabled:bg-gray-50 disabled:text-gray-400 ${
                                    exceeds ? 'border-red-300 bg-red-50' :
                                    qty > 0 ? 'border-blue-300 bg-white' : 'border-gray-200'
                                  }`} />
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <div>
                  {transferTotalQty > 0 && (
                    <p className="text-sm text-gray-700"><span className="font-medium">{transferTotalQty}</span> unidades a transferir</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTransferProduct(null)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button onClick={handleTransfer} disabled={transferSaving || !transferIsValid}
                    className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
                    {transferSaving ? 'Transfiriendo...' : 'Transferir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'ok' | 'low' | 'out' | 'untracked' }) {
  const styles = { ok: 'bg-green-50 text-green-600', low: 'bg-amber-50 text-amber-600', out: 'bg-red-50 text-red-500', untracked: 'bg-gray-50 text-gray-400' }
  const labels = { ok: 'Normal', low: 'Bajo', out: 'Agotado', untracked: 'Sin control' }
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${styles[status]}`}>{labels[status]}</span>
}
