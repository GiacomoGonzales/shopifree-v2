import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product, Warehouse } from '../../types'

interface Issue {
  id: string
  productId: string
  productName: string
  productImage?: string | null
  type: 'orphan_stock' | 'no_warehouse' | 'missing_combinations' | 'stock_mismatch' | 'dead_warehouse'
  description: string
  currentValue: string
  action: string
}

export default function StockDiagnostic() {
  const { store } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState<string | null>(null)
  const [fixed, setFixed] = useState<Set<string>>(new Set())

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

  const defaultWarehouse = warehouses.find(w => w.isDefault)
  const warehouseIds = new Set(warehouses.map(w => w.id))

  const issues = useMemo(() => {
    const list: Issue[] = []
    const tracked = products.filter(p => p.trackStock && p.active !== false)

    for (const p of tracked) {
      const stock = p.stock ?? 0
      const hasCombos = p.combinations && p.combinations.length > 0
      const hasVariations = p.hasVariations && p.variations && p.variations.length > 0
      const ws = (p as Product & { warehouseStock?: Record<string, number> }).warehouseStock

      // 1. Has variations but no combinations array
      if (hasVariations && !hasCombos) {
        list.push({
          id: `missing-combos-${p.id}`,
          productId: p.id, productName: p.name, productImage: p.image,
          type: 'missing_combinations',
          description: 'Tiene variantes pero no combinaciones. El stock no se puede distribuir por variante.',
          currentValue: `${p.variations!.length} variante(s), ${stock} uds stock global`,
          action: 'Generar combinaciones automaticamente',
        })
      }

      // 2. Has combinations but stock is in product, not in combos
      if (hasCombos && stock > 0) {
        const comboTotal = p.combinations!.reduce((s, c) => s + c.stock, 0)
        if (comboTotal === 0) {
          list.push({
            id: `orphan-stock-${p.id}`,
            productId: p.id, productName: p.name, productImage: p.image,
            type: 'orphan_stock',
            description: `Tiene ${stock} uds en stock global pero las combinaciones estan en 0. El stock no esta asignado a ninguna combinacion.`,
            currentValue: `Global: ${stock}, Combinaciones: ${comboTotal}`,
            action: 'Distribuir equitativamente entre combinaciones',
          })
        } else if (comboTotal !== stock) {
          list.push({
            id: `mismatch-${p.id}`,
            productId: p.id, productName: p.name, productImage: p.image,
            type: 'stock_mismatch',
            description: `El stock global (${stock}) no coincide con la suma de combinaciones (${comboTotal}).`,
            currentValue: `Global: ${stock}, Suma combos: ${comboTotal}`,
            action: 'Corregir stock global = suma de combinaciones',
          })
        }
      }

      // 3. Has stock but no warehouseStock
      if (stock > 0 && !ws && defaultWarehouse) {
        list.push({
          id: `no-warehouse-${p.id}`,
          productId: p.id, productName: p.name, productImage: p.image,
          type: 'no_warehouse',
          description: 'Tiene stock pero no esta asignado a ningun almacen.',
          currentValue: `${stock} uds sin almacen`,
          action: `Asignar a ${defaultWarehouse.name}`,
        })
      }

      // 4. warehouseStock references deleted warehouse
      if (ws) {
        for (const wId of Object.keys(ws)) {
          if (!warehouseIds.has(wId)) {
            list.push({
              id: `dead-wh-${p.id}-${wId}`,
              productId: p.id, productName: p.name, productImage: p.image,
              type: 'dead_warehouse',
              description: `Tiene stock asignado a un almacen que ya no existe (${wId}).`,
              currentValue: `${ws[wId]} uds en almacen eliminado`,
              action: defaultWarehouse ? `Mover a ${defaultWarehouse.name}` : 'Eliminar referencia',
            })
          }
        }
      }
    }

    return list
  }, [products, warehouses, defaultWarehouse, warehouseIds])

  const handleFix = async (issue: Issue) => {
    if (!store) return
    setFixing(issue.id)
    try {
      const product = products.find(p => p.id === issue.productId)
      if (!product) return
      const ref = doc(db, `stores/${store.id}/products`, issue.productId)

      switch (issue.type) {
        case 'orphan_stock': {
          // Distribute stock equally among combinations
          if (!product.combinations) break
          const perCombo = Math.floor((product.stock ?? 0) / product.combinations.length)
          const remainder = (product.stock ?? 0) % product.combinations.length
          const updated = product.combinations.map((c, i) => ({ ...c, stock: perCombo + (i < remainder ? 1 : 0) }))
          const updateData: Record<string, unknown> = { combinations: updated }
          if (defaultWarehouse) updateData[`warehouseStock.${defaultWarehouse.id}`] = product.stock ?? 0
          await updateDoc(ref, updateData)
          break
        }
        case 'stock_mismatch': {
          // Set stock = sum of combinations
          if (!product.combinations) break
          const total = product.combinations.reduce((s, c) => s + c.stock, 0)
          const updateData: Record<string, unknown> = { stock: total }
          if (defaultWarehouse) updateData[`warehouseStock.${defaultWarehouse.id}`] = total
          await updateDoc(ref, updateData)
          break
        }
        case 'no_warehouse': {
          if (!defaultWarehouse) break
          await updateDoc(ref, { [`warehouseStock.${defaultWarehouse.id}`]: product.stock ?? 0 })
          break
        }
        case 'dead_warehouse': {
          // Move stock to default warehouse or remove
          const ws = (product as Product & { warehouseStock?: Record<string, number> }).warehouseStock
          if (!ws) break
          const newWs = { ...ws }
          const deadIds = Object.keys(newWs).filter(id => !warehouseIds.has(id))
          let rescued = 0
          for (const id of deadIds) {
            rescued += newWs[id]
            delete newWs[id]
          }
          if (defaultWarehouse) newWs[defaultWarehouse.id] = (newWs[defaultWarehouse.id] || 0) + rescued
          await updateDoc(ref, { warehouseStock: newWs })
          break
        }
        case 'missing_combinations': {
          // Generate combinations from variations
          if (!product.variations) break
          const validVars = product.variations.filter(v => v.name && v.options.length > 0)
          if (validVars.length === 0) break

          const optionSets = validVars.map(v => v.options.filter(o => o.value).map(o => ({ name: v.name, value: o.value })))
          const combos = optionSets.reduce<Record<string, string>[][]>(
            (acc, set) => {
              if (acc.length === 0) return set.map(o => [{ [o.name]: o.value }])
              return acc.flatMap(combo => set.map(o => [...combo, { [o.name]: o.value }]))
            }, []
          )

          const stock = product.stock ?? 0
          const perCombo = combos.length > 0 ? Math.floor(stock / combos.length) : 0
          const remainder = combos.length > 0 ? stock % combos.length : 0

          const combinations = combos.map((combo, i) => {
            const options: Record<string, string> = {}
            combo.forEach(o => Object.assign(options, o))
            return {
              id: Math.random().toString(36).substring(2, 9),
              options,
              stock: perCombo + (i < remainder ? 1 : 0),
              price: product.price,
              available: true,
            }
          })

          const updateData: Record<string, unknown> = { combinations }
          if (defaultWarehouse) updateData[`warehouseStock.${defaultWarehouse.id}`] = stock
          await updateDoc(ref, updateData)
          break
        }
      }

      setFixed(prev => new Set(prev).add(issue.id))
    } catch (err) {
      console.error('Fix error:', err)
    }
    setFixing(null)
  }

  const handleFixAll = async () => {
    for (const issue of issues) {
      if (fixed.has(issue.id)) continue
      await handleFix(issue)
    }
  }

  const typeLabels: Record<string, { label: string; color: string }> = {
    orphan_stock: { label: 'Stock huerfano', color: 'bg-red-50 text-red-600' },
    no_warehouse: { label: 'Sin almacen', color: 'bg-amber-50 text-amber-600' },
    missing_combinations: { label: 'Sin combinaciones', color: 'bg-purple-50 text-purple-600' },
    stock_mismatch: { label: 'No coincide', color: 'bg-blue-50 text-blue-600' },
    dead_warehouse: { label: 'Almacen eliminado', color: 'bg-gray-100 text-gray-600' },
  }

  const unresolvedCount = issues.filter(i => !fixed.has(i.id)).length

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Diagnostico de stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unresolvedCount === 0 ? 'Todo en orden' : `${unresolvedCount} problema${unresolvedCount !== 1 ? 's' : ''} encontrado${unresolvedCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {unresolvedCount > 1 && (
          <button onClick={handleFixAll}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium">
            Corregir todo ({unresolvedCount})
          </button>
        )}
      </div>

      {issues.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-16 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Stock saludable</p>
          <p className="text-xs text-gray-400 mt-1">No se encontraron problemas en el inventario</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {issues.map(issue => {
              const isFixed = fixed.has(issue.id)
              const isFixing = fixing === issue.id
              const { label, color } = typeLabels[issue.type]

              return (
                <div key={issue.id} className={`px-4 py-3 ${isFixed ? 'opacity-40' : ''} transition-opacity`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {issue.productImage ? (
                        <img src={issue.productImage} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{issue.productName}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${color}`}>{label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{issue.description}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{issue.currentValue}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isFixed ? (
                        <span className="text-xs text-green-500 font-medium">Corregido</span>
                      ) : (
                        <button onClick={() => handleFix(issue)} disabled={isFixing}
                          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40">
                          {isFixing ? '...' : 'Corregir'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
