import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Order } from '../../types'

type Period = 'today' | '7d' | '30d' | 'month'

interface Expense {
  id: string
  amount: number
  category: string
  date: Date
}

export default function FinanceDashboard() {
  const { store } = useAuth()
  const [period, setPeriod] = useState<Period>('30d')
  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  const getStartDate = (p: Period) => {
    const now = new Date()
    switch (p) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case 'month': return new Date(now.getFullYear(), now.getMonth(), 1)
    }
  }

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      const startDate = getStartDate(period)
      try {
        const [ordersSnap, expensesSnap] = await Promise.all([
          getDocs(query(collection(db, `stores/${store.id}/orders`), where('createdAt', '>=', Timestamp.fromDate(startDate)), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/expenses`), where('date', '>=', Timestamp.fromDate(startDate)), orderBy('date', 'desc'))),
        ])
        setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setExpenses(expensesSnap.docs.map(d => {
          const data = d.data()
          return { id: d.id, amount: data.amount, category: data.category, date: data.date?.toDate?.() || new Date() }
        }))
      } catch {
        setOrders([])
        setExpenses([])
      }
      setLoading(false)
    }
    fetch()
  }, [store, period])

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'delivered')
    const cancelled = orders.filter(o => o.status === 'cancelled')
    const pending = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
    const totalRevenue = delivered.reduce((sum, o) => sum + (o.total || 0), 0)
    const pendingRevenue = pending.reduce((sum, o) => sum + (o.total || 0), 0)
    const avgTicket = delivered.length > 0 ? totalRevenue / delivered.length : 0
    const cancelRate = orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const balance = totalRevenue - totalExpenses

    return { totalOrders: orders.length, deliveredOrders: delivered.length, pendingOrders: pending.length, totalRevenue, pendingRevenue, avgTicket, cancelRate, totalExpenses, balance }
  }, [orders, expenses])

  // Daily revenue chart data
  const chartData = useMemo(() => {
    const days = period === 'today' ? 1 : period === '7d' ? 7 : period === 'month' ? 30 : 30
    const now = new Date()
    const data: { label: string; revenue: number; orders: number }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStr = date.toISOString().split('T')[0]
      const dayOrders = orders.filter(o => {
        const raw = o.createdAt as unknown
        const created = raw && typeof raw === 'object' && 'toDate' in (raw as Record<string, unknown>)
          ? (raw as Timestamp).toDate()
          : new Date(raw as string)
        return created.toISOString().split('T')[0] === dayStr && o.status === 'delivered'
      })
      data.push({
        label: date.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        orders: dayOrders.length,
      })
    }
    return data
  }, [orders, period])

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)

  // Top 5 products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {}
    orders.filter(o => o.status === 'delivered').forEach(o => {
      o.items?.forEach(item => {
        const key = item.productId
        if (!map[key]) map[key] = { name: item.productName, qty: 0, revenue: 0 }
        map[key].qty += item.quantity
        map[key].revenue += item.itemTotal || (item.price * item.quantity)
      })
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [orders])

  // Expense breakdown
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [expenses])

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: 'month', label: 'Este mes' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Resumen</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vista general de tu negocio</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
        </div>
      ) : (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <p className="text-[11px] text-gray-400 mb-1">Ingresos</p>
              <p className="text-xl font-semibold text-green-600">{fmt(stats.totalRevenue)}</p>
              <p className="text-[11px] text-gray-400 mt-1">{stats.deliveredOrders} ventas</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <p className="text-[11px] text-gray-400 mb-1">Gastos</p>
              <p className="text-xl font-semibold text-red-500">{fmt(stats.totalExpenses)}</p>
              <p className="text-[11px] text-gray-400 mt-1">{expenses.length} registros</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <p className="text-[11px] text-gray-400 mb-1">Balance</p>
              <p className={`text-xl font-semibold ${stats.balance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(stats.balance)}</p>
              <p className="text-[11px] text-gray-400 mt-1">Ingresos - Gastos</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <p className="text-[11px] text-gray-400 mb-1">Ticket promedio</p>
              <p className="text-xl font-semibold text-gray-900">{fmt(stats.avgTicket)}</p>
              <p className="text-[11px] text-gray-400 mt-1">por venta</p>
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200/60 p-3">
              <p className="text-[11px] text-gray-400 mb-0.5">Pedidos</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-3">
              <p className="text-[11px] text-gray-400 mb-0.5">Pendientes</p>
              <p className="text-lg font-semibold text-amber-600">{stats.pendingOrders}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-3">
              <p className="text-[11px] text-gray-400 mb-0.5">Conversion</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalOrders > 0 ? `${((stats.deliveredOrders / stats.totalOrders) * 100).toFixed(0)}%` : '0%'}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-3">
              <p className="text-[11px] text-gray-400 mb-0.5">Cancelacion</p>
              <p className="text-lg font-semibold text-gray-900">{stats.cancelRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Revenue chart + Top products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/60 p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Ventas por dia</h2>
              {chartData.length === 0 || maxRevenue === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin datos</div>
              ) : (
                <div className="flex items-end gap-[2px] h-40">
                  {chartData.map((d, i) => {
                    const height = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap">
                            {fmt(d.revenue)} · {d.orders} pedido{d.orders !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div
                          className={`w-full rounded-t transition-all ${d.revenue > 0 ? 'bg-[#1e3a5f] hover:bg-[#2d6cb5]' : 'bg-gray-100'}`}
                          style={{ height: `${Math.max(height, d.revenue > 0 ? 4 : 2)}%` }}
                        />
                        {/* Label every few days */}
                        {(chartData.length <= 7 || i % Math.ceil(chartData.length / 7) === 0) && (
                          <p className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">{d.label}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top products */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Top productos</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin ventas</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-gray-400">{p.qty} uds</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-700 flex-shrink-0 ml-2">{fmt(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expenses breakdown + Por cobrar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Expenses by category */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-900">Gastos por categoria</h2>
                <p className="text-xs text-gray-400">{fmt(stats.totalExpenses)}</p>
              </div>
              {expenseByCategory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin gastos</p>
              ) : (
                <div className="space-y-2.5">
                  {expenseByCategory.map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{cat}</span>
                        <span className="text-xs font-medium text-gray-700">{fmt(amount)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${(amount / stats.totalExpenses) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Por cobrar */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-900">Por cobrar</h2>
                <p className="text-xs font-medium text-amber-600">{fmt(stats.pendingRevenue)}</p>
              </div>
              {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin pedidos pendientes</p>
              ) : (
                <div className="space-y-2">
                  {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between py-1">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">#{order.orderNumber} - {order.customer?.name || 'Cliente'}</p>
                        <p className="text-[11px] text-gray-400">{order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Confirmado' : order.status === 'preparing' ? 'Preparando' : 'Listo'}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 flex-shrink-0 ml-2">{fmt(order.total || 0)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
