import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'
import { useShowUpgradeUI } from '../../hooks/useShowUpgradeUI'
import { getEffectivePlan } from '../../lib/stripe'
import { toPlanDate } from '../../lib/plans'
import type { Store } from '../../types'

type BannerType = 'warning' | 'error' | 'info'

interface BannerConfig {
  type: BannerType
  message: string
  action: string
}

const BANNER_STYLES: Record<BannerType, { bg: string; border: string; text: string; icon: string; button: string }> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-500',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
}

// `native`: en la app nativa el aviso es solo texto (sin boton ni link de compra,
// Guideline 3.1.1 de Apple), con textos que no invitan a comprar.
function getBannerConfig(store: Store, t: (key: string, opts?: Record<string, unknown>) => string, native: boolean): BannerConfig | null {
  const now = new Date()
  const sub = store.subscription
  // Mensaje: en nativo usamos la variante informativa (planBanner.native.*)
  const msg = (key: string, opts?: Record<string, unknown>) =>
    t(native ? `planBanner.native.${key}` : `planBanner.${key}`, opts)
  // Plan efectivo: si la prueba vencio pero el cron no bajo store.plan todavia,
  // igual cuenta como 'free'.
  const effectivePlan = getEffectivePlan(store)
  // A merchant has paid in the past as soon as Stripe ever wrote a sub id
  // for their store — this is what distinguishes "trial expired" from
  // "subscription ended", which previously surfaced the same misleading
  // "Tu prueba gratuita ha terminado" banner to paying customers whose
  // sub had been canceled.
  const everPaid = !!sub?.stripeSubscriptionId

  // 1. Payment failed mid-renewal — keep merchant aware before Stripe gives up.
  if (sub?.status === 'past_due') {
    return {
      type: 'error',
      message: msg('pastDue'),
      action: t('planBanner.updatePayment'),
    }
  }

  // 2. Scheduled to cancel at period end — still active right now, but warn.
  // currentPeriodEnd es un timestamp anidado: new Date(Timestamp) daba "Invalid Date".
  const periodEnd = toPlanDate(sub?.currentPeriodEnd)
  if (sub?.cancelAtPeriodEnd && sub?.status === 'active' && periodEnd) {
    return {
      type: 'warning',
      message: msg('cancelAtPeriodEnd', { date: periodEnd.toLocaleDateString() }),
      action: t('planBanner.renew'),
    }
  }

  // 3. Subscription terminated (canceled/incomplete_expired) and merchant
  // dropped to free — distinct copy from the trial-expired case so paid
  // customers don't see "Tu prueba gratuita ha terminado".
  if (everPaid && effectivePlan === 'free' &&
      (sub?.status === 'canceled' || sub?.status === 'incomplete_expired')) {
    return {
      type: 'info',
      message: msg('subscriptionEnded'),
      action: t('planBanner.renew'),
    }
  }

  // 4. Free trial winding down (≤5 days left).
  const trialEnd = toPlanDate(store.trialEndsAt)
  if (trialEnd && !everPaid) {
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft > 0 && daysLeft <= 5) {
      return {
        type: 'warning',
        message: msg('trialExpiring', { days: daysLeft }),
        action: t('planBanner.upgrade'),
      }
    }

    // 5. Trial expired without ever paying, now on free plan.
    if (daysLeft <= 0 && effectivePlan === 'free') {
      return {
        type: 'info',
        message: msg('trialExpired'),
        action: t('planBanner.upgrade'),
      }
    }
  }

  return null
}

export default function PlanBanner({ store }: { store: Store }) {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const showUpgrade = useShowUpgradeUI()
  const [dismissed, setDismissed] = useState(false)

  const banner = useMemo(() => getBannerConfig(store, t, !showUpgrade), [store, t, showUpgrade])

  // En la app nativa (showUpgrade = false) el aviso se muestra igual (estado del
  // plan, pago fallido), pero solo como texto: sin boton hacia la pagina de
  // planes, porque Apple no permite llevar a compras externas.
  if (!banner || dismissed) return null

  const styles = BANNER_STYLES[banner.type]

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-xl px-4 py-3 mb-4 flex items-center gap-3`}>
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {banner.type === 'error' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ) : banner.type === 'warning' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium ${styles.text}`}>
        {banner.message}
      </p>

      {/* Action button (solo web) */}
      {showUpgrade && (
        <Link
          to={localePath('/dashboard/plan')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${styles.button}`}
        >
          {banner.action}
        </Link>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-black/5 ${styles.text} opacity-60 hover:opacity-100`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
