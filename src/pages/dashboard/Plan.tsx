import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import { PLAN_FEATURES, type PlanType } from '../../lib/stripe'

const plans: { id: PlanType; popular?: boolean }[] = [
  { id: 'free' },
  { id: 'pro', popular: true },
  { id: 'business' }
]

export default function Plan() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { store, user, firebaseUser, refreshStore } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const toastShownRef = useRef(false)

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (toastShownRef.current) return

    if (searchParams.get('success') === 'true') {
      toastShownRef.current = true
      showToast(t('plan.toast.success'), 'success')
      refreshStore()
      // Clear URL params
      navigate(localePath('/dashboard/plan'), { replace: true })
    } else if (searchParams.get('canceled') === 'true') {
      toastShownRef.current = true
      showToast(t('plan.toast.canceled'), 'info')
      navigate(localePath('/dashboard/plan'), { replace: true })
    }
  }, [searchParams, showToast, refreshStore, navigate, t, localePath])

  const handleSelectPlan = async (planId: PlanType) => {
    if (!store || !user || !firebaseUser) {
      showToast(t('plan.toast.storeNotFound'), 'error')
      return
    }

    if (planId === 'free') {
      showToast(t('plan.toast.alreadyFree'), 'info')
      return
    }

    setProcessingPlan(planId)
    setLoading(true)

    try {
      // Call Vercel API to create checkout session
      const apiBase = import.meta.env.DEV ? 'https://shopifree.app' : ''
      const response = await fetch(
        `${apiBase}/api/create-checkout`,
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
      showToast(t('plan.toast.paymentError'), 'error')
    } finally {
      setLoading(false)
      setProcessingPlan(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!firebaseUser) return

    setLoading(true)
    try {
      const apiBase = import.meta.env.DEV ? 'https://shopifree.app' : ''
      const response = await fetch(
        `${apiBase}/api/create-portal`,
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
        showToast(t('plan.toast.noSubscription'), 'info')
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      showToast(t('plan.toast.portalError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const currentPlan = store?.plan || 'free'
  const hasActiveSubscription = store?.subscription?.status === 'active'
  const isNative = Capacitor.isNativePlatform()

  // On iOS native, redirect to dashboard (Apple requires IAP, not available yet)
  useEffect(() => {
    if (isNative) {
      navigate(localePath('/dashboard'), { replace: true })
    }
  }, [isNative, navigate, localePath])

  if (isNative) return null

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('plan.title')}</h1>
          <p className="text-gray-600 mt-1">{t('plan.subtitle')}</p>
        </div>
        {/* Billing toggle */}
        <div className="bg-gray-100 p-1 rounded-xl flex w-fit">
          <button
            onClick={() => setSelectedBilling('monthly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedBilling === 'monthly'
                ? 'bg-white text-[#1e3a5f] shadow-sm'
                : 'text-gray-600 hover:text-[#1e3a5f]'
            }`}
          >
            {t('plan.billing.monthly')}
          </button>
          <button
            onClick={() => setSelectedBilling('yearly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedBilling === 'yearly'
                ? 'bg-white text-[#1e3a5f] shadow-sm'
                : 'text-gray-600 hover:text-[#1e3a5f]'
            }`}
          >
            {t('plan.billing.yearly')}
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{t('plan.billing.discount')}</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column - Current Plan */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current plan badge */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('plan.current')}</p>
                <p className="font-bold text-[#1e3a5f] text-lg capitalize">
                  {PLAN_FEATURES[currentPlan].name}
                </p>
              </div>
            </div>

            {store?.subscription?.cancelAtPeriodEnd && (
              <div className="p-3 bg-red-50 rounded-xl mb-4">
                <p className="text-sm text-red-600">{t('plan.cancelAtPeriodEnd')}</p>
              </div>
            )}

            {store?.planExpiresAt && (
              <p className="text-sm text-gray-500 mb-4">
                {t('plan.expires', { date: new Date(store.planExpiresAt).toLocaleDateString() })}
              </p>
            )}

            {hasActiveSubscription && (
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm font-medium text-[#2d6cb5] bg-[#f0f7ff] border border-[#2d6cb5]/20 rounded-xl hover:bg-[#e0efff] transition-all disabled:opacity-50"
              >
                {t('plan.manage')}
              </button>
            )}
          </div>

          {/* Support */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-[#1e3a5f] mb-3">{t('plan.support.title')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('plan.support.description')}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="h-4" viewBox="0 0 60 25" fill="currentColor">
                <path d="M59.64 14.28c0-4.67-2.27-8.35-6.6-8.35-4.35 0-6.99 3.68-6.99 8.31 0 5.48 3.11 8.24 7.58 8.24 2.18 0 3.83-.49 5.08-1.18v-3.64c-1.25.62-2.69 1.01-4.51 1.01-1.78 0-3.37-.62-3.57-2.78h8.99c0-.24.02-1.18.02-1.61zm-9.09-1.73c0-2.06 1.27-2.92 2.43-2.92 1.13 0 2.32.86 2.32 2.92h-4.75z"/>
                <path d="M40.94 5.93c-1.8 0-2.95.84-3.6 1.43l-.24-1.14h-4.04v21.08l4.59-.97v-5.12c.66.48 1.64 1.16 3.26 1.16 3.29 0 6.29-2.64 6.29-8.46-.01-5.34-3.06-8.98-6.26-8.98zm-1.1 13.81c-1.09 0-1.73-.39-2.17-.87v-6.9c.48-.53 1.14-.91 2.17-.91 1.66 0 2.8 1.85 2.8 4.33 0 2.54-1.12 4.35-2.8 4.35z"/>
                <path d="M27.56 4.47l4.6-.98V0l-4.6.97v3.5zM32.16 6.15h-4.6v16.05h4.6V6.15z"/>
                <path d="M22.48 7.4l-.29-1.25h-3.97v16.05h4.59v-10.9c1.09-1.41 2.92-1.16 3.5-.96V6.15c-.6-.22-2.79-.63-3.83 1.25z"/>
                <path d="M13.28 2.45l-4.48.95-.02 14.7c0 2.72 2.04 4.72 4.77 4.72 1.51 0 2.62-.28 3.23-.6v-3.72c-.59.24-3.5 1.08-3.5-1.64V9.87h3.5V6.15h-3.5V2.45z"/>
                <path d="M4.67 10.2c0-.72.59-1 1.57-1 1.4 0 3.17.42 4.57 1.18V6.28c-1.53-.61-3.04-.84-4.57-.84C2.49 5.44 0 7.36 0 10.56c0 4.94 6.8 4.15 6.8 6.28 0 .85-.74 1.13-1.77 1.13-1.53 0-3.49-.63-5.03-1.48v4.15c1.71.74 3.45 1.05 5.03 1.05 3.87 0 6.54-1.91 6.54-5.15-.02-5.33-6.9-4.38-6.9-6.34z"/>
              </svg>
              {t('plan.support.stripe')}
            </div>
          </div>
        </div>

        {/* Right Column - Plans */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(({ id: planId, popular: isPopular }) => {
              const plan = PLAN_FEATURES[planId]
              const isCurrentPlan = planId === currentPlan
              const price = selectedBilling === 'yearly' ? plan.priceYearly : plan.price
              const isProcessing = processingPlan === planId

              return (
                <div
                  key={planId}
                  className={`relative bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
                    isPopular
                      ? 'border-[#2d6cb5] shadow-lg shadow-[#2d6cb5]/10'
                      : 'border-gray-100 hover:border-[#38bdf8]/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white text-xs font-semibold rounded-full shadow-lg">
                        {t('plan.badge.popular')}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-[#1e3a5f]">{plan.name}</h3>
                    <div className="mt-3">
                      {price === 0 ? (
                        <span className="text-3xl font-bold text-[#1e3a5f]">{t('plan.badge.free')}</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-[#1e3a5f]">${price}</span>
                          <span className="text-gray-500 text-sm">{selectedBilling === 'yearly' ? t('plan.billing.perYear') : t('plan.billing.perMonth')}</span>
                        </>
                      )}
                    </div>
                    {selectedBilling === 'yearly' && price > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {t('plan.billing.savings', { amount: ((plan.price * 12) - plan.priceYearly).toFixed(0) })}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(planId)}
                    disabled={isCurrentPlan || loading || planId === 'free'}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
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
                        {t('plan.buttons.processing')}
                      </>
                    ) : isCurrentPlan ? (
                      t('plan.buttons.current')
                    ) : planId === 'free' ? (
                      t('plan.buttons.free')
                    ) : (
                      t('plan.buttons.upgrade')
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* FAQ - Two Columns */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('plan.faq.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.changePlan.question')}</h3>
              <p className="text-xs text-gray-600 mt-1">{t('plan.faq.changePlan.answer')}</p>
            </div>
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.paymentMethods.question')}</h3>
              <p className="text-xs text-gray-600 mt-1">{t('plan.faq.paymentMethods.answer')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.cancel.question')}</h3>
              <p className="text-xs text-gray-600 mt-1">{t('plan.faq.cancel.answer')}</p>
            </div>
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.trial.question')}</h3>
              <p className="text-xs text-gray-600 mt-1">{t('plan.faq.trial.answer')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
