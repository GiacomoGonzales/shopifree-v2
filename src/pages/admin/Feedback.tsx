import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface FeedbackItem {
  id: string
  storeId: string
  storeName: string
  email: string
  plan: string
  type: 'bug' | 'suggestion' | 'missing'
  message: string
  status: 'new' | 'read' | 'done'
  createdAt: Date
}

const TYPE_CONFIG = {
  bug: { label: 'Error', bg: 'bg-red-100', text: 'text-red-700' },
  suggestion: { label: 'Sugerencia', bg: 'bg-blue-100', text: 'text-blue-700' },
  missing: { label: 'Falta algo', bg: 'bg-amber-100', text: 'text-amber-700' },
}

const STATUS_CONFIG = {
  new: { label: 'Nuevo', bg: 'bg-violet-100', text: 'text-violet-700' },
  read: { label: 'Leido', bg: 'bg-gray-100', text: 'text-gray-600' },
  done: { label: 'Resuelto', bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(d => {
        const raw = d.data()
        return {
          id: d.id,
          storeId: raw.storeId || '',
          storeName: raw.storeName || '',
          email: raw.email || '',
          plan: raw.plan || 'free',
          type: raw.type || 'suggestion',
          message: raw.message || '',
          status: raw.status || 'new',
          createdAt: raw.createdAt?.toDate?.() || new Date(raw.createdAt),
        } as FeedbackItem
      })
      setItems(data)
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: 'new' | 'read' | 'done') => {
    try {
      await updateDoc(doc(db, 'feedback', id), { status })
      setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item))
    } catch (error) {
      console.error('Error updating feedback:', error)
    }
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Eliminar este feedback?')) return
    try {
      await deleteDoc(doc(db, 'feedback', id))
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting feedback:', error)
    }
  }

  const filtered = items.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    return true
  })

  const counts = {
    total: items.length,
    new: items.filter(i => i.status === 'new').length,
    bug: items.filter(i => i.type === 'bug').length,
    suggestion: items.filter(i => i.type === 'suggestion').length,
    missing: items.filter(i => i.type === 'missing').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-gray-500 text-sm mt-1">Sugerencias, errores y solicitudes de los usuarios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'from-violet-500 to-indigo-500' },
          { label: 'Nuevos', value: counts.new, color: 'from-violet-500 to-purple-500' },
          { label: 'Errores', value: counts.bug, color: 'from-red-500 to-rose-500' },
          { label: 'Sugerencias', value: counts.suggestion, color: 'from-blue-500 to-cyan-500' },
          { label: 'Falta algo', value: counts.missing, color: 'from-amber-500 to-orange-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/60 backdrop-blur border border-white/80 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          <option value="all">Todos los tipos</option>
          <option value="bug">Errores</option>
          <option value="suggestion">Sugerencias</option>
          <option value="missing">Falta algo</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          <option value="all">Todos los estados</option>
          <option value="new">Nuevos</option>
          <option value="read">Leidos</option>
          <option value="done">Resueltos</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">No hay feedback todavia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const typeConf = TYPE_CONFIG[item.type]
            const statusConf = STATUS_CONFIG[item.status]
            return (
              <div
                key={item.id}
                className={`bg-white/70 backdrop-blur border rounded-xl p-4 transition-all ${
                  item.status === 'new' ? 'border-violet-200 shadow-sm' : 'border-white/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConf.bg} ${typeConf.text}`}>
                        {typeConf.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.text}`}>
                        {statusConf.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.createdAt.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Message */}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.message}</p>
                    {/* Store info */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{item.storeName || item.storeId}</span>
                      {item.email && <span>{item.email}</span>}
                      <span className="uppercase">{item.plan}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.status === 'new' && (
                      <button
                        onClick={() => updateStatus(item.id, 'read')}
                        title="Marcar como leido"
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                    {item.status !== 'done' && (
                      <button
                        onClick={() => updateStatus(item.id, 'done')}
                        title="Marcar como resuelto"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    {item.status === 'done' && (
                      <button
                        onClick={() => updateStatus(item.id, 'new')}
                        title="Reabrir"
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteFeedback(item.id)}
                      title="Eliminar"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
