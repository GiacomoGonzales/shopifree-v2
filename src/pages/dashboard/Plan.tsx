import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import { PLAN_FEATURES, STRIPE_PRICES, type PlanType } from '../../lib/stripe'

type BillingCycle = 'monthly' | 'yearly'

// 4 paid options shown in a 2x2 grid: Pro Monthly / Pro Yearly / Business Monthly / Business Yearly.
// The user explicitly asked to drop the monthly/yearly toggle (not everyone found it) and show
// every option side by side.
const paidOptions: { id: Exclude<PlanType, 'free'>; billing: BillingCycle; popular?: boolean }[] = [
  { id: 'pro', billing: 'monthly', popular: true },
  { id: 'pro', billing: 'yearly' },
  { id: 'business', billing: 'monthly' },
  { id: 'business', billing: 'yearly' }
]

export default function Plan() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { store, user, firebaseUser, refreshStore } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Canonical self-path — preserves whether we're under /dashboard/plan or /finance/subscription
  const selfPath = location.pathname
  const [loading, setLoading] = useState(false)
  const [processingKey, setProcessingKey] = useState<string | null>(null)
  const toastShownRef = useRef(false)
  const upgradeTriggeredRef = useRef(false)

  // Auto-trigger upgrade when coming from another page with ?upgrade=<plan>&billing=<cycle>
  useEffect(() => {
    const upgradePlan = searchParams.get('upgrade') as Exclude<PlanType, 'free'> | null
    const upgradeBilling: BillingCycle = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly'
    if (upgradePlan && !upgradeTriggeredRef.current && store && user && firebaseUser) {
      upgradeTriggeredRef.current = true
      navigate(selfPath, { replace: true })
      handleSelectPlan(upgradePlan, upgradeBilling)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, store, user, firebaseUser])

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (toastShownRef.current) return

    if (searchParams.get('success') === 'true') {
      toastShownRef.current = true
      showToast(t('plan.toast.success'), 'success')
      refreshStore()
      // Clear URL params
      navigate(selfPath, { replace: true })
    } else if (searchParams.get('canceled') === 'true') {
      toastShownRef.current = true
      showToast(t('plan.toast.canceled'), 'info')
      navigate(selfPath, { replace: true })
    }
  }, [searchParams, showToast, refreshStore, navigate, t, localePath])

  const handleSelectPlan = async (planId: Exclude<PlanType, 'free'>, billing: BillingCycle) => {
    if (!store || !user || !firebaseUser) {
      showToast(t('plan.toast.storeNotFound'), 'error')
      return
    }

    const key = `${planId}_${billing}`
    setProcessingKey(key)
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
            billing,
            userId: firebaseUser.uid,
            email: firebaseUser.email,
            ...(qualifiesForDiscount && billing === 'monthly' && { applyDiscount: true })
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
      setProcessingKey(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!firebaseUser) return

    setLoading(true)
    try {
      const apiBase = import.meta.env.DEV ? 'https://shopifree.app' : ''
      const response = await fetch(
        `${apiBase}/api/create-checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'portal', userId: firebaseUser.uid })
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
  const hasActiveSubscription = store?.subscription?.status === 'active' || store?.subscription?.status === 'trialing'
  const stripeIsTrialing = store?.subscription?.status === 'trialing'
  const isNative = Capacitor.isNativePlatform()

  // Signup-time trial (stored on the store document, no Stripe subscription yet).
  const signupTrialEnd = (() => {
    if (!store?.trialEndsAt || store?.subscription) return null
    const raw = store.trialEndsAt as Date | string | { toDate: () => Date }
    const d = raw instanceof Date
      ? raw
      : typeof raw === 'object' && raw && 'toDate' in raw
        ? raw.toDate()
        : new Date(raw as string)
    return d.getTime() > Date.now() ? d : null
  })()

  const isTrialing = stripeIsTrialing || signupTrialEnd !== null
  const effectiveTrialEnd: Date | null =
    stripeIsTrialing && store?.subscription?.trialEnd
      ? new Date(store.subscription.trialEnd)
      : signupTrialEnd

  const trialDaysLeft = (() => {
    if (!effectiveTrialEnd) return 0
    return Math.max(0, Math.ceil((effectiveTrialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  })()

  // 50% discount qualification: trialing with <=5 days left, OR free plan with expired trial
  const qualifiesForDiscount = (() => {
    if (isTrialing && trialDaysLeft <= 5) return true
    // Free plan user who had a trial (trialEndsAt exists) and is no longer trialing
    if (currentPlan === 'free' && store?.trialEndsAt && !isTrialing) return true
    return false
  })()

  // Derive current billing cycle from the subscription's Stripe priceId
  const currentBilling: BillingCycle | null = (() => {
    const priceId = store?.subscription?.stripePriceId
    if (!priceId) return null
    if (priceId === STRIPE_PRICES.pro.yearly || priceId === STRIPE_PRICES.business.yearly) return 'yearly'
    if (priceId === STRIPE_PRICES.pro.monthly || priceId === STRIPE_PRICES.business.monthly) return 'monthly'
    return null
  })()

  // Subscriptions only on web — iOS + Android mobile builds redirect to dashboard.
  useEffect(() => {
    if (isNative) {
      navigate(localePath('/dashboard'), { replace: true })
    }
  }, [isNative, navigate, localePath])

  if (isNative) return null

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">{t('plan.title')}</h1>
        <p className="text-gray-600 mt-1">{t('plan.subtitle')}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column - Current Plan */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current plan badge */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('plan.current')}</p>
                <p className="font-bold text-[#1e3a5f] text-lg capitalize">
                  {PLAN_FEATURES[currentPlan].name}{isTrialing ? ' Trial' : ''}
                </p>
              </div>
            </div>

            {isTrialing && effectiveTrialEnd && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                    {t('plan.trial.badge')}
                  </span>
                  <span className="text-sm font-medium text-amber-700">
                    {t('plan.trial.daysLeft', { days: trialDaysLeft })}
                  </span>
                </div>
                <p className="text-xs text-amber-600">
                  {t('plan.trial.endsAt', { date: effectiveTrialEnd.toLocaleDateString() })}
                </p>
              </div>
            )}

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

          {/* Downgrade to Free — only shown when the user has a paid subscription to cancel */}
          {hasActiveSubscription && (
            <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-1">{PLAN_FEATURES.free.name}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {PLAN_FEATURES.free.features.slice(0, 2).join(' · ')}
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {t('plan.buttons.downgrade')}
              </button>
            </div>
          )}

          {/* Support */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
            <h3 className="font-semibold text-[#1e3a5f] mb-3">{t('plan.support.title')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('plan.support.description')}
            </p>
            <a
              href="mailto:admin@shopifree.app"
              className="flex items-center gap-2 text-sm text-[#2d6cb5] hover:text-[#1e3a5f] font-medium transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              admin@shopifree.app
            </a>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t('plan.support.stripe')} <img src="/stripe-logo.png" alt="Stripe" className="h-4 inline-block" />
            </div>
          </div>
        </div>

        {/* Right Column - 4 paid options in a 2x2 grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paidOptions.map(({ id: planId, billing, popular: isPopular }) => {
              const plan = PLAN_FEATURES[planId]
              const price = billing === 'yearly' ? plan.priceYearly : plan.price
              const key = `${planId}_${billing}`
              const isProcessing = processingKey === key
              // This card represents the user's current plan+billing combo — disable it.
              const isCurrentCard = planId === currentPlan && billing === currentBilling && hasActiveSubscription
              const hasDiscount = qualifiesForDiscount && billing === 'monthly'
              const discountedPrice = hasDiscount ? Math.round(price * 0.5) : price
              const monthlyEquivalent = billing === 'yearly' ? (price / 12).toFixed(2) : null

              return (
                <div
                  key={key}
                  className={`relative bg-white rounded-xl border-2 p-5 shadow-sm transition-all ${
                    isPopular
                      ? 'border-[#2d6cb5] shadow-lg shadow-[#2d6cb5]/10'
                      : 'border-gray-200/60 hover:border-[#38bdf8]/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-[#1e3a5f] text-white text-xs font-semibold rounded-full shadow-lg">
                        {t('plan.badge.popular')}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-[#1e3a5f]">
                        {plan.name} {billing === 'yearly' ? t('plan.billing.yearly') : t('plan.billing.monthly')}
                      </h3>
                      {hasDiscount && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                          {t('plan.discount.badge')}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      {hasDiscount ? (
                        <>
                          <span className="text-lg text-gray-400 line-through mr-1">${price}</span>
                          <span className="text-3xl font-bold text-green-600">${discountedPrice}</span>
                          <span className="text-gray-500 text-sm">{t('plan.billing.perMonth')}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-[#1e3a5f]">${price}</span>
                          <span className="text-gray-500 text-sm">
                            {billing === 'yearly' ? t('plan.billing.perYear') : t('plan.billing.perMonth')}
                          </span>
                        </>
                      )}
                    </div>
                    {hasDiscount && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {t('plan.discount.appliedNote')}
                      </p>
                    )}
                    {billing === 'yearly' && !hasDiscount && monthlyEquivalent && (
                      <p className="text-xs text-green-600 mt-1">
                        ≈ ${monthlyEquivalent}{t('plan.billing.perMonth')} · {t('plan.billing.savings', { amount: ((plan.price * 12) - plan.priceYearly).toFixed(0) })}
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
                    onClick={() => handleSelectPlan(planId, billing)}
                    disabled={isCurrentCard || loading}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                      isCurrentCard
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isPopular
                        ? 'bg-[#1e3a5f] text-white hover:bg-[#2d6cb5] shadow-sm'
                        : 'bg-[#f0f7ff] text-[#1e3a5f] hover:bg-[#e0efff]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        {t('plan.buttons.processing')}
                      </>
                    ) : isCurrentCard ? (
                      t('plan.buttons.current')
                    ) : hasDiscount ? (
                      t('plan.discount.getDiscount')
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
      <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
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
