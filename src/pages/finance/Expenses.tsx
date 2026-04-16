import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: Date
  createdAt: Date
  isRecurring?: boolean
  recurringFrequency?: 'weekly' | 'monthly'
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

type CategoryFilter = 'all' | (typeof CATEGORIES)[number]

export default function Expenses() {
  const { store } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Otro')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly'>('monthly')

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const currency = store?.currency || 'PEN'
  const fmt = (n: number) => new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  useEffect(() => {
    if (!store) return
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        const q = query(collection(db, `stores/${store.id}/expenses`), orderBy('date', 'desc'))
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
            isRecurring: Boolean(raw.isRecurring),
            recurringFrequency: raw.recurringFrequency as 'weekly' | 'monthly' | undefined,
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

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setCategory('Otro')
    setDate(new Date().toISOString().split('T')[0])
    setIsRecurring(false)
    setRecurringFrequency('monthly')
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (exp: Expense) => {
    setEditingId(exp.id)
    setDescription(exp.description)
    setAmount(String(exp.amount))
    setCategory(exp.category)
    setDate(exp.date.toISOString().split('T')[0])
    setIsRecurring(Boolean(exp.isRecurring))
    setRecurringFrequency(exp.recurringFrequency || 'monthly')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!store || !description.trim() || !amount) return
    setSaving(true)
    try {
      // Build dynamically — Firestore rejects undefined
      const data: Record<string, unknown> = {
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        date: Timestamp.fromDate(new Date(date + 'T12:00:00')),
      }
      if (isRecurring) {
        data.isRecurring = true
        data.recurringFrequency = recurringFrequency
      } else {
        data.isRecurring = false
      }

      if (editingId) {
        await updateDoc(doc(db, `stores/${store.id}/expenses`, editingId), {
          ...data,
          updatedAt: Timestamp.now(),
        })
        setExpenses(prev => prev.map(e => e.id === editingId
          ? { ...e, description: description.trim(), amount: parseFloat(amount), category, date: new Date(date + 'T12:00:00'), isRecurring, recurringFrequency: isRecurring ? recurringFrequency : undefined }
          : e
        ))
      } else {
        const ref = await addDoc(collection(db, `stores/${store.id}/expenses`), {
          ...data,
          createdAt: Timestamp.now(),
        })
        setExpenses(prev => [{
          id: ref.id,
          description: description.trim(),
          amount: parseFloat(amount),
          category,
          date: new Date(date + 'T12:00:00'),
          createdAt: new Date(),
          isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
        }, ...prev])
      }
      resetForm()
      setShowForm(false)
    } catch (err) {
      console.error('Error saving expense:', err)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!store) return
    if (!confirm('Eliminar este gasto? Esta accion no se puede deshacer.')) return
    try {
      await deleteDoc(doc(db, `stores/${store.id}/expenses`, id))
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error('Error deleting expense:', err)
    }
  }

  // Filtered list
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!e.description.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [expenses, search, categoryFilter])

  // Fixed monthly cost estimate (from recurring expenses)
  const fixedMonthly = useMemo(() => {
    let total = 0
    for (const e of expenses) {
      if (!e.isRecurring) continue
      if (e.recurringFrequency === 'weekly') total += e.amount * 4.33  // avg weeks/month
      else total += e.amount
    }
    return total
  }, [expenses])

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra y controla tus gastos</p>
        </div>
        <button
          onClick={() => { if (showForm) { setShowForm(false); resetForm() } else { openCreate() } }}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancelar' : '+ Nuevo gasto'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200/60 p-4">
          <p className="text-[11px] text-gray-400 mb-1">Total registrado</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(expenses.reduce((s, e) => s + e.amount, 0))}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{expenses.length} gasto{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-4">
          <p className="text-[11px] text-gray-400 mb-1">Gastos fijos mensuales</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(fixedMonthly)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {expenses.filter(e => e.isRecurring).length} recurrente{expenses.filter(e => e.isRecurring).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-4">
          <p className="text-[11px] text-gray-400 mb-1">Vista filtrada</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalFiltered)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-3 animate-[slideDown_0.15s_ease-out]">
          <h3 className="text-sm font-medium text-gray-900">{editingId ? 'Editar gasto' : 'Nuevo gasto'}</h3>
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
                step="0.01"
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
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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

          {/* Recurring toggle */}
          <div className="flex items-start gap-3 pt-1 border-t border-gray-100 mt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none mt-3">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]/20"
              />
              <span className="text-sm text-gray-700">Gasto recurrente</span>
            </label>
            {isRecurring && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-400">Frecuencia:</span>
                <select
                  value={recurringFrequency}
                  onChange={e => setRecurringFrequency(e.target.value as 'weekly' | 'monthly')}
                  className="px-2 py-1 border border-gray-200 rounded-md text-xs focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                >
                  <option value="monthly">Mensual</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {editingId && (
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !description.trim() || !amount}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40"
            >
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar gasto'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {expenses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por descripcion o categoria..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
          >
            <option value="all">Todas las categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Expenses list */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">
              {expenses.length === 0 ? 'No hay gastos registrados' : 'Sin resultados para los filtros seleccionados'}
            </p>
            {expenses.length === 0 && (
              <p className="text-xs text-gray-300 mt-1">Agrega tu primer gasto para empezar a controlar tus finanzas</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(expense => (
              <div key={expense.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-md flex-shrink-0">
                    {expense.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-gray-900 truncate">{expense.description}</p>
                      {expense.isRecurring && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-medium rounded">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          {expense.recurringFrequency === 'weekly' ? 'Semanal' : 'Mensual'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{expense.date.toLocaleDateString('es')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-red-500 tabular-nums">−{fmt(expense.amount)}</p>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(expense)}
                      className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
