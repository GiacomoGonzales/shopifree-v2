import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PLAN_FEATURES } from '../../lib/stripe'
import type { Store } from '../../types'

export default function AdminPlans() {
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  type SortField = 'name' | 'plan' | 'nextBilling' | 'status'
  type SortOrder = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

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
    } finally {
      setLoading(false)
    }
  }

  const activeSubscriptions = useMemo(() => {
    const result = stores.filter(s => s.subscription?.status === 'active')

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'plan': {
          const planOrder: Record<string, number> = { pro: 0, business: 1 }
          comparison = (planOrder[a.plan || 'pro'] || 0) - (planOrder[b.plan || 'pro'] || 0)
          break
        }
        case 'nextBilling': {
          const dateA = a.subscription?.currentPeriodEnd ? new Date(a.subscription.currentPeriodEnd).getTime() : 0
          const dateB = b.subscription?.currentPeriodEnd ? new Date(b.subscription.currentPeriodEnd).getTime() : 0
          comparison = dateA - dateB
          break
        }
        case 'status': {
          const statusA = a.subscription?.cancelAtPeriodEnd ? 1 : 0
          const statusB = b.subscription?.cancelAtPeriodEnd ? 1 : 0
          comparison = statusA - statusB
          break
        }
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [stores, sortField, sortOrder])

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
        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  const proSubscriptions = activeSubscriptions.filter(s => s.plan === 'pro')
  const businessSubscriptions = activeSubscriptions.filter(s => s.plan === 'business')

  const mrr = (proSubscriptions.length * PLAN_FEATURES.pro.price) + (businessSubscriptions.length * PLAN_FEATURES.business.price)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Planes y suscripciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">Estadísticas de suscripciones y revenue</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MRR mensual" value={`$${mrr.toFixed(2)}`} />
        <StatCard label="Suscripciones activas" value={activeSubscriptions.length} />
        <StatCard label="Pro" value={proSubscriptions.length} />
        <StatCard label="Business" value={businessSubscriptions.length} />
      </div>

      {/* Plan Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['free', 'pro', 'business'] as const).map((planId) => {
          const plan = PLAN_FEATURES[planId]
          const count = stores.filter(s => s.plan === planId).length
          const percentage = stores.length > 0 ? Math.round((count / stores.length) * 100) : 0

          return (
            <div key={planId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                  <span className="px-2 py-0.5 text-[11px] rounded-sm font-medium border border-gray-200 text-gray-700 tabular-nums">
                    ${plan.price}/mes
                  </span>
                </div>

                <div className="py-2">
                  <p className="text-3xl font-semibold text-gray-900 tabular-nums">{count}</p>
                  <p className="text-[12px] text-gray-500">tiendas ({percentage}%)</p>
                </div>

                <div className="h-1 bg-gray-100 rounded-full overflow-hidden my-4">
                  <div
                    className="h-full rounded-full bg-gray-900 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Características</p>
                  <ul className="space-y-1">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="text-[12px] text-gray-600 flex items-start gap-1.5">
                        <svg className="w-3 h-3 text-gray-900 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-[11px] text-gray-500 ml-4">+{plan.features.length - 4} más...</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Active Subscriptions List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">Suscripciones activas</h2>
        </div>

        {activeSubscriptions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No hay suscripciones activas todavía</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">Tienda <SortIcon field="name" /></div>
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('plan')}>
                      <div className="flex items-center gap-1">Plan <SortIcon field="plan" /></div>
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Stripe ID</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('nextBilling')}>
                      <div className="flex items-center gap-1">Próximo cobro <SortIcon field="nextBilling" /></div>
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Estado <SortIcon field="status" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeSubscriptions.map((store) => (
                    <tr key={store.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {store.logo ? (
                            <img src={store.logo} alt="" className="w-7 h-7 rounded-md object-cover" />
                          ) : (
                            <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center text-[12px] font-medium text-gray-600">
                              {store.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 text-[13px]">{store.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge plan={store.plan} />
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                          {store.subscription?.stripeSubscriptionId?.slice(0, 20)}...
                        </code>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-500 tabular-nums">
                        {store.subscription?.currentPeriodEnd
                          ? new Date(store.subscription.currentPeriodEnd).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide ${
                            store.subscription?.cancelAtPeriodEnd
                              ? 'bg-gray-900 text-white'
                              : 'border border-gray-200 text-gray-700'
                          }`}
                        >
                          {store.subscription?.cancelAtPeriodEnd ? 'Cancela pronto' : 'Activa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {activeSubscriptions.map((store) => (
                <div key={store.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {store.logo ? (
                      <img src={store.logo} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                        {store.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 truncate">{store.name}</p>
                        <PlanBadge plan={store.plan} />
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {store.subscription?.stripeSubscriptionId || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pl-[52px]">
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      Cobro: {store.subscription?.currentPeriodEnd
                        ? new Date(store.subscription.currentPeriodEnd).toLocaleDateString()
                        : '-'
                      }
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide ${
                        store.subscription?.cancelAtPeriodEnd
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-200 text-gray-700'
                      }`}
                    >
                      {store.subscription?.cancelAtPeriodEnd ? 'Cancela pronto' : 'Activa'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stripe Setup Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Configuración de Stripe</h3>
        <div className="space-y-2 text-[13px] text-gray-600">
          <p>Para activar los pagos automáticos, necesitás:</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Crear productos y precios en el <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:no-underline font-medium">Dashboard de Stripe</a></li>
            <li>Configurar las variables de entorno con los Price IDs</li>
            <li>Configurar el webhook endpoint en Stripe para recibir eventos</li>
            <li>Desplegar las Cloud Functions con <code className="bg-white px-1.5 py-0.5 rounded text-[11px] text-gray-900 border border-gray-200">firebase deploy --only functions</code></li>
          </ol>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  )
}

function PlanBadge({ plan }: { plan?: string }) {
  const base = 'px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide'
  if (plan === 'pro') return <span className={`${base} bg-gray-900 text-white`}>Pro</span>
  if (plan === 'business') return <span className={`${base} bg-black text-white`}>Business</span>
  return <span className={`${base} border border-gray-200 text-gray-600`}>Free</span>
}
