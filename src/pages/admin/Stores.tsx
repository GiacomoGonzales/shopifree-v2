import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
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
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStore, setEditingStore] = useState<(Store & { id: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncingStore, setSyncingStore] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')

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

      // Sort by creation date
      const toDate = (d: any) => {
        if (!d) return new Date(0)
        if (d.toDate) return d.toDate()
        if (d instanceof Date) return d
        return new Date(d)
      }
      storesData.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())

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
        setStores(stores.map(s =>
          s.id === storeId
            ? {
                ...s,
                plan: data.plan,
                subscription: { ...s.subscription, status: data.status }
              }
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

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlan = filterPlan === 'all' || store.plan === filterPlan
    return matchesSearch && matchesPlan
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Tiendas</h1>
          <p className="text-gray-600 mt-1">{stores.length} tiendas registradas</p>
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
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all bg-white"
        >
          <option value="all">Todos los planes</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1e3a5f]">Tienda</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1e3a5f]">Subdominio</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1e3a5f]">Plan</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1e3a5f]">Estado Suscripcion</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1e3a5f]">Creada</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1e3a5f]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store) => (
                <tr key={store.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {store.logo ? (
                        <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-lg flex items-center justify-center">
                          <span className="text-[#2d6cb5] font-bold">{store.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#1e3a5f]">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.whatsapp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://${store.subdomain}.shopifree.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2d6cb5] hover:underline text-sm"
                    >
                      {store.subdomain}.shopifree.app
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${
                      store.plan === 'free' ? 'bg-gray-100 text-gray-600' :
                      store.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {store.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {store.subscription ? (
                        <>
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            store.subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                            store.subscription.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                            store.subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {SUBSCRIPTION_STATUS_LABELS[store.subscription.status] || store.subscription.status}
                          </span>
                          <button
                            onClick={() => handleSyncSubscription(store.id)}
                            disabled={syncingStore === store.id}
                            className="p-1 text-gray-400 hover:text-[#2d6cb5] hover:bg-[#f0f7ff] rounded transition-all disabled:opacity-50"
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
                  <td className="px-6 py-4 text-sm text-gray-600">
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
                    <button
                      onClick={() => setEditingStore(store)}
                      className="px-3 py-1.5 text-sm font-medium text-[#2d6cb5] hover:bg-[#f0f7ff] rounded-lg transition-all"
                    >
                      Editar plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron tiendas
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {editingStore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">
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
                      ? 'border-[#2d6cb5] bg-[#f0f7ff]'
                      : 'border-gray-200 hover:border-[#38bdf8]'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-[#1e3a5f] capitalize">{plan}</p>
                    <p className="text-sm text-gray-500">
                      {plan === 'free' ? 'Gratis' : `$${PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES].price}/mes`}
                    </p>
                  </div>
                  {editingStore.plan === plan && (
                    <span className="px-2 py-1 bg-[#2d6cb5] text-white text-xs rounded-lg">
                      Actual
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingStore(null)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
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
