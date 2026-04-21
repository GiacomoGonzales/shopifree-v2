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

const TYPE_LABELS: Record<string, string> = {
  bug: 'Error',
  suggestion: 'Sugerencia',
  missing: 'Falta algo',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  read: 'Leído',
  done: 'Resuelto',
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
    if (!confirm('¿Eliminar este feedback?')) return
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
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sugerencias, errores y solicitudes de los usuarios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Nuevos" value={counts.new} emphasize={counts.new > 0} />
        <StatCard label="Errores" value={counts.bug} />
        <StatCard label="Sugerencias" value={counts.suggestion} />
        <StatCard label="Falta algo" value={counts.missing} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
        >
          <option value="all">Todos los tipos</option>
          <option value="bug">Errores</option>
          <option value="suggestion">Sugerencias</option>
          <option value="missing">Falta algo</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
        >
          <option value="all">Todos los estados</option>
          <option value="new">Nuevos</option>
          <option value="read">Leídos</option>
          <option value="done">Resueltos</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-gray-200 rounded-lg bg-white">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">No hay feedback todavía</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`bg-white border rounded-lg p-4 transition-colors ${
                item.status === 'new' ? 'border-gray-900' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide border border-gray-200 text-gray-700">
                      {TYPE_LABELS[item.type]}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide ${
                        item.status === 'new'
                          ? 'bg-gray-900 text-white'
                          : item.status === 'done'
                            ? 'border border-gray-200 text-gray-500'
                            : 'border border-gray-200 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      {item.createdAt.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Message */}
                  <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{item.message}</p>
                  {/* Store info */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-500">
                    <span>{item.storeName || item.storeId}</span>
                    {item.email && <span>{item.email}</span>}
                    <span className="uppercase tracking-wide">{item.plan}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {item.status === 'new' && (
                    <IconButton title="Marcar como leído" onClick={() => updateStatus(item.id, 'read')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </IconButton>
                  )}
                  {item.status !== 'done' && (
                    <IconButton title="Marcar como resuelto" onClick={() => updateStatus(item.id, 'done')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 13l4 4L19 7" />
                      </svg>
                    </IconButton>
                  )}
                  {item.status === 'done' && (
                    <IconButton title="Reabrir" onClick={() => updateStatus(item.id, 'new')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </IconButton>
                  )}
                  <IconButton title="Eliminar" onClick={() => deleteFeedback(item.id)}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${emphasize ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-xl font-semibold text-gray-900 tabular-nums">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
    >
      {children}
    </button>
  )
}
