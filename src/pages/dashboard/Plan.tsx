import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { PLAN_FEATURES, type PlanType } from '../../lib/stripe'

const plans: { id: PlanType; popular?: boolean }[] = [
  { id: 'free' },
  { id: 'pro', popular: true },
  { id: 'business' }
]

export default function Plan() {
  const { store, user, firebaseUser, refreshStore } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showToast('Suscripcion activada exitosamente!', 'success')
      refreshStore()
    } else if (searchParams.get('canceled') === 'true') {
      showToast('Pago cancelado', 'info')
    }
  }, [searchParams, showToast, refreshStore])

  const handleSelectPlan = async (planId: PlanType) => {
    if (!store || !user || !firebaseUser) {
      showToast('Error: No se encontro tu tienda', 'error')
      return
    }

    if (planId === 'free') {
      showToast('Ya tienes el plan gratuito', 'info')
      return
    }

    setProcessingPlan(planId)
    setLoading(true)

    try {
      // Call Cloud Function to create checkout session
      const response = await fetch(
        `${import.meta.env.VITE_FUNCTIONS_URL || ''}/createCheckoutSession`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: store.id,
            plan: planId,
            billing: selectedBilling,
            userId: firebaseUser.uid,
            email: firebaseUser.email
          })
        }
      )

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      showToast('Error al procesar el pago. Intenta de nuevo.', 'error')
    } finally {
      setLoading(false)
      setProcessingPlan(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!firebaseUser) return

    setLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_FUNCTIONS_URL || ''}/createPortalSession`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: firebaseUser.uid })
        }
      )

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        showToast('No se encontro suscripcion activa', 'info')
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      showToast('Error al abrir el portal de suscripcion', 'error')
    } finally {
      setLoading(false)
    }
  }

  const currentPlan = store?.plan || 'free'
  const hasActiveSubscription = store?.subscription?.status === 'active'

  return (
    <div className="max-w-5xl">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a5f]">Planes y precios</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Elige el plan que mejor se adapte a tu negocio</p>
      </div>

      {/* Current plan badge */}
      <div className="bg-gradient-to-r from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-600">Tu plan actual</p>
            <p className="font-semibold text-[#1e3a5f] capitalize text-sm sm:text-base">
              {PLAN_FEATURES[currentPlan].name}
              {store?.subscription?.cancelAtPeriodEnd && (
                <span className="text-red-500 text-xs ml-2">(Se cancela al final del periodo)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          {store?.planExpiresAt && (
            <span className="text-xs sm:text-sm text-gray-500">
              Expira: {new Date(store.planExpiresAt).toLocaleDateString()}
            </span>
          )}
          {hasActiveSubscription && (
            <button
              onClick={handleManageSubscription}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-[#2d6cb5] bg-white border border-[#2d6cb5] rounded-xl hover:bg-[#f0f7ff] transition-all disabled:opacity-50"
            >
              Administrar suscripcion
            </button>
          )}
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="bg-gray-100 p-1 rounded-xl flex">
          <button
            onClick={() => setSelectedBilling('monthly')}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedBilling === 'monthly'
                ? 'bg-white text-[#1e3a5f] shadow-sm'
                : 'text-gray-600 hover:text-[#1e3a5f]'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setSelectedBilling('yearly')}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 ${
              selectedBilling === 'yearly'
                ? 'bg-white text-[#1e3a5f] shadow-sm'
                : 'text-gray-600 hover:text-[#1e3a5f]'
            }`}
          >
            Anual
            <span className="px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {plans.map(({ id: planId, popular: isPopular }) => {
          const plan = PLAN_FEATURES[planId]
          const isCurrentPlan = planId === currentPlan
          const price = selectedBilling === 'yearly' ? plan.priceYearly : plan.price
          const isProcessing = processingPlan === planId

          return (
            <div
              key={planId}
              className={`relative bg-white rounded-2xl border-2 p-4 sm:p-6 shadow-sm transition-all ${
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

              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-[#1e3a5f]">{plan.name}</h3>
                <div className="mt-3 sm:mt-4">
                  {price === 0 ? (
                    <span className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">Gratis</span>
                  ) : (
                    <>
                      <span className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">${price}</span>
                      <span className="text-gray-500 text-sm sm:text-base">/{selectedBilling === 'yearly' ? 'año' : 'mes'}</span>
                    </>
                  )}
                </div>
                {selectedBilling === 'yearly' && price > 0 && (
                  <p className="text-xs sm:text-sm text-green-600 mt-1">
                    Ahorras ${((plan.price * 12) - plan.priceYearly).toFixed(0)}/año
                  </p>
                )}
              </div>

              <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(planId)}
                disabled={isCurrentPlan || loading || planId === 'free'}
                className={`w-full py-2.5 sm:py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                  isCurrentPlan || planId === 'free'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isPopular
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white hover:from-[#2d6cb5] hover:to-[#38bdf8] shadow-lg shadow-[#1e3a5f]/20'
                    : 'bg-[#f0f7ff] text-[#1e3a5f] hover:bg-[#e0efff]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Procesando...
                  </>
                ) : isCurrentPlan ? (
                  'Plan actual'
                ) : planId === 'free' ? (
                  'Plan gratuito'
                ) : (
                  'Mejorar plan'
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="mt-8 sm:mt-12 bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold text-[#1e3a5f] mb-3 sm:mb-4">Preguntas frecuentes</h2>
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h3 className="font-medium text-[#1e3a5f] text-sm sm:text-base">Puedo cambiar de plan cuando quiera?</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Si, puedes mejorar o bajar tu plan en cualquier momento desde el portal de suscripcion.</p>
          </div>
          <div>
            <h3 className="font-medium text-[#1e3a5f] text-sm sm:text-base">Que metodos de pago aceptan?</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Aceptamos todas las tarjetas de credito/debito principales a traves de Stripe.</p>
          </div>
          <div>
            <h3 className="font-medium text-[#1e3a5f] text-sm sm:text-base">Puedo cancelar cuando quiera?</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Si, puedes cancelar tu suscripcion en cualquier momento. Mantendras acceso hasta el final del periodo pagado.</p>
          </div>
          <div>
            <h3 className="font-medium text-[#1e3a5f] text-sm sm:text-base">Hay periodo de prueba?</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">El plan gratuito no tiene limite de tiempo. Puedes usarlo el tiempo que quieras antes de decidir mejorar.</p>
          </div>
        </div>
      </div>

      {/* Stripe badge */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-xs sm:text-sm text-gray-400 flex items-center justify-center gap-2">
          <svg className="h-4" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M59.64 14.28c0-4.67-2.27-8.35-6.6-8.35-4.35 0-6.99 3.68-6.99 8.31 0 5.48 3.11 8.24 7.58 8.24 2.18 0 3.83-.49 5.08-1.18v-3.64c-1.25.62-2.69 1.01-4.51 1.01-1.78 0-3.37-.62-3.57-2.78h8.99c0-.24.02-1.18.02-1.61zm-9.09-1.73c0-2.06 1.27-2.92 2.43-2.92 1.13 0 2.32.86 2.32 2.92h-4.75z" fill="currentColor"/>
            <path d="M40.94 5.93c-1.8 0-2.95.84-3.6 1.43l-.24-1.14h-4.04v21.08l4.59-.97v-5.12c.66.48 1.64 1.16 3.26 1.16 3.29 0 6.29-2.64 6.29-8.46-.01-5.34-3.06-8.98-6.26-8.98zm-1.1 13.81c-1.09 0-1.73-.39-2.17-.87v-6.9c.48-.53 1.14-.91 2.17-.91 1.66 0 2.8 1.85 2.8 4.33 0 2.54-1.12 4.35-2.8 4.35z" fill="currentColor"/>
            <path d="M27.56 4.47l4.6-.98V0l-4.6.97v3.5zM32.16 6.15h-4.6v16.05h4.6V6.15z" fill="currentColor"/>
            <path d="M22.48 7.4l-.29-1.25h-3.97v16.05h4.59v-10.9c1.09-1.41 2.92-1.16 3.5-.96V6.15c-.6-.22-2.79-.63-3.83 1.25z" fill="currentColor"/>
            <path d="M13.28 2.45l-4.48.95-.02 14.7c0 2.72 2.04 4.72 4.77 4.72 1.51 0 2.62-.28 3.23-.6v-3.72c-.59.24-3.5 1.08-3.5-1.64V9.87h3.5V6.15h-3.5V2.45z" fill="currentColor"/>
            <path d="M4.67 10.2c0-.72.59-1 1.57-1 1.4 0 3.17.42 4.57 1.18V6.28c-1.53-.61-3.04-.84-4.57-.84C2.49 5.44 0 7.36 0 10.56c0 4.94 6.8 4.15 6.8 6.28 0 .85-.74 1.13-1.77 1.13-1.53 0-3.49-.63-5.03-1.48v4.15c1.71.74 3.45 1.05 5.03 1.05 3.87 0 6.54-1.91 6.54-5.15-.02-5.33-6.9-4.38-6.9-6.34z" fill="currentColor"/>
          </svg>
          Pagos seguros con Stripe
        </p>
      </div>
    </div>
  )
}
