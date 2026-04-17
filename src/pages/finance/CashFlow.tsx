import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Order, Product } from '../../types'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: Date
  isRecurring?: boolean
  recurringFrequency?: 'weekly' | 'monthly'
}

type Period = '7d' | '30d' | '90d'

interface PeriodStats {
  income: number        // same as collected — used for P&L
  invoiced: number      // delivered orders total (facturado)
  collected: number     // paid orders total (cobrado)
  receivable: number    // accounts receivable (por cobrar)
  cogs: number
  grossProfit: number
  opex: number
  netProfit: number
  grossMarginPct: number
  netMarginPct: number
  opexByCategory: { name: string; amount: number; pct: number }[]
  topExpenses: Expense[]
}

// Computes stats for a given slice of data
// Facturado = ventas confirmadas (delivered, no canceladas). Cobrado = dinero que entro a caja (paymentStatus=paid).
// El P&L se calcula sobre Cobrado para reflejar flujo de caja real.
function computeStats(orders: Order[], expenses: Expense[], products: Product[]): PeriodStats {
  const costById = new Map<string, number>()
  products.forEach(p => costById.set(p.id, p.cost || 0))

  const validOrders = orders.filter(o => o.status !== 'cancelled')
  const invoicedOrders = validOrders.filter(o => o.status === 'delivered')
  const paidOrders = validOrders.filter(o => o.paymentStatus === 'paid')

  const invoiced = invoicedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const collected = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  // Income for P&L = what you actually received (cash basis).
  const income = collected

  // Real COGS = cost of products sold in paid orders (aligns with income)
  const cogs = paidOrders.reduce((sum, o) => {
    const orderCost = (o.items || []).reduce((s, item) => {
      const unitCost = costById.get(item.productId) || 0
      return s + unitCost * item.quantity
    }, 0)
    return sum + orderCost
  }, 0)

  // Accounts receivable = invoiced but not yet paid
  const receivable = validOrders
    .filter(o => o.status !== 'pending' && o.paymentStatus !== 'paid' && o.paymentStatus !== 'refunded')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  // OPEX = expenses that are NOT inventory purchases (inventory is an asset until sold)
  const opexExpenses = expenses.filter(e => e.category !== 'Inventario')
  const opex = opexExpenses.reduce((sum, e) => sum + e.amount, 0)

  const grossProfit = income - cogs
  const netProfit = grossProfit - opex
  const grossMarginPct = income > 0 ? (grossProfit / income) * 100 : 0
  const netMarginPct = income > 0 ? (netProfit / income) * 100 : 0

  const byCategory: Record<string, number> = {}
  opexExpenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })
  const opexByCategory = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({ name, amount, pct: opex > 0 ? (amount / opex) * 100 : 0 }))

  const topExpenses = [...opexExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5)

  return { income, invoiced, collected, receivable, cogs, grossProfit, opex, netProfit, grossMarginPct, netMarginPct, opexByCategory, topExpenses }
}

export default function CashFlow() {
  const { store } = useAuth()
  const [period, setPeriod] = useState<Period>('30d')
  const [currentOrders, setCurrentOrders] = useState<Order[]>([])
  const [previousOrders, setPreviousOrders] = useState<Order[]>([])
  const [currentExpenses, setCurrentExpenses] = useState<Expense[]>([])
  const [previousExpenses, setPreviousExpenses] = useState<Expense[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      const now = new Date()
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000)
      const cStart = Timestamp.fromDate(currentStart)
      const pStart = Timestamp.fromDate(previousStart)
      const pEnd = Timestamp.fromDate(currentStart)

      try {
        const [currOrdersSnap, prevOrdersSnap, currExpSnap, prevExpSnap, prodSnap] = await Promise.all([
          getDocs(query(
            collection(db, `stores/${store.id}/orders`),
            where('createdAt', '>=', cStart),
            orderBy('createdAt', 'desc')
          )),
          getDocs(query(
            collection(db, `stores/${store.id}/orders`),
            where('createdAt', '>=', pStart),
            where('createdAt', '<', pEnd),
            orderBy('createdAt', 'desc')
          )),
          getDocs(query(
            collection(db, `stores/${store.id}/expenses`),
            where('date', '>=', cStart),
            orderBy('date', 'desc')
          )),
          getDocs(query(
            collection(db, `stores/${store.id}/expenses`),
            where('date', '>=', pStart),
            where('date', '<', pEnd),
            orderBy('date', 'desc')
          )),
          getDocs(collection(db, `stores/${store.id}/products`)),
        ])

        const parseExpense = (d: { id: string; data: () => Record<string, unknown> }) => {
          const raw = d.data() as Record<string, unknown> & { date?: { toDate?: () => Date } | string }
          return {
            id: d.id,
            description: String(raw.description || ''),
            amount: Number(raw.amount || 0),
            category: String(raw.category || 'Otro'),
            date: typeof raw.date === 'object' && raw.date?.toDate ? raw.date.toDate() : new Date(raw.date as string),
            isRecurring: Boolean(raw.isRecurring),
            recurringFrequency: raw.recurringFrequency as 'weekly' | 'monthly' | undefined,
          } as Expense
        }

        setCurrentOrders(currOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setPreviousOrders(prevOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setCurrentExpenses(currExpSnap.docs.map(parseExpense))
        setPreviousExpenses(prevExpSnap.docs.map(parseExpense))
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
      } catch {
        setCurrentOrders([])
        setPreviousOrders([])
        setCurrentExpenses([])
        setPreviousExpenses([])
        setProducts([])
      }
      setLoading(false)
    }
    fetch()
  }, [store, period])

  const current = useMemo(() => computeStats(currentOrders, currentExpenses, products), [currentOrders, currentExpenses, products])
  const previous = useMemo(() => computeStats(previousOrders, previousExpenses, products), [previousOrders, previousExpenses, products])

  // Helper for change %
  const delta = (curr: number, prev: number): { pct: number; direction: 'up' | 'down' | 'flat' } => {
    if (prev === 0) return { pct: curr === 0 ? 0 : 100, direction: curr > 0 ? 'up' : 'flat' }
    const pct = ((curr - prev) / Math.abs(prev)) * 100
    return { pct, direction: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' }
  }

  const balance = current.income - current.opex - current.cogs
  const prevBalance = previous.income - previous.opex - previous.cogs
  const incomeDelta = delta(current.income, previous.income)
  const opexDelta = delta(current.opex, previous.opex)
  const balanceDelta = delta(balance, prevBalance)
  const netDelta = delta(current.netProfit, previous.netProfit)

  const periods: { key: Period; label: string }[] = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
  ]

  const periodLabel = period === '7d' ? 'ultimos 7 dias' : period === '30d' ? 'ultimos 30 dias' : 'ultimos 90 dias'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Flujo de caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ingresos, costos y utilidad</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
          {/* Top summary cards with period-over-period comparison */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="Cobrado"
              value={fmt(current.collected)}
              delta={incomeDelta}
              fmtPct={fmtPct}
              accent="green"
              hint={`Facturado ${fmt(current.invoiced)}`}
            />
            <SummaryCard label="Gastos operativos" value={fmt(current.opex)} delta={opexDelta} fmtPct={fmtPct} accent="red" inverted />
            <SummaryCard label="Utilidad neta" value={fmt(current.netProfit)} delta={netDelta} fmtPct={fmtPct} accent={current.netProfit >= 0 ? 'blue' : 'red'} />
            <SummaryCard
              label={current.receivable > 0 ? 'Por cobrar' : 'Balance del periodo'}
              value={current.receivable > 0 ? fmt(current.receivable) : fmt(balance)}
              delta={balanceDelta}
              fmtPct={fmtPct}
              accent={current.receivable > 0 ? 'red' : (balance >= 0 ? 'blue' : 'red')}
              hint={current.receivable > 0 ? 'deudas activas' : undefined}
            />
          </div>

          {/* P&L — Simple income statement */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-medium text-gray-900">Estado de resultados</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{periodLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400">Margen neto</p>
                <p className={`text-sm font-semibold ${current.netMarginPct >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                  {current.netMarginPct.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <PnLRow label="Facturado" value={fmt(current.invoiced)} muted indent />
              <PnLRow label="Ingresos (cobrado)" value={fmt(current.collected)} positive />
              <PnLRow label="− Costo de ventas (COGS)" value={fmt(current.cogs)} muted indent />
              <PnLDivider />
              <PnLRow
                label="Utilidad bruta"
                value={fmt(current.grossProfit)}
                emphasis
                hint={`margen ${current.grossMarginPct.toFixed(1)}%`}
              />
              <PnLRow label="− Gastos operativos" value={fmt(current.opex)} muted indent />
              <PnLDivider />
              <PnLRow
                label="Utilidad neta"
                value={fmt(current.netProfit)}
                emphasis
                bold
                negative={current.netProfit < 0}
                hint={`margen ${current.netMarginPct.toFixed(1)}%`}
              />
              {current.receivable > 0 && (
                <>
                  <PnLDivider />
                  <PnLRow label="Por cobrar" value={fmt(current.receivable)} muted hint="deudas activas" />
                </>
              )}
            </div>

            <p className="text-[11px] text-gray-400 mt-4">
              Ingresos cuentan sobre pedidos con pago confirmado (Cobrado), no sobre entregas sin pagar. COGS = costo unitario × unidades en pedidos pagados. Las compras de inventario no se cuentan como gasto operativo hasta que se venden.
            </p>
          </div>

          {/* OPEX breakdown */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-900">Gastos operativos por categoria</h2>
              <p className="text-[11px] text-gray-400">{fmt(current.opex)} total</p>
            </div>
            {current.opexByCategory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin gastos operativos en este periodo</p>
            ) : (
              <div className="space-y-3">
                {current.opexByCategory.map(cat => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{cat.name}</span>
                      <span className="text-sm font-medium text-gray-900 tabular-nums">
                        {fmt(cat.amount)}
                        <span className="ml-2 text-[11px] font-normal text-gray-400">{cat.pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top expenses */}
          {current.topExpenses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Gastos mas grandes del periodo</h2>
              <div className="divide-y divide-gray-50">
                {current.topExpenses.map(e => (
                  <div key={e.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded">{e.category}</span>
                      <p className="text-sm text-gray-700 truncate">{e.description}</p>
                    </div>
                    <p className="text-sm font-medium text-red-500 tabular-nums flex-shrink-0">−{fmt(e.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================================
// Presentational subcomponents
// ============================================================================

interface Delta { pct: number; direction: 'up' | 'down' | 'flat' }

function SummaryCard({
  label, value, delta, fmtPct, accent, inverted = false, hint,
}: {
  label: string
  value: string
  delta: Delta
  fmtPct: (n: number) => string
  accent: 'green' | 'red' | 'blue'
  inverted?: boolean  // when true, "up" is bad (e.g. gastos subiendo)
  hint?: string
}) {
  const accentClass = accent === 'green' ? 'text-green-600' : accent === 'red' ? 'text-red-500' : 'text-gray-900'
  const positiveIsGood = !inverted
  const goodClass = 'text-green-600'
  const badClass = 'text-red-500'
  const neutralClass = 'text-gray-400'
  let deltaClass = neutralClass
  if (delta.direction === 'up') deltaClass = positiveIsGood ? goodClass : badClass
  if (delta.direction === 'down') deltaClass = positiveIsGood ? badClass : goodClass

  const arrow = delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→'

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${accentClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      <p className={`text-[11px] mt-1 ${deltaClass}`}>
        {arrow} {fmtPct(delta.pct)} <span className="text-gray-400 font-normal">vs periodo previo</span>
      </p>
    </div>
  )
}

function PnLRow({
  label, value, positive = false, negative = false, muted = false, emphasis = false, bold = false, indent = false, hint,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
  muted?: boolean
  emphasis?: boolean
  bold?: boolean
  indent?: boolean
  hint?: string
}) {
  const labelCls = [
    'text-sm',
    indent ? 'pl-4 text-gray-500' : emphasis ? 'text-gray-900 font-medium' : 'text-gray-700',
    muted && !indent ? 'text-gray-500' : '',
  ].filter(Boolean).join(' ')
  const valueCls = [
    'tabular-nums',
    bold ? 'text-base font-semibold' : 'text-sm font-medium',
    negative ? 'text-red-500' : positive ? 'text-green-600' : emphasis ? 'text-gray-900' : 'text-gray-700',
  ].filter(Boolean).join(' ')

  return (
    <div className="flex items-center justify-between">
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-2">
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
        <span className={valueCls}>{value}</span>
      </div>
    </div>
  )
}

function PnLDivider() {
  return <div className="border-t border-gray-100 my-1" />
}
