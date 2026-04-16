import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Supplier, Purchase } from '../../types'

type SortKey = 'name' | 'spend' | 'recent'
type StatusFilter = 'active' | 'archived' | 'all'

interface SupplierStats {
  totalSpend: number
  spendLast30: number
  purchaseCount: number
  lastPurchaseDate: Date | null
  topProduct: { name: string; quantity: number } | null
  recent: Purchase[]
}

const EMPTY_STATS: SupplierStats = {
  totalSpend: 0,
  spendLast30: 0,
  purchaseCount: 0,
  lastPurchaseDate: null,
  topProduct: null,
  recent: [],
}

export default function Suppliers() {
  const { store } = useAuth()
  const { localePath } = useLanguage()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  const fmtDate = (d: Date) => d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        const [supSnap, purSnap] = await Promise.all([
          getDocs(query(collection(db, `stores/${store.id}/suppliers`), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/purchases`), orderBy('date', 'desc'))),
        ])
        setSuppliers(supSnap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          } as Supplier
        }))
        setPurchases(purSnap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            date: data.date?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          } as Purchase
        }))
      } catch {
        setSuppliers([])
        setPurchases([])
      }
      setLoading(false)
    }
    fetch()
  }, [store])

  const resetForm = () => {
    setName(''); setContactName(''); setPhone(''); setEmail(''); setAddress(''); setNotes('')
    setEditing(null)
  }

  const openForm = (s?: Supplier) => {
    if (s) {
      setEditing(s)
      setName(s.name)
      setContactName(s.contactName || '')
      setPhone(s.phone || '')
      setEmail(s.email || '')
      setAddress(s.address || '')
      setNotes(s.notes || '')
    } else {
      resetForm()
    }
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!store || !name.trim()) return
    setSaving(true)
    try {
      const data: Record<string, unknown> = {
        name: name.trim(),
        updatedAt: Timestamp.now(),
      }
      if (contactName.trim()) data.contactName = contactName.trim()
      if (phone.trim()) data.phone = phone.trim()
      if (email.trim()) data.email = email.trim()
      if (address.trim()) data.address = address.trim()
      if (notes.trim()) data.notes = notes.trim()

      if (editing) {
        await updateDoc(doc(db, `stores/${store.id}/suppliers`, editing.id), data)
        setSuppliers(prev => prev.map(s => s.id === editing.id ? { ...s, ...data, updatedAt: new Date() } as Supplier : s))
      } else {
        data.active = true
        const ref = await addDoc(collection(db, `stores/${store.id}/suppliers`), { ...data, createdAt: Timestamp.now() })
        setSuppliers(prev => [{ id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() } as Supplier, ...prev])
      }
      setShowForm(false)
      resetForm()
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  // Archive / unarchive — safer than hard delete since purchases reference the supplier
  const toggleArchive = async (s: Supplier) => {
    if (!store) return
    const nextActive = !(s.active !== false)  // treat undefined as active
    try {
      await updateDoc(doc(db, `stores/${store.id}/suppliers`, s.id), {
        active: nextActive,
        updatedAt: Timestamp.now(),
      })
      setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, active: nextActive, updatedAt: new Date() } as Supplier : x))
    } catch (err) {
      console.error(err)
    }
  }

  // Compute stats per supplier from purchases
  const statsById = useMemo(() => {
    const now = Date.now()
    const days30 = 30 * 24 * 60 * 60 * 1000

    interface Accumulator {
      totalSpend: number
      spendLast30: number
      purchaseCount: number
      lastPurchaseDate: Date | null
      recent: Purchase[]
      productQty: Map<string, { name: string; quantity: number }>
    }

    const acc = new Map<string, Accumulator>()

    for (const p of purchases) {
      if (p.status === 'cancelled') continue
      const sid = p.supplierId
      if (!sid) continue
      const curr: Accumulator = acc.get(sid) || {
        totalSpend: 0,
        spendLast30: 0,
        purchaseCount: 0,
        lastPurchaseDate: null,
        recent: [],
        productQty: new Map(),
      }

      curr.totalSpend += p.total || 0
      if (now - p.date.getTime() <= days30) curr.spendLast30 += p.total || 0
      curr.purchaseCount += 1
      if (!curr.lastPurchaseDate || p.date > curr.lastPurchaseDate) curr.lastPurchaseDate = p.date
      curr.recent.push(p)

      for (const item of (p.items || [])) {
        const prev = curr.productQty.get(item.productId) || { name: item.productName, quantity: 0 }
        prev.quantity += item.quantity
        curr.productQty.set(item.productId, prev)
      }

      acc.set(sid, curr)
    }

    // Finalize: sort recent, pick topProduct
    const final = new Map<string, SupplierStats>()
    acc.forEach((v, k) => {
      let topProduct: { name: string; quantity: number } | null = null
      v.productQty.forEach(p => {
        if (!topProduct || p.quantity > topProduct.quantity) topProduct = p
      })
      final.set(k, {
        totalSpend: v.totalSpend,
        spendLast30: v.spendLast30,
        purchaseCount: v.purchaseCount,
        lastPurchaseDate: v.lastPurchaseDate,
        topProduct,
        recent: v.recent.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5),
      })
    })
    return final
  }, [purchases])

  const getStats = (id: string): SupplierStats => statsById.get(id) || EMPTY_STATS

  // Summary for top cards
  const summary = useMemo(() => {
    const now = Date.now()
    const days30 = 30 * 24 * 60 * 60 * 1000
    const active = suppliers.filter(s => s.active !== false).length
    let spendLast30 = 0
    for (const p of purchases) {
      if (p.status === 'cancelled') continue
      if (now - p.date.getTime() <= days30) spendLast30 += p.total || 0
    }
    // Top supplier by total spend
    let topName = ''
    let topSpend = 0
    suppliers.forEach(s => {
      const st = getStats(s.id)
      if (st.totalSpend > topSpend) {
        topSpend = st.totalSpend
        topName = s.name
      }
    })
    return { active, spendLast30, topName, topSpend }
  }, [suppliers, purchases, statsById])  // eslint-disable-line react-hooks/exhaustive-deps

  // Filter + sort
  const visible = useMemo(() => {
    let list = suppliers
    if (statusFilter === 'active') list = list.filter(s => s.active !== false)
    else if (statusFilter === 'archived') list = list.filter(s => s.active === false)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q)
        || (s.contactName || '').toLowerCase().includes(q)
        || (s.phone || '').includes(q)
        || (s.email || '').toLowerCase().includes(q)
      )
    }

    const sorted = [...list]
    if (sortKey === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortKey === 'spend') {
      sorted.sort((a, b) => getStats(b.id).totalSpend - getStats(a.id).totalSpend)
    } else if (sortKey === 'recent') {
      sorted.sort((a, b) => {
        const la = getStats(a.id).lastPurchaseDate?.getTime() || 0
        const lb = getStats(b.id).lastPurchaseDate?.getTime() || 0
        return lb - la
      })
    }
    return sorted
  }, [suppliers, search, sortKey, statusFilter, statsById])  // eslint-disable-line react-hooks/exhaustive-deps

  const archivedCount = suppliers.filter(s => s.active === false).length
  const activeCount = suppliers.filter(s => s.active !== false).length

  const daysSince = (d: Date | null): string => {
    if (!d) return 'Nunca'
    const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 30) return `Hace ${days} d`
    if (days < 365) return `Hace ${Math.floor(days / 30)} m`
    return `Hace ${Math.floor(days / 365)} a`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} activo{activeCount !== 1 ? 's' : ''}
            {archivedCount > 0 && <span className="text-gray-400"> · {archivedCount} archivado{archivedCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button onClick={() => openForm()}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium">
          + Nuevo proveedor
        </button>
      </div>

      {/* Summary */}
      {suppliers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-400 mb-1">Proveedores activos</p>
            <p className="text-xl font-semibold text-gray-900">{summary.active}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {purchases.length} compra{purchases.length !== 1 ? 's' : ''} registradas
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-400 mb-1">Compras ultimos 30 dias</p>
            <p className="text-xl font-semibold text-gray-900">{fmt(summary.spendLast30)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              <Link to={localePath('/finance/purchases')} className="text-blue-500 hover:text-blue-700">Ver compras →</Link>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-400 mb-1">Proveedor principal</p>
            <p className="text-xl font-semibold text-gray-900 truncate">{summary.topName || '—'}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{summary.topSpend > 0 ? fmt(summary.topSpend) : 'Sin datos'}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {suppliers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, contacto o email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
          </div>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
            <option value="spend">Mayor gasto</option>
            <option value="recent">Mas recientes</option>
            <option value="name">Alfabetico</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
            <option value="active">Activos</option>
            <option value="archived">Archivados</option>
            <option value="all">Todos</option>
          </select>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-3 animate-[slideDown_0.2s_ease-out]">
          <h3 className="text-sm font-medium text-gray-900">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre de la empresa *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Distribuidora Lima"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Persona de contacto</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ej: Carlos Perez"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Telefono</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+51 999 999 999"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="proveedor@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Direccion</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Av. Principal 123, Lima"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Productos que provee, condiciones de pago, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm() }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">
              {suppliers.length === 0 ? 'Sin proveedores registrados' : 'Sin resultados'}
            </p>
            {suppliers.length === 0 && <p className="text-xs text-gray-300 mt-1">Agrega tu primer proveedor para gestionar tus compras</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map(s => {
              const isOpen = expandedId === s.id
              const st = getStats(s.id)
              const isArchived = s.active === false
              return (
                <div key={s.id} className={isArchived ? 'opacity-60' : ''}>
                  <div
                    className="px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-500">{s.name[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                          {isArchived && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded">Archivado</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {s.contactName || s.phone || s.email || 'Sin datos de contacto'}
                        </p>
                      </div>

                      {/* Inline stats (hidden on small mobile) */}
                      <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
                        <InlineStat label="Gastado" value={st.totalSpend > 0 ? fmt(st.totalSpend) : '—'} />
                        <InlineStat label="Compras" value={String(st.purchaseCount)} />
                        <InlineStat label="Ultima" value={daysSince(st.lastPurchaseDate)} />
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); openForm(s) }}
                          className="p-1.5 text-gray-300 hover:text-blue-500 rounded-md hover:bg-gray-100 transition-colors"
                          title="Editar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button onClick={e => { e.stopPropagation(); toggleArchive(s) }}
                          className="p-1.5 text-gray-300 hover:text-amber-500 rounded-md hover:bg-gray-100 transition-colors"
                          title={isArchived ? 'Restaurar' : 'Archivar'}>
                          {isArchived ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                            </svg>
                          )}
                        </button>
                        <svg className={`w-4 h-4 text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Mobile stats row */}
                    <div className="sm:hidden flex items-center gap-3 mt-2 pl-12 text-[11px] text-gray-500">
                      {st.totalSpend > 0 && <span className="tabular-nums">{fmt(st.totalSpend)}</span>}
                      <span>·</span>
                      <span>{st.purchaseCount} compras</span>
                      <span>·</span>
                      <span>{daysSince(st.lastPurchaseDate)}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 pl-4 sm:pl-16 space-y-4 bg-gray-50/30 animate-[slideDown_0.15s_ease-out]">
                      {/* Stats grid */}
                      {st.purchaseCount > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                          <DetailStat label="Gastado total" value={fmt(st.totalSpend)} />
                          <DetailStat label="Ultimos 30 dias" value={fmt(st.spendLast30)} />
                          <DetailStat label="Compras" value={String(st.purchaseCount)} />
                          <DetailStat label="Ultima compra" value={st.lastPurchaseDate ? fmtDate(st.lastPurchaseDate) : '—'} />
                        </div>
                      )}

                      {/* Top product */}
                      {st.topProduct && (
                        <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-gray-400 mb-0.5">Producto mas comprado</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-800 truncate">{st.topProduct.name}</p>
                            <p className="text-xs text-gray-500 tabular-nums flex-shrink-0 ml-2">{st.topProduct.quantity} uds</p>
                          </div>
                        </div>
                      )}

                      {/* Recent purchases */}
                      {st.recent.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Compras recientes</p>
                            <Link to={localePath('/finance/purchases')} className="text-[11px] text-blue-500 hover:text-blue-700">Ver todas →</Link>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-lg divide-y divide-gray-50">
                            {st.recent.map(p => (
                              <div key={p.id} className="px-3 py-2 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-800">{fmtDate(p.date)}</p>
                                  <p className="text-[11px] text-gray-400">
                                    {p.items.length} ite{p.items.length !== 1 ? 'ms' : 'm'}
                                    {p.status === 'cancelled' && <span className="ml-1 text-red-400">· cancelada</span>}
                                  </p>
                                </div>
                                <p className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0 ml-2">{fmt(p.total || 0)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact data */}
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">Contacto</p>
                        <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 space-y-1">
                          {(s.contactName || s.phone || s.email || s.address) ? (
                            <>
                              {s.contactName && <ContactRow label="Persona" value={s.contactName} />}
                              {s.phone && <ContactRow label="Telefono" value={<a href={`tel:${s.phone}`} className="text-blue-500 hover:text-blue-700">{s.phone}</a>} />}
                              {s.email && <ContactRow label="Email" value={<a href={`mailto:${s.email}`} className="text-blue-500 hover:text-blue-700">{s.email}</a>} />}
                              {s.address && <ContactRow label="Direccion" value={s.address} />}
                            </>
                          ) : (
                            <p className="text-xs text-gray-400">Sin datos de contacto</p>
                          )}
                        </div>
                      </div>

                      {s.notes && (
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">Notas</p>
                          <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-600 whitespace-pre-wrap">{s.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-700 tabular-nums">{value}</p>
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}

function ContactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-400 w-20 flex-shrink-0">{label}</span>
      <span className="text-gray-700 min-w-0">{value}</span>
    </div>
  )
}
