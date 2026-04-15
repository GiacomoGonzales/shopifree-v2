import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Product, Warehouse, Branch } from '../../types'

export default function WarehousesPage() {
  const { store } = useAuth()
  const location = useLocation()
  const [branches, setBranches] = useState<Branch[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  // Branch form
  const [showBForm, setShowBForm] = useState(false)
  const [editingB, setEditingB] = useState<Branch | null>(null)
  const [bName, setBName] = useState('')
  const [bAddress, setBAddress] = useState('')
  const [bPhone, setBPhone] = useState('')
  const [savingB, setSavingB] = useState(false)

  // Warehouse form
  const [showWForm, setShowWForm] = useState(false)
  const [wParentBranch, setWParentBranch] = useState('')
  const [editingW, setEditingW] = useState<Warehouse | null>(null)
  const [wName, setWName] = useState('')
  const [wAddress, setWAddress] = useState('')
  const [savingW, setSavingW] = useState(false)

  // Expanded
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null)
  const [expandedWarehouse, setExpandedWarehouse] = useState<string | null>(null)

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        const [bSnap, wSnap, pSnap] = await Promise.all([
          getDocs(query(collection(db, `stores/${store.id}/branches`), orderBy('createdAt'))),
          getDocs(query(collection(db, `stores/${store.id}/warehouses`), orderBy('createdAt'))),
          getDocs(query(collection(db, `stores/${store.id}/products`), orderBy('name'))),
        ])
        let bList = bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Branch))
        let wList = wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))
        setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))

        // Auto-create default branch + warehouse ONLY if truly none exist
        if (bList.length === 0 && wList.length === 0) {
          const bRef = await addDoc(collection(db, `stores/${store.id}/branches`), {
            name: 'Principal',
            address: store.address || '',
            phone: store.whatsapp || '',
            active: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
          const newBranch: Branch = { id: bRef.id, name: 'Principal', address: store.address || '', phone: store.whatsapp || '', active: true, createdAt: new Date(), updatedAt: new Date() }
          bList = [newBranch]

          const wRef = await addDoc(collection(db, `stores/${store.id}/warehouses`), {
            name: 'Almacen Principal',
            address: store.address || '',
            branchId: bRef.id,
            branchName: 'Principal',
            isDefault: true,
            active: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
          wList = [{ id: wRef.id, name: 'Almacen Principal', address: store.address || '', branchId: bRef.id, branchName: 'Principal', isDefault: true, active: true, createdAt: new Date(), updatedAt: new Date() }]
        } else if (bList.length === 0 && wList.length > 0) {
          // Warehouses exist but no branches — create a default branch
          const bRef = await addDoc(collection(db, `stores/${store.id}/branches`), {
            name: 'Principal', address: store.address || '', phone: store.whatsapp || '',
            active: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
          })
          bList = [{ id: bRef.id, name: 'Principal', address: store.address || '', phone: store.whatsapp || '', active: true, createdAt: new Date(), updatedAt: new Date() }]
        }

        // Fix orphan warehouses — assign to first branch
        const orphans = wList.filter(w => !w.branchId)
        if (orphans.length > 0 && bList.length > 0) {
          const targetBranch = bList[0]
          for (const w of orphans) {
            await updateDoc(doc(db, `stores/${store.id}/warehouses`, w.id), { branchId: targetBranch.id, branchName: targetBranch.name })
            w.branchId = targetBranch.id
            w.branchName = targetBranch.name
          }

          // Clean up duplicate branches (keep only the one with warehouses)
          if (bList.length > 1) {
            const branchesWithWarehouses = new Set(wList.map(w => w.branchId))
            const toDelete = bList.filter(b => !branchesWithWarehouses.has(b.id))
            for (const b of toDelete) {
              await deleteDoc(doc(db, `stores/${store.id}/branches`, b.id))
            }
            bList = bList.filter(b => branchesWithWarehouses.has(b.id))
          }
        }

        setBranches(bList)
        setWarehouses(wList)
        if (bList.length > 0) setExpandedBranch(bList[0].id)
      } catch {
        setBranches([])
        setWarehouses([])
        setProducts([])
      }
      setLoading(false)
    }
    fetch()
  }, [store, location.key])

  const defaultWarehouse = warehouses.find(w => w.isDefault)

  // Stock per warehouse
  const warehouseStock = useMemo(() => {
    const map: Record<string, { units: number; products: number }> = {}
    warehouses.forEach(w => { map[w.id] = { units: 0, products: 0 } })

    products.forEach(p => {
      if (!p.trackStock || p.active === false) return
      const ws = (p as Product & { warehouseStock?: Record<string, number> }).warehouseStock
      if (ws) {
        Object.entries(ws).forEach(([wId, qty]) => {
          if (map[wId]) {
            map[wId].units += qty
            if (qty > 0) map[wId].products++
          }
        })
      } else if (defaultWarehouse && map[defaultWarehouse.id]) {
        map[defaultWarehouse.id].units += (p.stock ?? 0)
        if ((p.stock ?? 0) > 0) map[defaultWarehouse.id].products++
      }
    })
    return map
  }, [warehouses, products, defaultWarehouse])

  // Products for expanded warehouse
  const expandedProducts = useMemo(() => {
    if (!expandedWarehouse) return []
    return products
      .filter(p => p.trackStock && p.active !== false)
      .map(p => {
        const ws = (p as Product & { warehouseStock?: Record<string, number> }).warehouseStock
        let qty = 0
        if (ws && ws[expandedWarehouse] !== undefined) {
          qty = ws[expandedWarehouse]
        } else if (defaultWarehouse && expandedWarehouse === defaultWarehouse.id && !ws) {
          qty = p.stock ?? 0
        }
        return { ...p, warehouseQty: qty }
      })
      .filter(p => p.warehouseQty > 0)
  }, [expandedWarehouse, products, defaultWarehouse])

  // Sync stock to default warehouse
  const handleSync = async () => {
    if (!store || !defaultWarehouse || syncing) return
    setSyncing(true)
    try {
      const batch = writeBatch(db)
      products.filter(p => p.trackStock && p.active !== false).forEach(p => {
        batch.update(doc(db, `stores/${store.id}/products`, p.id), { warehouseStock: { [defaultWarehouse.id]: p.stock ?? 0 } })
      })
      await batch.commit()
      setProducts(prev => prev.map(p => {
        if (!p.trackStock || p.active === false) return p
        return { ...p, warehouseStock: { [defaultWarehouse.id]: p.stock ?? 0 } } as Product
      }))
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 3000)
    } catch (err) {
      console.error('Sync error:', err)
    }
    setSyncing(false)
  }

  // Branch CRUD
  const openBForm = (b?: Branch) => {
    setEditingB(b || null)
    setBName(b?.name || '')
    setBAddress(b?.address || '')
    setBPhone(b?.phone || '')
    setShowBForm(true)
  }

  const saveBranch = async () => {
    if (!store || !bName.trim()) return
    setSavingB(true)
    try {
      const data = { name: bName.trim(), address: bAddress.trim(), phone: bPhone.trim(), active: true, updatedAt: Timestamp.now() }
      if (editingB) {
        await updateDoc(doc(db, `stores/${store.id}/branches`, editingB.id), data)
        setBranches(prev => prev.map(b => b.id === editingB.id ? { ...b, ...data, updatedAt: new Date() } : b))
        // Update denormalized branchName in warehouses
        setWarehouses(prev => prev.map(w => w.branchId === editingB.id ? { ...w, branchName: data.name } : w))
      } else {
        const ref = await addDoc(collection(db, `stores/${store.id}/branches`), { ...data, createdAt: Timestamp.now() })
        setBranches(prev => [...prev, { id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() } as Branch])
      }
      setShowBForm(false)
    } catch (err) {
      console.error(err)
    }
    setSavingB(false)
  }

  const deleteBranch = async (b: Branch) => {
    if (!store) return
    const hasWarehouses = warehouses.some(w => w.branchId === b.id)
    if (hasWarehouses) return alert('No puedes eliminar una sucursal que tiene almacenes. Elimina los almacenes primero.')
    try {
      await deleteDoc(doc(db, `stores/${store.id}/branches`, b.id))
      setBranches(prev => prev.filter(x => x.id !== b.id))
    } catch (err) {
      console.error(err)
    }
  }

  // Warehouse CRUD
  const openWForm = (branchId: string, w?: Warehouse) => {
    setWParentBranch(branchId)
    setEditingW(w || null)
    setWName(w?.name || '')
    setWAddress(w?.address || '')
    setShowWForm(true)
  }

  const saveWarehouse = async () => {
    if (!store || !wName.trim() || !wParentBranch) return
    setSavingW(true)
    try {
      const branch = branches.find(b => b.id === wParentBranch)
      const data = {
        name: wName.trim(),
        address: wAddress.trim(),
        branchId: wParentBranch,
        branchName: branch?.name || '',
        isDefault: editingW?.isDefault || warehouses.length === 0,
        active: true,
        updatedAt: Timestamp.now(),
      }
      if (editingW) {
        await updateDoc(doc(db, `stores/${store.id}/warehouses`, editingW.id), data)
        setWarehouses(prev => prev.map(w => w.id === editingW.id ? { ...w, ...data, updatedAt: new Date() } : w))
      } else {
        const ref = await addDoc(collection(db, `stores/${store.id}/warehouses`), { ...data, createdAt: Timestamp.now() })
        setWarehouses(prev => [...prev, { id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() } as Warehouse])
      }
      setShowWForm(false)
    } catch (err) {
      console.error(err)
    }
    setSavingW(false)
  }

  const deleteWarehouse = async (w: Warehouse) => {
    if (!store) return
    // Only protect if it's the LAST warehouse
    if (warehouses.length <= 1) return
    try {
      await deleteDoc(doc(db, `stores/${store.id}/warehouses`, w.id))
      setWarehouses(prev => prev.filter(x => x.id !== w.id))
    } catch (err) {
      console.error(err)
    }
  }

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
          <h1 className="text-xl font-semibold text-gray-900">Almacenes y Sucursales</h1>
          <p className="text-sm text-gray-500 mt-0.5">{branches.length} sucursal{branches.length !== 1 ? 'es' : ''}, {warehouses.length} almacen{warehouses.length !== 1 ? 'es' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {syncing ? 'Sincronizando...' : syncDone ? 'Sincronizado' : 'Sincronizar stock'}
          </button>
          <button
            onClick={() => openBForm()}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium"
          >
            + Sucursal
          </button>
        </div>
      </div>

      {/* Branch form */}
      {showBForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-3 animate-[slideDown_0.2s_ease-out]">
          <h3 className="text-sm font-medium text-gray-900">{editingB ? 'Editar sucursal' : 'Nueva sucursal'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
              <input type="text" value={bName} onChange={e => setBName(e.target.value)} placeholder="Ej: Sucursal Centro"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Direccion</label>
              <input type="text" value={bAddress} onChange={e => setBAddress(e.target.value)} placeholder="Opcional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Telefono</label>
              <input type="text" value={bPhone} onChange={e => setBPhone(e.target.value)} placeholder="Opcional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowBForm(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={saveBranch} disabled={savingB || !bName.trim()}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
              {savingB ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Warehouse form */}
      {showWForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-3 animate-[slideDown_0.2s_ease-out]">
          <h3 className="text-sm font-medium text-gray-900">{editingW ? 'Editar almacen' : 'Nuevo almacen'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
              <input type="text" value={wName} onChange={e => setWName(e.target.value)} placeholder="Ej: Almacen Norte"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Direccion</label>
              <input type="text" value={wAddress} onChange={e => setWAddress(e.target.value)} placeholder="Opcional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowWForm(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={saveWarehouse} disabled={savingW || !wName.trim()}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
              {savingW ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Branches with nested warehouses */}
      <div className="space-y-3">
        {branches.map(branch => {
          const branchWarehouses = warehouses.filter(w => w.branchId === branch.id)
          const isOpen = expandedBranch === branch.id
          const branchUnits = branchWarehouses.reduce((sum, w) => sum + (warehouseStock[w.id]?.units || 0), 0)

          return (
            <div key={branch.id} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
              {/* Branch header */}
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedBranch(isOpen ? null : branch.id)}
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-md">
                        {branchWarehouses.length} almacen{branchWarehouses.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {branch.address && <p className="text-xs text-gray-400 mt-0.5">{branch.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{branchUnits}</p>
                    <p className="text-[11px] text-gray-400">unidades</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={e => { e.stopPropagation(); openBForm(branch) }}
                      className="p-1.5 text-gray-300 hover:text-gray-500 rounded-md hover:bg-gray-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    {branches.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); deleteBranch(branch) }}
                        className="p-1.5 text-gray-300 hover:text-red-400 rounded-md hover:bg-gray-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded: warehouses inside this branch */}
              {isOpen && (
                <div className="border-t border-gray-100">
                  {branchWarehouses.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-400">Sin almacenes en esta sucursal</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {branchWarehouses.map(w => {
                        const wStats = warehouseStock[w.id] || { units: 0, products: 0 }
                        const isWOpen = expandedWarehouse === w.id

                        return (
                          <div key={w.id}>
                            <div
                              className="px-4 py-2.5 pl-12 flex items-center justify-between cursor-pointer hover:bg-gray-50/30 transition-colors"
                              onClick={() => setExpandedWarehouse(isWOpen ? null : w.id)}
                            >
                              <div className="flex items-center gap-2.5">
                                <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${isWOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-700">{w.name}</p>
                                    {w.isDefault && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-md">Principal</span>}
                                  </div>
                                  {w.address && <p className="text-[11px] text-gray-400">{w.address}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-xs font-medium text-gray-700">{wStats.units} uds</p>
                                  <p className="text-[10px] text-gray-400">{wStats.products} prod.</p>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button onClick={e => { e.stopPropagation(); openWForm(branch.id, w) }}
                                    className="p-1 text-gray-300 hover:text-gray-500 rounded-md hover:bg-gray-100 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                    </svg>
                                  </button>
                                  {warehouses.length > 1 && (
                                    <button onClick={e => { e.stopPropagation(); deleteWarehouse(w) }}
                                      className="p-1 text-gray-300 hover:text-red-400 rounded-md hover:bg-gray-100 transition-colors">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Products in warehouse */}
                            {isWOpen && (
                              <div className="bg-gray-50/40 border-t border-gray-100">
                                {expandedProducts.length === 0 ? (
                                  <p className="px-4 py-4 text-xs text-gray-400 text-center pl-16">Sin productos</p>
                                ) : (
                                  <div className="divide-y divide-gray-50">
                                    {expandedProducts.map(p => (
                                      <div key={p.id} className="px-4 py-2 pl-16 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {p.image ? (
                                            <img src={p.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                                          ) : (
                                            <div className="w-7 h-7 rounded bg-gray-100 flex-shrink-0" />
                                          )}
                                          <p className="text-xs text-gray-600 truncate">{p.name}</p>
                                        </div>
                                        <p className="text-xs font-medium text-gray-700 flex-shrink-0 ml-3">{p.warehouseQty}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Add warehouse button */}
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button
                      onClick={() => openWForm(branch.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors pl-8"
                    >
                      + Agregar almacen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
