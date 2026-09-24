import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import {
  PLAN_FEATURES,
  STRIPE_PRICES,
  getEffectivePlan,
  createCheckoutSession,
  createBillingPortalSession,
  syncStoreSubscription,
  type PlanType
} from '../../lib/stripe'
import { toPlanDate } from '../../lib/plans'

type BillingCycle = 'monthly' | 'yearly'

// Precio con 2 decimales exactos (Stripe cobra en centavos: 50% de $4.99 = $2.50).
const formatPrice = (n: number) => n.toFixed(2)

// Polling tras volver de Stripe con ?success=true: el plan lo escribe el webhook,
// que puede tardar unos segundos. Reintentamos cada 3s hasta ~36s.
const ACTIVATION_POLL_MS = 3000
const ACTIVATION_MAX_ATTEMPTS = 12

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
  const { localePath, lang } = useLanguage()
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
  // Estado de activacion despues de pagar en Stripe
  const [activation, setActivation] = useState<'idle' | 'pending' | 'slow'>('idle')

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
      // El pago se hizo, pero el plan lo activa el webhook de Stripe: mostramos
      // "activando" y hacemos polling (ver efecto de abajo) hasta que llegue.
      setActivation('pending')
      refreshStore().catch(() => {})
      // Clear URL params
      navigate(selfPath, { replace: true })
    } else if (searchParams.get('canceled') === 'true') {
      toastShownRef.current = true
      showToast(t('plan.toast.canceled'), 'info')
      navigate(selfPath, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // La suscripcion ya quedo escrita por el webhook (plan pago + status vivo)
  const subscriptionActivated =
    ['active', 'trialing'].includes(store?.subscription?.status || '') && store?.plan !== 'free'

  // Polling hasta que el webhook actualice la tienda
  useEffect(() => {
    if (activation !== 'pending') return
    if (subscriptionActivated) {
      setActivation('idle')
      showToast(t('plan.toast.success'), 'success')
      return
    }
    let attempts = 0
    const id = setInterval(() => {
      attempts++
      if (attempts > ACTIVATION_MAX_ATTEMPTS) {
        clearInterval(id)
        setActivation('slow')
        return
      }
      // Si la tienda ya tenia una suscripcion (p. ej. renovacion tras cancelar),
      // pedimos al servidor que la re-sincronice desde Stripe una vez.
      if (attempts === 3 && store?.id && store?.subscription?.stripeSubscriptionId) {
        syncStoreSubscription(store.id).catch(() => {})
      }
      refreshStore().catch(() => {})
    }, ACTIVATION_POLL_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activation, subscriptionActivated])

  const handleSelectPlan = async (planId: Exclude<PlanType, 'free'>, billing: BillingCycle) => {
    if (!store || !user || !firebaseUser) {
      showToast(t('plan.toast.storeNotFound'), 'error')
      return
    }

    const key = `${planId}_${billing}`
    setProcessingKey(key)
    setLoading(true)

    try {
      // Crea la sesion de Stripe Checkout (autenticada; las URLs de vuelta
      // llevan el idioma: /{lang}/dashboard/plan?success=true)
      const data = await createCheckoutSession({
        storeId: store.id,
        plan: planId,
        billing,
        lang,
        applyDiscount: qualifiesForDiscount && billing === 'monthly'
      })

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
      const data = await createBillingPortalSession({ storeId: store?.id, lang })

      if (data.url) {
        window.location.href = data.url
      } else {
        showToast(t('plan.toast.noSubscription'), 'info')
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      if (error instanceof Error && error.message === 'No subscription found') {
        showToast(t('plan.toast.noSubscription'), 'info')
      } else {
        showToast(t('plan.toast.portalError'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  // Plan efectivo (no el guardado): si la prueba ya vencio pero el cron todavia
  // no bajo store.plan a 'free', la UI ya muestra Gratis.
  const currentPlan: PlanType = store ? getEffectivePlan(store) : 'free'
  const subscriptionStatus = store?.subscription?.status
  // Any status where a Stripe subscription still exists and the merchant may need
  // the Billing Portal — deliberately includes the dunning states. Gating this on
  // 'active' alone hid both portal buttons exactly when a merchant most needed
  // them: a failed card leaves the sub past_due/unpaid, keeps paid features live
  // (api/_shared/plan.ts treats past_due as paid), and left no in-app way to fix
  // the card or cancel. Mirrors `liveStatuses` in api/create-checkout.ts, which
  // already routes these subs to the portal instead of a duplicate checkout.
  //
  // 'unpaid' solo habilita el portal (actualizar tarjeta / ver facturas): el
  // webhook y sync ya bajan esas tiendas a free, asi que no cuenta como
  // suscripcion viva para la tarjeta "Bajar a Gratis" ni para ocultar Gratis.
  const hasLiveSubscription = ['active', 'trialing', 'past_due'].includes(
    store?.subscription?.status || ''
  )
  const canManageBilling = hasLiveSubscription || store?.subscription?.status === 'unpaid'
  const stripeIsTrialing = store?.subscription?.status === 'trialing'
  const isNative = Capacitor.isNativePlatform()

  // Signup-time trial (stored on the store document, no Stripe subscription yet).
  const signupTrialEnd = (() => {
    if (!store?.trialEndsAt || store?.subscription) return null
    const d = toPlanDate(store.trialEndsAt)
    return d && d.getTime() > Date.now() ? d : null
  })()

  const isTrialing = stripeIsTrialing || signupTrialEnd !== null
  const effectiveTrialEnd: Date | null =
    stripeIsTrialing ? toPlanDate(store?.subscription?.trialEnd) : signupTrialEnd

  // Fin del periodo actual de la suscripcion (renovacion o vencimiento).
  // Los timestamps anidados de Firestore daban "Invalid Date" con new Date().
  const periodEnd = toPlanDate(store?.subscription?.currentPeriodEnd) ?? toPlanDate(store?.planExpiresAt)
  const cancelAtPeriodEnd = !!store?.subscription?.cancelAtPeriodEnd
  // Suscripcion activa que se renueva sola → "Se renueva el". Cancelada al fin
  // de periodo o plan con vencimiento manual (admin) → "Vence el".
  const renewalLine: string | null = (() => {
    if (store?.subscription) {
      if (!periodEnd) return null
      if (cancelAtPeriodEnd && hasLiveSubscription) {
        return t('plan.expiresOn', { date: periodEnd.toLocaleDateString() })
      }
      if (subscriptionStatus === 'active') {
        return t('plan.renewsOn', { date: periodEnd.toLocaleDateString() })
      }
      return null
    }
    const manualExpiry = toPlanDate(store?.planExpiresAt)
    if (manualExpiry && currentPlan !== 'free') {
      return t('plan.expiresOn', { date: manualExpiry.toLocaleDateString() })
    }
    return null
  })()

  // Mostrar la tarjeta del plan Gratis durante la prueba (para que se entienda
  // que pasa al terminar) y cuando ya esta en Gratis.
  const showFreeCard = !hasLiveSubscription && (isTrialing || currentPlan === 'free')

  // Nombre y funciones de cada plan traducidos (plans.ts queda en espanol
  // como fuente para Sofia; las traducciones van por indice en el i18n).
  const planName = (id: PlanType) => t(`plan.planName.${id}`, { defaultValue: PLAN_FEATURES[id].name })
  const featureText = (id: PlanType, list: 'featureList' | 'comingSoonList', index: number, fallback: string) => {
    const limits = PLAN_FEATURES[id].limits
    return t(`plan.${list}.${id}.${index}`, {
      defaultValue: fallback,
      products: limits.products,
      images: limits.imagesPerProduct,
      categories: limits.categories
    })
  }

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
        <h1 className="text-xl font-semibold text-[#1e3a5f]">{t('plan.title')}</h1>
        <p className="text-[#425466] mt-1">{t('plan.subtitle')}</p>
      </div>

      {/* Activacion tras pagar en Stripe (el webhook puede tardar unos segundos) */}
      {activation === 'pending' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
          <p className="text-sm font-medium text-blue-800">{t('plan.activation.pending')}</p>
        </div>
      )}
      {activation === 'slow' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-medium text-amber-800">{t('plan.activation.slow')}</p>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column - Current Plan */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current plan badge */}
          <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#425466]">{t('plan.current')}</p>
                <p className="font-bold text-[#1e3a5f] text-lg">
                  {planName(currentPlan)}{isTrialing ? ` · ${t('plan.trialSuffix')}` : ''}
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

            {cancelAtPeriodEnd && hasLiveSubscription && (
              <div className="p-3 bg-red-50 rounded-xl mb-4">
                <p className="text-sm text-red-600">{t('plan.cancelAtPeriodEnd')}</p>
              </div>
            )}

            {renewalLine && (
              <p className="text-sm text-[#8898AA] mb-4">{renewalLine}</p>
            )}

            {canManageBilling && (
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
          {hasLiveSubscription && (
            <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-6 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-1">{planName('free')}</h3>
              <p className="text-sm text-[#425466] mb-4">
                {PLAN_FEATURES.free.features.slice(0, 2).map((f, i) => featureText('free', 'featureList', i, f)).join(' · ')}
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm font-medium text-[#425466] bg-[#F6F9FC] border border-[#E6EBF1] rounded-xl hover:bg-[#F1F5F9] transition-all disabled:opacity-50"
              >
                {t('plan.buttons.downgrade')}
              </button>
            </div>
          )}

          {/* Plan Gratis — durante la prueba muestra a que plan pasa la tienda al
              terminar (sin cobros); en Gratis, es el plan actual. */}
          {showFreeCard && (
            <div className={`bg-white rounded-[14px] border p-6 shadow-sm ${currentPlan === 'free' ? 'border-[#2d6cb5]' : 'border-[#E6EBF1]'}`}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <h3 className="font-semibold text-[#1e3a5f]">{planName('free')}</h3>
                <span className="text-sm text-[#425466]">
                  <span className="font-bold text-[#1e3a5f]">${formatPrice(PLAN_FEATURES.free.price)}</span>{' '}
                  <span className="text-xs text-[#8898AA]">{t('plan.currency')} · {t('plan.freeCard.forever')}</span>
                </span>
              </div>
              <p className="text-xs text-[#425466] mb-3">
                {isTrialing ? t('plan.freeCard.afterTrial') : t('plan.freeCard.current')}
              </p>
              <ul className="space-y-1.5">
                {PLAN_FEATURES.free.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs">
                    <svg className="w-4 h-4 text-[#A9B6C6] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[#425466]">{featureText('free', 'featureList', index, feature)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Support */}
          <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-6 shadow-sm">
            <h3 className="font-semibold text-[#1e3a5f] mb-3">{t('plan.support.title')}</h3>
            <p className="text-sm text-[#425466] mb-4">
              {t('plan.support.description')}
            </p>
            <a
              href="mailto:admin@shopifree.app"
              className="flex items-center gap-2 text-sm text-[#2d6cb5] hover:text-[#1e3a5f] font-medium transition-colors mb-4"
            >
admin@shopifree.app
            </a>
            <div className="flex items-center gap-2 text-sm text-[#8898AA]">
{t('plan.support.stripe')} <img src="/stripe-logo.png" alt="Stripe" className="h-4 inline-block" />
            </div>
          </div>
        </div>

        {/* Right Column - 4 paid options in a 2x2 grid */}
        <div className="lg:col-span-2">
          {/* Suscribirse durante la prueba gratis (sin Stripe) cobra hoy y termina
              la prueba: el checkout no agrega dias de prueba. Hay que decirlo. */}
          {signupTrialEnd && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-800">{t('plan.trialChargeNotice')}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paidOptions.map(({ id: planId, billing, popular: isPopular }) => {
              const plan = PLAN_FEATURES[planId]
              const price = billing === 'yearly' ? plan.priceYearly : plan.price
              const key = `${planId}_${billing}`
              const isProcessing = processingKey === key
              // This card represents the user's current plan+billing combo — disable it.
              const isCurrentCard = planId === currentPlan && billing === currentBilling && hasLiveSubscription
              const hasDiscount = qualifiesForDiscount && billing === 'monthly'
              // Mismo redondeo que Stripe (centavos): 50% de $4.99 = $2.50, no $2
              const discountedPrice = hasDiscount ? Math.round(price * 100 * 0.5) / 100 : price
              const monthlyEquivalent = billing === 'yearly' ? (price / 12).toFixed(2) : null

              return (
                <div
                  key={key}
                  className={`relative bg-white rounded-xl border-2 p-5 shadow-sm transition-all ${
                    isPopular
                      ? 'border-[#2d6cb5] shadow-sm shadow-[#2d6cb5]/10'
                      : 'border-[#E6EBF1] hover:border-[#38bdf8]/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-[#1e3a5f] text-white text-xs font-semibold rounded-full shadow-sm">
                        {t('plan.badge.popular')}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-[#1e3a5f]">
                        {planName(planId)} {billing === 'yearly' ? t('plan.billing.yearly') : t('plan.billing.monthly')}
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
                          <span className="text-lg text-[#A9B6C6] line-through mr-1">${formatPrice(price)}</span>
                          <span className="text-3xl font-bold text-green-600">${formatPrice(discountedPrice)}</span>
                          <span className="text-[#8898AA] text-sm"> {t('plan.currency')}{t('plan.billing.perMonth')}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-[#1e3a5f]">${formatPrice(price)}</span>
                          <span className="text-[#8898AA] text-sm">
                            {' '}{t('plan.currency')}{billing === 'yearly' ? t('plan.billing.perYear') : t('plan.billing.perMonth')}
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
                        ≈ ${monthlyEquivalent}{t('plan.billing.perMonth')} · {t('plan.billing.savings', { amount: formatPrice((plan.price * 12) - plan.priceYearly) })}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[#425466]">{featureText(planId, 'featureList', index, feature)}</span>
                      </li>
                    ))}
                    {/* Funciones anunciadas pero no disponibles todavia: no se venden como incluidas */}
                    {plan.comingSoon.map((feature, index) => (
                      <li key={`soon-${index}`} className="flex items-start gap-2 text-xs">
                        <svg className="w-4 h-4 text-[#A9B6C6] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[#8898AA]">
                          {featureText(planId, 'comingSoonList', index, feature)}{' '}
                          <span className="px-1.5 py-0.5 bg-[#F1F5F9] text-[#8898AA] text-[10px] font-semibold rounded-full whitespace-nowrap">
                            {t('plan.comingSoon')}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(planId, billing)}
                    disabled={isCurrentCard || loading}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                      isCurrentCard
                        ? 'bg-[#F1F5F9] text-[#A9B6C6] cursor-not-allowed'
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
      <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('plan.faq.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.changePlan.question')}</h3>
              <p className="text-xs text-[#425466] mt-1">{t('plan.faq.changePlan.answer')}</p>
            </div>
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.paymentMethods.question')}</h3>
              <p className="text-xs text-[#425466] mt-1">{t('plan.faq.paymentMethods.answer')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.cancel.question')}</h3>
              <p className="text-xs text-[#425466] mt-1">{t('plan.faq.cancel.answer')}</p>
            </div>
            <div>
              <h3 className="font-medium text-[#1e3a5f] text-sm">{t('plan.faq.trial.question')}</h3>
              <p className="text-xs text-[#425466] mt-1">{t('plan.faq.trial.answer')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
