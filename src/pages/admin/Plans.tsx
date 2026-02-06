import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PLAN_FEATURES } from '../../lib/stripe'
import type { Store } from '../../types'

export default function AdminPlans() {
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

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

  // Calculate stats
  const activeSubscriptions = stores.filter(s => s.subscription?.status === 'active')
  const proSubscriptions = activeSubscriptions.filter(s => s.plan === 'pro')
  const businessSubscriptions = activeSubscriptions.filter(s => s.plan === 'business')

  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = (proSubscriptions.length * PLAN_FEATURES.pro.price) + (businessSubscriptions.length * PLAN_FEATURES.business.price)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planes y Suscripciones</h1>
        <p className="text-gray-500 mt-1">Estadisticas de suscripciones y revenue</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">MRR (Ingresos Mensuales)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${mrr.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Suscripciones activas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{activeSubscriptions.length}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Suscripciones Pro</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{proSubscriptions.length}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Suscripciones Business</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{businessSubscriptions.length}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['free', 'pro', 'business'] as const).map((planId) => {
          const plan = PLAN_FEATURES[planId]
          const count = stores.filter(s => s.plan === planId).length
          const percentage = stores.length > 0 ? Math.round((count / stores.length) * 100) : 0

          return (
            <div key={planId} className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
              {/* Gradient accent bar */}
              <div className={`h-1.5 ${
                planId === 'free' ? 'bg-gray-300' :
                planId === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500' :
                'bg-gradient-to-r from-amber-500 to-orange-500'
              }`} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                    planId === 'free' ? 'bg-gray-100/80 text-gray-600' :
                    planId === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' :
                    'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  }`}>
                    ${plan.price}/mes
                  </span>
                </div>

                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-gray-900">{count}</p>
                  <p className="text-gray-400 text-sm">tiendas ({percentage}%)</p>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full ${
                      planId === 'free' ? 'bg-gray-300' :
                      planId === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500' :
                      'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Caracteristicas:</p>
                  <ul className="space-y-1">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-gray-400">+{plan.features.length - 4} mas...</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Active Subscriptions List */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Suscripciones activas</h2>

        {activeSubscriptions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay suscripciones activas todavia</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/60">
                  <th className="text-left py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tienda</th>
                  <th className="text-left py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</th>
                  <th className="text-left py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Stripe ID</th>
                  <th className="text-left py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Proximo cobro</th>
                  <th className="text-left py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                {activeSubscriptions.map((store) => (
                  <tr key={store.id} className="border-b border-white/60 hover:bg-white/40 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {store.logo ? (
                          <img src={store.logo} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-black/5" />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center text-xs font-bold text-violet-600">
                            {store.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{store.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium capitalize ${
                        store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      }`}>
                        {store.plan}
                      </span>
                    </td>
                    <td className="py-3">
                      <code className="text-xs bg-white/50 text-gray-600 px-2 py-1 rounded border border-white/80">
                        {store.subscription?.stripeSubscriptionId?.slice(0, 20)}...
                      </code>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {store.subscription?.currentPeriodEnd
                        ? new Date(store.subscription.currentPeriodEnd).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        store.subscription?.cancelAtPeriodEnd
                          ? 'bg-yellow-100/80 text-yellow-700'
                          : 'bg-green-100/80 text-green-700'
                      }`}>
                        {store.subscription?.cancelAtPeriodEnd ? 'Cancela pronto' : 'Activa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stripe Setup Instructions */}
      <div className="bg-white/40 backdrop-blur border border-white/60 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuracion de Stripe</h3>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Para activar los pagos automaticos, necesitas:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Crear productos y precios en el <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline hover:text-violet-700">Dashboard de Stripe</a></li>
            <li>Configurar las variables de entorno con los Price IDs</li>
            <li>Configurar el webhook endpoint en Stripe para recibir eventos</li>
            <li>Desplegar las Cloud Functions con <code className="bg-white/50 px-1 rounded text-gray-700 border border-white/80">firebase deploy --only functions</code></li>
          </ol>
        </div>
      </div>
    </div>
  )
}
