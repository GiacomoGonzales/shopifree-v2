import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: Date
  createdAt: Date
}

const CATEGORIES = [
  'Inventario',
  'Envios',
  'Publicidad',
  'Plataforma',
  'Empaque',
  'Personal',
  'Servicios',
  'Impuestos',
  'Otro',
]

export default function Expenses() {
  const { store } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Otro')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  useEffect(() => {
    if (!store) return
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        const q = query(
          collection(db, `stores/${store.id}/expenses`),
          orderBy('date', 'desc')
        )
        const snap = await getDocs(q)
        const data = snap.docs.map(d => {
          const raw = d.data()
          return {
            id: d.id,
            description: raw.description,
            amount: raw.amount,
            category: raw.category,
            date: raw.date?.toDate?.() || new Date(raw.date),
            createdAt: raw.createdAt?.toDate?.() || new Date(),
          } as Expense
        })
        setExpenses(data)
      } catch {
        setExpenses([])
      }
      setLoading(false)
    }
    fetchExpenses()
  }, [store])

  const handleSave = async () => {
    if (!store || !description.trim() || !amount) return
    setSaving(true)
    try {
      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        date: Timestamp.fromDate(new Date(date + 'T12:00:00')),
        createdAt: Timestamp.now(),
      }
      const ref = await addDoc(collection(db, `stores/${store.id}/expenses`), expenseData)
      setExpenses(prev => [{
        id: ref.id,
        ...expenseData,
        date: new Date(date + 'T12:00:00'),
        createdAt: new Date(),
      }, ...prev])
      setDescription('')
      setAmount('')
      setCategory('Otro')
      setDate(new Date().toISOString().split('T')[0])
      setShowForm(false)
    } catch (err) {
      console.error('Error saving expense:', err)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!store) return
    try {
      await deleteDoc(doc(db, `stores/${store.id}/expenses`, id))
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error('Error deleting expense:', err)
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra y controla tus gastos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancelar' : '+ Nuevo gasto'}
        </button>
      </div>

      {/* Total */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-4">
        <p className="text-xs text-gray-400 mb-1">Total de gastos registrados</p>
        <p className="text-2xl font-semibold text-gray-900">{fmt(totalExpenses)}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{expenses.length} gastos</p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descripcion</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Compra de bolsas"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monto</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !description.trim() || !amount}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </div>
        </div>
      )}

      {/* Expenses list */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">No hay gastos registrados</p>
            <p className="text-xs text-gray-300 mt-1">Agrega tu primer gasto para empezar a controlar tus finanzas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map(expense => (
              <div key={expense.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-md flex-shrink-0">
                    {expense.category}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{expense.description}</p>
                    <p className="text-xs text-gray-400">{expense.date.toLocaleDateString('es')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-red-500">-{fmt(expense.amount)}</p>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-1 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
