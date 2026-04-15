import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, Timestamp, limit as fbLimit, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { StockMovement } from '../../types'

type TypeFilter = 'all' | 'sale' | 'purchase' | 'adjustment' | 'production' | 'transfer'
type PeriodFilter = '7d' | '30d' | '90d' | 'all'

const TYPE_LABELS: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  production: 'Produccion',
  transfer: 'Transferencia',
}

const TYPE_COLORS: Record<string, string> = {
  sale: 'bg-blue-50 text-blue-600',
  purchase: 'bg-green-50 text-green-600',
  adjustment: 'bg-amber-50 text-amber-600',
  production: 'bg-purple-50 text-purple-600',
  transfer: 'bg-gray-100 text-gray-600',
}

export default function StockMovements() {
  const { store } = useAuth()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        let q = query(
          collection(db, `stores/${store.id}/stock_movements`),
          orderBy('createdAt', 'desc'),
          fbLimit(500)
        )

        if (periodFilter !== 'all') {
          const days = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : 90
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          q = query(
            collection(db, `stores/${store.id}/stock_movements`),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            orderBy('createdAt', 'desc'),
            fbLimit(500)
          )
        }

        const snap = await getDocs(q)
        setMovements(snap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as StockMovement
        }))
      } catch (err) {
        console.error(err)
        setMovements([])
      }
      setLoading(false)
    }
    fetch()
  }, [store, periodFilter])

  const filtered = useMemo(() => {
    let list = movements
    if (typeFilter !== 'all') list = list.filter(m => m.type === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.productName.toLowerCase().includes(q) ||
        m.reason?.toLowerCase().includes(q) ||
        m.optionValue?.toLowerCase().includes(q) ||
        m.variationName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [movements, typeFilter, search])

  const stats = useMemo(() => {
    const entries = movements.filter(m => m.quantity > 0).reduce((s, m) => s + m.quantity, 0)
    const exits = movements.filter(m => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0)
    return { total: movements.length, entries, exits }
  }, [movements])

  const typeFilters: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'sale', label: 'Ventas' },
    { key: 'purchase', label: 'Compras' },
    { key: 'adjustment', label: 'Ajustes' },
    { key: 'production', label: 'Produccion' },
    { key: 'transfer', label: 'Transferencias' },
  ]

  const periodFilters: { key: PeriodFilter; label: string }[] = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'all', label: 'Todo' },
  ]

  const formatDate = (d: Date) => {
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Hace un momento'
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`
    if (diff < 86400000 && now.getDate() === d.getDate()) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Movimientos de stock</h1>
        <p className="text-sm text-gray-500 mt-0.5">Historial de entradas y salidas de inventario</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200/60 p-3">
          <p className="text-[11px] text-gray-400 mb-1">Movimientos</p>
          <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-3">
          <p className="text-[11px] text-gray-400 mb-1">Entradas</p>
          <p className="text-lg font-semibold text-green-600">+{stats.entries}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-3">
          <p className="text-[11px] text-gray-400 mb-1">Salidas</p>
          <p className="text-lg font-semibold text-red-500">-{stats.exits}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por producto o motivo..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {periodFilters.map(p => (
            <button key={p.key} onClick={() => setPeriodFilter(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodFilter === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type pills */}
      <div className="flex items-center gap-1 flex-wrap">
        {typeFilters.map(f => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              typeFilter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Movements list */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">
              {movements.length === 0 ? 'Sin movimientos de stock registrados' : 'Sin resultados para los filtros seleccionados'}
            </p>
            {movements.length === 0 && (
              <p className="text-xs text-gray-300 mt-1">Los movimientos se crean automaticamente al ajustar stock, registrar compras o recibir pedidos</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(m => {
              const isPositive = m.quantity > 0
              const variantLabel = m.variationName && m.optionValue ? `${m.variationName}: ${m.optionValue}` : null

              return (
                <div key={m.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  {/* Mobile */}
                  <div className="sm:hidden space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[m.type] || 'bg-gray-100 text-gray-500'}`}>
                          {TYPE_LABELS[m.type] || m.type}
                        </span>
                        <p className="text-sm text-gray-900 truncate">{m.productName}</p>
                      </div>
                      <p className={`text-sm font-medium tabular-nums flex-shrink-0 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{m.quantity}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {variantLabel && <span>{variantLabel}</span>}
                        {m.reason && <span>{variantLabel ? '·' : ''} {m.reason}</span>}
                      </div>
                      <p className="text-[11px] text-gray-400">{formatDate(m.createdAt as Date)}</p>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[m.type] || 'bg-gray-100 text-gray-500'}`}>
                        {TYPE_LABELS[m.type] || m.type}
                      </span>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{m.productName}</p>
                      {variantLabel && <p className="text-[11px] text-gray-400">{variantLabel}</p>}
                    </div>
                    <div className="col-span-2 text-right">
                      <p className={`text-sm font-medium tabular-nums ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{m.quantity}
                      </p>
                    </div>
                    <div className="col-span-2 text-right text-xs text-gray-400 tabular-nums">
                      {m.previousStock} → {m.newStock}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{m.reason || '-'}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-[11px] text-gray-400">{formatDate(m.createdAt as Date)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
