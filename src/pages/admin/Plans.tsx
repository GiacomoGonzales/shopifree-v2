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
  const mrr = (proSubscriptions.length * 9.99) + (businessSubscriptions.length * 29.99)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Planes y Suscripciones</h1>
        <p className="text-gray-600 mt-1">Estadisticas de suscripciones y revenue</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">${mrr.toFixed(2)}</p>
              <p className="text-gray-600 text-sm">MRR (Ingresos Mensuales)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">{activeSubscriptions.length}</p>
              <p className="text-gray-600 text-sm">Suscripciones activas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2d6cb5] to-[#1e3a5f] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">{proSubscriptions.length}</p>
              <p className="text-gray-600 text-sm">Suscripciones Pro</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">{businessSubscriptions.length}</p>
              <p className="text-gray-600 text-sm">Suscripciones Business</p>
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
            <div key={planId} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1e3a5f]">{plan.name}</h3>
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                  planId === 'free' ? 'bg-gray-100 text-gray-600' :
                  planId === 'pro' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  ${plan.price}/mes
                </span>
              </div>

              <div className="text-center py-4">
                <p className="text-4xl font-bold text-[#1e3a5f]">{count}</p>
                <p className="text-gray-500 text-sm">tiendas ({percentage}%)</p>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full ${
                    planId === 'free' ? 'bg-gray-400' :
                    planId === 'pro' ? 'bg-[#2d6cb5]' :
                    'bg-purple-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Caracteristicas:</p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          )
        })}
      </div>

      {/* Active Subscriptions List */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Suscripciones activas</h2>

        {activeSubscriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay suscripciones activas todavia</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Tienda</th>
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Plan</th>
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Stripe ID</th>
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Proximo cobro</th>
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {activeSubscriptions.map((store) => (
                  <tr key={store.id} className="border-b border-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {store.logo ? (
                          <img src={store.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">
                            {store.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-[#1e3a5f]">{store.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                        store.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {store.plan}
                      </span>
                    </td>
                    <td className="py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {store.subscription?.stripeSubscriptionId?.slice(0, 20)}...
                      </code>
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {store.subscription?.currentPeriodEnd
                        ? new Date(store.subscription.currentPeriodEnd).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        store.subscription?.cancelAtPeriodEnd
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
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
      <div className="bg-gradient-to-r from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[#1e3a5f] mb-3">Configuracion de Stripe</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>Para activar los pagos automaticos, necesitas:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Crear productos y precios en el <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-[#2d6cb5] underline">Dashboard de Stripe</a></li>
            <li>Configurar las variables de entorno con los Price IDs</li>
            <li>Configurar el webhook endpoint en Stripe para recibir eventos</li>
            <li>Desplegar las Cloud Functions con <code className="bg-gray-100 px-1 rounded">firebase deploy --only functions</code></li>
          </ol>
        </div>
      </div>
    </div>
  )
}
