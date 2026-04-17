import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Order, Product } from '../../types'

type Period = 'today' | '7d' | '30d' | 'month'

interface Expense {
  id: string
  amount: number
  category: string
  date: Date
  isRecurring?: boolean
  recurringFrequency?: 'weekly' | 'monthly'
}

interface PeriodStats {
  income: number        // = collected (cash basis for P&L)
  invoiced: number      // delivered orders (ventas)
  collected: number     // paid orders (dinero cobrado)
  receivable: number    // facturado pendiente de cobro
  cogs: number
  grossProfit: number
  opex: number
  netProfit: number
  grossMarginPct: number
  netMarginPct: number
  deliveredCount: number
  paidCount: number
  avgTicket: number
  pendingCount: number
  pendingRevenue: number
  cancelledCount: number
}

function computeStats(orders: Order[], expenses: Expense[], products: Product[]): PeriodStats {
  const costById = new Map<string, number>()
  products.forEach(p => costById.set(p.id, p.cost || 0))

  const valid = orders.filter(o => o.status !== 'cancelled')
  const delivered = orders.filter(o => o.status === 'delivered')
  const paid = valid.filter(o => o.paymentStatus === 'paid')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const pending = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))

  const invoiced = delivered.reduce((sum, o) => sum + (o.total || 0), 0)
  const collected = paid.reduce((sum, o) => sum + (o.total || 0), 0)
  const income = collected  // cash basis

  const cogs = paid.reduce((sum, o) => {
    const orderCost = (o.items || []).reduce((s, item) => {
      const unitCost = costById.get(item.productId) || 0
      return s + unitCost * item.quantity
    }, 0)
    return sum + orderCost
  }, 0)

  const receivable = valid
    .filter(o => o.status !== 'pending' && o.paymentStatus !== 'paid' && o.paymentStatus !== 'refunded')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  const opex = expenses.filter(e => e.category !== 'Inventario').reduce((sum, e) => sum + e.amount, 0)

  const grossProfit = income - cogs
  const netProfit = grossProfit - opex

  return {
    income,
    invoiced,
    collected,
    receivable,
    cogs,
    grossProfit,
    opex,
    netProfit,
    grossMarginPct: income > 0 ? (grossProfit / income) * 100 : 0,
    netMarginPct: income > 0 ? (netProfit / income) * 100 : 0,
    deliveredCount: delivered.length,
    paidCount: paid.length,
    avgTicket: delivered.length > 0 ? invoiced / delivered.length : 0,
    pendingCount: pending.length,
    pendingRevenue: pending.reduce((s, o) => s + (o.total || 0), 0),
    cancelledCount: cancelled.length,
  }
}

const periodDays: Record<Period, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  month: 30,
}

function getStartDate(p: Period): Date {
  const now = new Date()
  switch (p) {
    case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

function getPreviousStartEnd(p: Period): { start: Date; end: Date } {
  const now = new Date()
  const currStart = getStartDate(p)
  if (p === 'month') {
    // Previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { start: prevMonth, end: currStart }
  }
  // today / 7d / 30d : same-length window before current
  const days = periodDays[p]
  const prevStart = new Date(currStart.getTime() - days * 24 * 60 * 60 * 1000)
  return { start: prevStart, end: currStart }
}

interface Delta { pct: number; direction: 'up' | 'down' | 'flat' }

function computeDelta(curr: number, prev: number): Delta {
  if (prev === 0) return { pct: curr === 0 ? 0 : 100, direction: curr > 0 ? 'up' : 'flat' }
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  return { pct, direction: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' }
}

export default function FinanceDashboard() {
  const { store } = useAuth()
  const { localePath } = useLanguage()
  const [period, setPeriod] = useState<Period>('30d')
  const [orders, setOrders] = useState<Order[]>([])
  const [previousOrders, setPreviousOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [previousExpenses, setPreviousExpenses] = useState<Expense[]>([])
  const [allRecurringExpenses, setAllRecurringExpenses] = useState<Expense[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      const startDate = getStartDate(period)
      const { start: prevStart, end: prevEnd } = getPreviousStartEnd(period)

      const parseExpense = (d: { id: string; data: () => Record<string, unknown> }): Expense => {
        const raw = d.data() as Record<string, unknown> & { date?: { toDate?: () => Date } | string }
        return {
          id: d.id,
          amount: Number(raw.amount || 0),
          category: String(raw.category || 'Otro'),
          date: typeof raw.date === 'object' && raw.date?.toDate ? raw.date.toDate() : new Date(raw.date as string),
          isRecurring: Boolean(raw.isRecurring),
          recurringFrequency: raw.recurringFrequency as 'weekly' | 'monthly' | undefined,
        }
      }

      try {
        const [ordSnap, prevOrdSnap, expSnap, prevExpSnap, allRecurringSnap, prodSnap] = await Promise.all([
          getDocs(query(collection(db, `stores/${store.id}/orders`), where('createdAt', '>=', Timestamp.fromDate(startDate)), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/orders`), where('createdAt', '>=', Timestamp.fromDate(prevStart)), where('createdAt', '<', Timestamp.fromDate(prevEnd)), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/expenses`), where('date', '>=', Timestamp.fromDate(startDate)), orderBy('date', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/expenses`), where('date', '>=', Timestamp.fromDate(prevStart)), where('date', '<', Timestamp.fromDate(prevEnd)), orderBy('date', 'desc'))),
          getDocs(query(collection(db, `stores/${store.id}/expenses`), where('isRecurring', '==', true))),
          getDocs(collection(db, `stores/${store.id}/products`)),
        ])

        setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setPreviousOrders(prevOrdSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setExpenses(expSnap.docs.map(parseExpense))
        setPreviousExpenses(prevExpSnap.docs.map(parseExpense))
        setAllRecurringExpenses(allRecurringSnap.docs.map(parseExpense))
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
      } catch {
        setOrders([])
        setPreviousOrders([])
        setExpenses([])
        setPreviousExpenses([])
        setAllRecurringExpenses([])
        setProducts([])
      }
      setLoading(false)
    }
    fetch()
  }, [store, period])

  const current = useMemo(() => computeStats(orders, expenses, products), [orders, expenses, products])
  const previous = useMemo(() => computeStats(previousOrders, previousExpenses, products), [previousOrders, previousExpenses, products])

  const incomeDelta = computeDelta(current.income, previous.income)
  const netDelta = computeDelta(current.netProfit, previous.netProfit)
  const opexDelta = computeDelta(current.opex, previous.opex)
  const ticketDelta = computeDelta(current.avgTicket, previous.avgTicket)

  // Fixed monthly expenses (from all recurring, not filtered by period)
  const fixedMonthly = useMemo(() => {
    return allRecurringExpenses.reduce((sum, e) => {
      if (e.recurringFrequency === 'weekly') return sum + e.amount * 4.33
      return sum + e.amount
    }, 0)
  }, [allRecurringExpenses])

  // Chart: income vs expense by day
  const chartData = useMemo(() => {
    const days = period === 'today' ? 1 : period === 'month' ? Math.max(1, new Date().getDate()) : periodDays[period]
    const now = new Date()
    const data: { label: string; income: number; expenses: number }[] = []

    const orderDate = (o: Order): Date => {
      const raw = o.createdAt as unknown
      return raw && typeof raw === 'object' && 'toDate' in (raw as Record<string, unknown>)
        ? (raw as Timestamp).toDate()
        : new Date(raw as string)
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStr = date.toISOString().split('T')[0]
      const income = orders
        .filter(o => o.status === 'delivered' && orderDate(o).toISOString().split('T')[0] === dayStr)
        .reduce((s, o) => s + (o.total || 0), 0)
      const dayExpenses = expenses
        .filter(e => e.category !== 'Inventario' && e.date.toISOString().split('T')[0] === dayStr)
        .reduce((s, e) => s + e.amount, 0)
      data.push({
        label: date.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        income,
        expenses: dayExpenses,
      })
    }
    return data
  }, [orders, expenses, period])

  const maxBar = Math.max(...chartData.map(d => Math.max(d.income, d.expenses)), 1)

  // Top 5 products by revenue
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

  // OPEX breakdown (excludes Inventario)
  const opexByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.filter(e => e.category !== 'Inventario').forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount
    })
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [expenses])

  const pendingOrders = useMemo(
    () => orders.filter(o => !['delivered', 'cancelled'].includes(o.status)),
    [orders]
  )

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: 'month', label: 'Este mes' },
  ]

  const conversionPct = orders.length > 0 ? (current.deliveredCount / orders.length) * 100 : 0
  const cancelPct = orders.length > 0 ? (current.cancelledCount / orders.length) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Resumen</h1>
          <p className="text-sm text-gray-500 mt-0.5">Panel de control financiero</p>
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
          {/* Main KPIs with period-over-period */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard
              label="Cobrado"
              value={fmt(current.collected)}
              sub={current.receivable > 0 ? `facturado ${fmt(current.invoiced)}` : `${current.paidCount} pagos`}
              delta={incomeDelta}
              fmtPct={fmtPct}
              accent="green"
            />
            <KPICard label="Utilidad neta" value={fmt(current.netProfit)} sub={`margen ${current.netMarginPct.toFixed(1)}%`} delta={netDelta} fmtPct={fmtPct} accent={current.netProfit >= 0 ? 'blue' : 'red'} />
            <KPICard label="Gastos operativos" value={fmt(current.opex)} sub="sin inventario" delta={opexDelta} fmtPct={fmtPct} accent="red" inverted />
            <KPICard label="Ticket promedio" value={fmt(current.avgTicket)} sub="por venta" delta={ticketDelta} fmtPct={fmtPct} accent="gray" />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Pedidos" value={String(orders.length)} />
            <MiniStat label="Pendientes" value={String(current.pendingCount)} amount={fmt(current.pendingRevenue)} highlight={current.pendingCount > 0 ? 'amber' : undefined} />
            <MiniStat label="Conversion" value={`${conversionPct.toFixed(0)}%`} sub={`${current.deliveredCount}/${orders.length}`} />
            <MiniStat label="Gasto fijo mensual" value={fmt(fixedMonthly)} sub={`${allRecurringExpenses.length} recurrente${allRecurringExpenses.length !== 1 ? 's' : ''}`} />
          </div>

          {/* Compact P&L */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Estado de resultados</h2>
              <Link to={localePath('/finance/cashflow')} className="text-xs text-blue-500 hover:text-blue-700">Ver detalle →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PnLCell label="Ingresos (cobrado)" value={fmt(current.collected)} sub={current.invoiced !== current.collected ? `facturado ${fmt(current.invoiced)}` : undefined} color="text-green-600" />
              <PnLCell label="Utilidad bruta" value={fmt(current.grossProfit)} sub={`margen ${current.grossMarginPct.toFixed(1)}%`} color={current.grossProfit >= 0 ? 'text-gray-900' : 'text-red-500'} />
              <PnLCell label="Utilidad neta" value={fmt(current.netProfit)} sub={`margen ${current.netMarginPct.toFixed(1)}%`} color={current.netProfit >= 0 ? 'text-gray-900' : 'text-red-500'} emphasis />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-y-1 gap-x-4 text-[11px]">
              <div className="flex justify-between sm:block">
                <span className="text-gray-400">− COGS</span>
                <span className="text-gray-600 sm:ml-2 tabular-nums">{fmt(current.cogs)}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-gray-400">− Gastos op.</span>
                <span className="text-gray-600 sm:ml-2 tabular-nums">{fmt(current.opex)}</span>
              </div>
              {cancelPct > 0 && (
                <div className="flex justify-between sm:block">
                  <span className="text-gray-400">Cancelacion</span>
                  <span className="text-gray-600 sm:ml-2 tabular-nums">{cancelPct.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Chart + Top products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/60 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-900">Ingresos vs gastos por dia</h2>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                    <span className="w-2 h-2 rounded-sm bg-[#1e3a5f]" /> Ingresos
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                    <span className="w-2 h-2 rounded-sm bg-red-400" /> Gastos
                  </span>
                </div>
              </div>
              {chartData.length === 0 || maxBar === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin datos</div>
              ) : (
                <div className="flex items-end gap-1 h-40">
                  {chartData.map((d, i) => {
                    const incomeH = (d.income / maxBar) * 100
                    const expenseH = (d.expenses / maxBar) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap">
                            <div>{d.label}</div>
                            <div>Ingresos: {fmt(d.income)}</div>
                            <div>Gastos: {fmt(d.expenses)}</div>
                            <div className="border-t border-white/20 mt-0.5 pt-0.5">Neto: {fmt(d.income - d.expenses)}</div>
                          </div>
                        </div>
                        <div className="w-full flex items-end justify-center gap-[1px]">
                          <div
                            className={`w-1/2 rounded-t transition-all ${d.income > 0 ? 'bg-[#1e3a5f] hover:bg-[#2d6cb5]' : 'bg-gray-100'}`}
                            style={{ height: `${Math.max(incomeH, d.income > 0 ? 4 : 2)}px`, minHeight: d.income > 0 ? 4 : 0 }}
                          />
                          <div
                            className={`w-1/2 rounded-t transition-all ${d.expenses > 0 ? 'bg-red-400 hover:bg-red-500' : 'bg-gray-100'}`}
                            style={{ height: `${Math.max(expenseH, d.expenses > 0 ? 4 : 2)}px`, minHeight: d.expenses > 0 ? 4 : 0 }}
                          />
                        </div>
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-900">Top productos</h2>
                <Link to={localePath('/dashboard/analytics')} className="text-[11px] text-blue-500 hover:text-blue-700">Ver mas →</Link>
              </div>
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
                      <p className="text-sm font-medium text-gray-700 flex-shrink-0 ml-2 tabular-nums">{fmt(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* OPEX breakdown + Por cobrar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-900">Gastos operativos por categoria</h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">{fmt(current.opex)}</p>
                  <Link to={localePath('/finance/expenses')} className="text-[11px] text-blue-500 hover:text-blue-700">Gestionar →</Link>
                </div>
              </div>
              {opexByCategory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin gastos operativos</p>
              ) : (
                <div className="space-y-2.5">
                  {opexByCategory.map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{cat}</span>
                        <span className="text-xs font-medium text-gray-700 tabular-nums">
                          {fmt(amount)}
                          <span className="ml-2 text-gray-400 font-normal">{((amount / current.opex) * 100).toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${(amount / current.opex) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-900">Por cobrar</h2>
                <p className="text-xs font-medium text-amber-600 tabular-nums">{fmt(current.pendingRevenue)}</p>
              </div>
              {pendingOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin pedidos pendientes</p>
              ) : (
                <div className="space-y-1.5">
                  {pendingOrders.slice(0, 5).map(order => {
                    const statusLabel = order.status === 'pending' ? 'Pendiente'
                      : order.status === 'confirmed' ? 'Confirmado'
                      : order.status === 'preparing' ? 'Preparando'
                      : order.status === 'ready' ? 'Listo'
                      : order.status
                    return (
                      <div key={order.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-medium rounded">{statusLabel}</span>
                          <p className="text-sm text-gray-700 truncate">#{order.orderNumber} · {order.customer?.name || 'Cliente'}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900 flex-shrink-0 ml-2 tabular-nums">{fmt(order.total || 0)}</p>
                      </div>
                    )
                  })}
                  {pendingOrders.length > 5 && (
                    <Link to={localePath('/dashboard/orders')} className="block text-center text-[11px] text-blue-500 hover:text-blue-700 pt-2">
                      Ver {pendingOrders.length - 5} mas →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

function KPICard({
  label, value, sub, delta, fmtPct, accent, inverted = false,
}: {
  label: string
  value: string
  sub?: string
  delta: Delta
  fmtPct: (n: number) => string
  accent: 'green' | 'red' | 'blue' | 'gray'
  inverted?: boolean
}) {
  const accentClass = accent === 'green' ? 'text-green-600'
    : accent === 'red' ? 'text-red-500'
    : accent === 'blue' ? 'text-[#1e3a5f]'
    : 'text-gray-900'
  const positiveIsGood = !inverted
  let deltaClass = 'text-gray-400'
  if (delta.direction === 'up') deltaClass = positiveIsGood ? 'text-green-600' : 'text-red-500'
  if (delta.direction === 'down') deltaClass = positiveIsGood ? 'text-red-500' : 'text-green-600'
  const arrow = delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→'

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${accentClass}`}>{value}</p>
      <div className="flex items-center justify-between mt-1 gap-2">
        {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
        <p className={`text-[11px] ${deltaClass} whitespace-nowrap flex-shrink-0 ml-auto`}>
          {arrow} {fmtPct(delta.pct)}
        </p>
      </div>
    </div>
  )
}

function MiniStat({
  label, value, sub, amount, highlight,
}: {
  label: string
  value: string
  sub?: string
  amount?: string
  highlight?: 'amber'
}) {
  const valueClass = highlight === 'amber' ? 'text-amber-600' : 'text-gray-900'
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-3">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
      {amount && <p className="text-[11px] text-gray-500 tabular-nums">{amount}</p>}
      {sub && !amount && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

function PnLCell({
  label, value, sub, color, emphasis = false,
}: {
  label: string
  value: string
  sub?: string
  color: string
  emphasis?: boolean
}) {
  return (
    <div className={emphasis ? 'bg-gray-50 rounded-lg px-3 py-2' : ''}>
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
