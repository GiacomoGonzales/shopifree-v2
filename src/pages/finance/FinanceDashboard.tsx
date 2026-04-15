import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Order } from '../../types'

type Period = 'today' | '7d' | '30d' | 'month'

export default function FinanceDashboard() {
  const { store } = useAuth()
  const [period, setPeriod] = useState<Period>('30d')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch orders for the selected period
  useEffect(() => {
    if (!store) return
    const fetchOrders = async () => {
      setLoading(true)
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
      }

      try {
        const q = query(
          collection(db, `stores/${store.id}/orders`),
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
        setOrders(data)
      } catch {
        setOrders([])
      }
      setLoading(false)
    }
    fetchOrders()
  }, [store, period])

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'delivered')
    const cancelled = orders.filter(o => o.status === 'cancelled')
    const pending = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))

    const totalRevenue = delivered.reduce((sum, o) => sum + (o.total || 0), 0)
    const pendingRevenue = pending.reduce((sum, o) => sum + (o.total || 0), 0)
    const avgTicket = delivered.length > 0 ? totalRevenue / delivered.length : 0
    const cancelRate = orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0

    return {
      totalOrders: orders.length,
      deliveredOrders: delivered.length,
      totalRevenue,
      pendingRevenue,
      avgTicket,
      cancelRate,
    }
  }, [orders])

  const currency = store?.currency || 'PEN'

  const fmt = (n: number) => {
    return new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  }

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: 'month', label: 'Este mes' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen financiero de tu negocio</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
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
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard
              label="Ingresos"
              value={fmt(stats.totalRevenue)}
              sub={`${stats.deliveredOrders} ventas completadas`}
              color="green"
            />
            <StatCard
              label="Por cobrar"
              value={fmt(stats.pendingRevenue)}
              sub={`${stats.totalOrders - stats.deliveredOrders} pedidos pendientes`}
              color="amber"
            />
            <StatCard
              label="Ticket promedio"
              value={fmt(stats.avgTicket)}
              sub={`sobre ${stats.deliveredOrders} ventas`}
              color="blue"
            />
          </div>

          {/* Quick metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniCard label="Pedidos totales" value={String(stats.totalOrders)} />
            <MiniCard label="Completados" value={String(stats.deliveredOrders)} />
            <MiniCard label="Tasa de cancelacion" value={`${stats.cancelRate.toFixed(1)}%`} />
            <MiniCard label="Conversion" value={stats.totalOrders > 0 ? `${((stats.deliveredOrders / stats.totalOrders) * 100).toFixed(0)}%` : '0%'} />
          </div>

          {/* Recent transactions */}
          <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200/60">
              <h2 className="text-sm font-medium text-gray-900">Ultimas transacciones</h2>
            </div>
            {orders.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                No hay transacciones en este periodo
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.slice(0, 10).map(order => (
                  <div key={order.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        order.status === 'delivered' ? 'bg-green-500' :
                        order.status === 'cancelled' ? 'bg-red-400' :
                        'bg-amber-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          #{order.orderNumber} - {order.customer?.name || 'Cliente'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {order.createdAt && (typeof order.createdAt === 'object' && 'toDate' in (order.createdAt as unknown as Record<string, unknown>)
                            ? ((order.createdAt as unknown as Timestamp).toDate()).toLocaleDateString('es')
                            : new Date(order.createdAt as unknown as string).toLocaleDateString('es')
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-medium ${
                        order.status === 'delivered' ? 'text-green-600' :
                        order.status === 'cancelled' ? 'text-gray-400 line-through' :
                        'text-gray-900'
                      }`}>
                        {fmt(order.total || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'green' | 'amber' | 'blue' }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${colors[color].split(' ')[0].replace('bg-', 'bg-').replace('-50', '-500')}`} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-3">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}
