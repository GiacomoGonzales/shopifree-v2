import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { Store } from '../../types'

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: 0,
    description: 'Perfecto para empezar',
    features: [
      'Hasta 20 productos',
      '1 imagen por producto',
      'Catalogo con tu subdomain',
      'Pedidos por WhatsApp',
      'Soporte por email'
    ],
    notIncluded: [
      'Dominio personalizado',
      'Multiples imagenes',
      'Variaciones/modificadores',
      'Sin marca Shopifree',
      'Analytics avanzados'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    description: 'Para negocios en crecimiento',
    popular: true,
    features: [
      'Productos ilimitados',
      'Hasta 5 imagenes por producto',
      'Dominio personalizado',
      'Variaciones (talla, color)',
      'Modificadores (extras)',
      'Sin marca Shopifree',
      'Analytics basicos',
      'Soporte prioritario'
    ],
    notIncluded: [
      'Pasarela de pagos',
      'Cupones de descuento',
      'Multi-tienda'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: 29.99,
    description: 'Para negocios establecidos',
    features: [
      'Todo de Pro, mas:',
      'Integracion MercadoPago',
      'Cupones de descuento',
      'Analytics avanzados',
      'Exportar pedidos',
      'API access',
      'Soporte 24/7',
      'Multi-tienda (hasta 3)'
    ],
    notIncluded: []
  }
]

export default function Plan() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStore = async () => {
      if (!user) return

      try {
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('ownerId', '==', user.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          setStore({ ...storeData, id: storeSnapshot.docs[0].id })
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  const currentPlan = store?.plan || 'free'

  return (
    <div className="max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Planes y precios</h1>
        <p className="text-gray-600 mt-1">Elige el plan que mejor se adapte a tu negocio</p>
      </div>

      {/* Current plan badge */}
      <div className="bg-gradient-to-r from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl p-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tu plan actual</p>
            <p className="font-semibold text-[#1e3a5f] capitalize">{currentPlan}</p>
          </div>
        </div>
        {currentPlan === 'free' && (
          <span className="text-sm text-gray-500">Prueba gratis por tiempo limitado</span>
        )}
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan
          const isPopular = plan.popular

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 shadow-sm transition-all ${
                isPopular
                  ? 'border-[#2d6cb5] shadow-lg shadow-[#2d6cb5]/10'
                  : 'border-gray-100 hover:border-[#38bdf8]/50'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white text-xs font-semibold rounded-full shadow-lg">
                    Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-[#1e3a5f]">{plan.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                <div className="mt-4">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold text-[#1e3a5f]">Gratis</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-[#1e3a5f]">${plan.price}</span>
                      <span className="text-gray-500">/mes</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
                {plan.notIncluded.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => showToast('Proximamente - Pagos con MercadoPago', 'info')}
                disabled={isCurrentPlan}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isPopular
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white hover:from-[#2d6cb5] hover:to-[#38bdf8] shadow-lg shadow-[#1e3a5f]/20'
                    : 'bg-[#f0f7ff] text-[#1e3a5f] hover:bg-[#e0efff]'
                }`}
              >
                {isCurrentPlan ? 'Plan actual' : plan.price === 0 ? 'Empezar gratis' : 'Mejorar plan'}
              </button>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-[#1e3a5f]">Puedo cambiar de plan cuando quiera?</h3>
            <p className="text-sm text-gray-600 mt-1">Si, puedes mejorar o bajar tu plan en cualquier momento. Los cambios se aplican inmediatamente.</p>
          </div>
          <div>
            <h3 className="font-medium text-[#1e3a5f]">Que metodos de pago aceptan?</h3>
            <p className="text-sm text-gray-600 mt-1">Aceptamos tarjetas de credito/debito y MercadoPago en todos los paises de Latinoamerica.</p>
          </div>
          <div>
            <h3 className="font-medium text-[#1e3a5f]">Hay periodo de prueba?</h3>
            <p className="text-sm text-gray-600 mt-1">El plan gratuito no tiene limite de tiempo. Puedes usarlo el tiempo que quieras antes de decidir mejorar.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
