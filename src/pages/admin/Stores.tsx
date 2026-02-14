import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { useLanguage } from '../../hooks/useLanguage'
import { PLAN_FEATURES } from '../../lib/stripe'
import type { Store } from '../../types'

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  unpaid: 'Impagada',
  trialing: 'Prueba',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada',
  paused: 'Pausada'
}

export default function AdminStores() {
  const { showToast } = useToast()
  const { localePath } = useLanguage()
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStore, setEditingStore] = useState<(Store & { id: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncingStore, setSyncingStore] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')

  type SortField = 'name' | 'subdomain' | 'plan' | 'createdAt'
  type SortOrder = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stores'))
      const storesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Store & { id: string })[]

      setStores(storesData)
    } catch (error) {
      console.error('Error fetching stores:', error)
      showToast('Error al cargar las tiendas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncSubscription = async (storeId: string) => {
    setSyncingStore(storeId)
    try {
      const response = await fetch('/api/sync-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state
        setStores(prev => prev.map(s =>
          s.id === storeId
            ? {
                ...s,
                plan: data.plan,
                subscription: s.subscription
                  ? { ...s.subscription, status: data.status }
                  : undefined
              } as Store & { id: string }
            : s
        ))
        showToast(`Sincronizado: ${SUBSCRIPTION_STATUS_LABELS[data.status] || data.status}`, 'success')
      } else {
        showToast(data.error || 'Error al sincronizar', 'error')
      }
    } catch (error) {
      console.error('Error syncing subscription:', error)
      showToast('Error al sincronizar con Stripe', 'error')
    } finally {
      setSyncingStore(null)
    }
  }

  const handleUpdatePlan = async (storeId: string, newPlan: 'free' | 'pro' | 'business') => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'stores', storeId), {
        plan: newPlan,
        updatedAt: new Date()
      })

      setStores(stores.map(s =>
        s.id === storeId ? { ...s, plan: newPlan } : s
      ))

      showToast(`Plan actualizado a ${newPlan}`, 'success')
      setEditingStore(null)
    } catch (error) {
      console.error('Error updating plan:', error)
      showToast('Error al actualizar el plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filteredStores = useMemo(() => {
    const toDate = (d: any) => {
      if (!d) return new Date(0)
      if (d.toDate) return d.toDate()
      if (d instanceof Date) return d
      return new Date(d)
    }

    let result = stores.filter(store => {
      const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           store.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlan = filterPlan === 'all' || store.plan === filterPlan
      return matchesSearch && matchesPlan
    })

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'subdomain':
          comparison = a.subdomain.localeCompare(b.subdomain)
          break
        case 'plan': {
          const planOrder: Record<string, number> = { free: 0, pro: 1, business: 2 }
          comparison = (planOrder[a.plan || 'free'] || 0) - (planOrder[b.plan || 'free'] || 0)
          break
        }
        case 'createdAt':
          comparison = toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [stores, searchTerm, filterPlan, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Tiendas</h1>
          <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-sm font-semibold rounded-full">
            {stores.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o subdominio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur border border-white/80 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all text-gray-900 placeholder-gray-400"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2.5 bg-white/50 backdrop-blur border border-white/80 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all text-gray-900"
        >
          <option value="all">Todos los planes</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Stores Table / Cards */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/50 border-b border-white/60">
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Tienda
                    <SortIcon field="name" />
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('subdomain')}>
                  <div className="flex items-center gap-1">
                    Subdominio
                    <SortIcon field="subdomain" />
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('plan')}>
                  <div className="flex items-center gap-1">
                    Plan
                    <SortIcon field="plan" />
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estado Suscripcion</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">
                    Creada
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store) => (
                <tr key={store.id} className="border-b border-white/60 hover:bg-white/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {store.logo ? (
                        <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/5" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-violet-600 font-bold">{store.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{store.name}</p>
                        <p className="text-xs text-gray-400">{store.whatsapp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://${store.subdomain}.shopifree.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 hover:text-violet-700 hover:underline text-sm font-medium"
                    >
                      {store.subdomain}.shopifree.app
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${
                      store.plan === 'free' ? 'bg-gray-100/80 text-gray-600' :
                      store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' :
                      'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    }`}>
                      {store.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {store.subscription ? (
                        <>
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            store.subscription.status === 'active' ? 'bg-green-100/80 text-green-700' :
                            store.subscription.status === 'trialing' ? 'bg-blue-100/80 text-blue-700' :
                            store.subscription.status === 'past_due' ? 'bg-yellow-100/80 text-yellow-700' :
                            'bg-red-100/80 text-red-700'
                          }`}>
                            {SUBSCRIPTION_STATUS_LABELS[store.subscription.status] || store.subscription.status}
                          </span>
                          <button
                            onClick={() => handleSyncSubscription(store.id)}
                            disabled={syncingStore === store.id}
                            className="p-1 text-gray-400 hover:text-violet-600 hover:bg-white/50 rounded transition-all disabled:opacity-50"
                            title="Sincronizar con Stripe"
                          >
                            {syncingStore === store.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin suscripcion</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {store.createdAt
                      ? (store.createdAt as any).toDate
                        ? (store.createdAt as any).toDate().toLocaleDateString()
                        : store.createdAt instanceof Date
                          ? store.createdAt.toLocaleDateString()
                          : new Date(store.createdAt).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={localePath('/admin/stores/' + store.id)}
                        className="px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                      >
                        Ver detalle
                      </Link>
                      <button
                        onClick={() => setEditingStore(store)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition-all"
                      >
                        Editar plan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-white/60">
          {filteredStores.map((store) => (
            <div key={store.id} className="p-4 hover:bg-white/40 transition-colors">
              {/* Row 1: Logo + Name + Plan badge */}
              <div className="flex items-center gap-3">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/5" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-600 font-bold">{store.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 truncate">{store.name}</p>
                    <span className={`px-2.5 py-0.5 text-[11px] rounded-full font-medium capitalize flex-shrink-0 ${
                      store.plan === 'free' ? 'bg-gray-100/80 text-gray-600' :
                      store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' :
                      'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    }`}>
                      {store.plan}
                    </span>
                  </div>
                  <a
                    href={`https://${store.subdomain}.shopifree.app`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 text-xs font-medium"
                  >
                    {store.subdomain}.shopifree.app
                  </a>
                </div>
              </div>

              {/* Row 2: Subscription + Date + Action */}
              <div className="flex items-center justify-between mt-3 pl-[52px]">
                <div className="flex items-center gap-2 flex-wrap">
                  {store.subscription ? (
                    <>
                      <span className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${
                        store.subscription.status === 'active' ? 'bg-green-100/80 text-green-700' :
                        store.subscription.status === 'trialing' ? 'bg-blue-100/80 text-blue-700' :
                        store.subscription.status === 'past_due' ? 'bg-yellow-100/80 text-yellow-700' :
                        'bg-red-100/80 text-red-700'
                      }`}>
                        {SUBSCRIPTION_STATUS_LABELS[store.subscription.status] || store.subscription.status}
                      </span>
                      <button
                        onClick={() => handleSyncSubscription(store.id)}
                        disabled={syncingStore === store.id}
                        className="p-0.5 text-gray-400 hover:text-violet-600 rounded transition-all disabled:opacity-50"
                        title="Sincronizar con Stripe"
                      >
                        {syncingStore === store.id ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs">Sin suscripcion</span>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    {store.createdAt
                      ? (store.createdAt as any).toDate
                        ? (store.createdAt as any).toDate().toLocaleDateString()
                        : store.createdAt instanceof Date
                          ? store.createdAt.toLocaleDateString()
                          : new Date(store.createdAt).toLocaleDateString()
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={localePath('/admin/stores/' + store.id)}
                    className="px-2.5 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                  >
                    Detalle
                  </Link>
                  <button
                    onClick={() => setEditingStore(store)}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No se encontraron tiendas
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {editingStore && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Editar plan: {editingStore.name}
            </h3>

            <div className="space-y-3 mb-6">
              {['free', 'pro', 'business'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => handleUpdatePlan(editingStore.id, plan as 'free' | 'pro' | 'business')}
                  disabled={saving || editingStore.plan === plan}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                    editingStore.plan === plan
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-white/80 hover:border-violet-300 bg-white/40'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{plan}</p>
                    <p className="text-sm text-gray-500">
                      {plan === 'free' ? 'Gratis' : `$${PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES].price}/mes`}
                    </p>
                  </div>
                  {editingStore.plan === plan && (
                    <span className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-lg font-semibold">
                      Actual
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingStore(null)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100/80 rounded-xl hover:bg-gray-200/80 transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
