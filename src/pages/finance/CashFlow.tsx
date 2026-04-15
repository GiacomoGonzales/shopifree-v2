import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Order } from '../../types'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: Date
}

type Period = '7d' | '30d' | '90d'

export default function CashFlow() {
  const { store } = useAuth()
  const [period, setPeriod] = useState<Period>('30d')
  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      const now = new Date()
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const start = Timestamp.fromDate(startDate)

      try {
        const [ordersSnap, expensesSnap] = await Promise.all([
          getDocs(query(
            collection(db, `stores/${store.id}/orders`),
            where('createdAt', '>=', start),
            orderBy('createdAt', 'desc')
          )),
          getDocs(query(
            collection(db, `stores/${store.id}/expenses`),
            where('date', '>=', start),
            orderBy('date', 'desc')
          )),
        ])

        setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setExpenses(expensesSnap.docs.map(d => {
          const raw = d.data()
          return {
            id: d.id,
            description: raw.description,
            amount: raw.amount,
            category: raw.category,
            date: raw.date?.toDate?.() || new Date(raw.date),
          } as Expense
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
    const income = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total || 0), 0)

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const balance = income - totalExpenses

    // Group expenses by category
    const byCategory: Record<string, number> = {}
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    })
    const categories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({ name, amount, pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))

    return { income, totalExpenses, balance, categories }
  }, [orders, expenses])

  const periods: { key: Period; label: string }[] = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Flujo de caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ingresos vs gastos</p>
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
          {/* Balance cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <p className="text-xs text-gray-400 mb-1">Ingresos</p>
              <p className="text-xl font-semibold text-green-600">{fmt(stats.income)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <p className="text-xs text-gray-400 mb-1">Gastos</p>
              <p className="text-xl font-semibold text-red-500">{fmt(stats.totalExpenses)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 p-4">
              <p className="text-xs text-gray-400 mb-1">Balance</p>
              <p className={`text-xl font-semibold ${stats.balance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                {fmt(stats.balance)}
              </p>
            </div>
          </div>

          {/* Expense breakdown */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Gastos por categoria</h2>
            {stats.categories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin gastos en este periodo</p>
            ) : (
              <div className="space-y-3">
                {stats.categories.map(cat => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{cat.name}</span>
                      <span className="text-sm font-medium text-gray-900">{fmt(cat.amount)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1e3a5f] rounded-full transition-all"
                        style={{ width: `${cat.pct}%` }}
                      />
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
