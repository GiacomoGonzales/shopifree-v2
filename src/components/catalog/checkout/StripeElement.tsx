import { useState, useEffect } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useTheme } from '../ThemeContext'
import { getStoreStripe, createPaymentIntent, confirmStripePayment } from '../../../lib/stripe-payments'
import type { Store } from '../../../types'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import type { Stripe, StripeElementsOptions } from '@stripe/stripe-js'

interface Props {
  store: Store
  orderId: string
  amount: number
  currency: string
  onPaymentComplete: (result: { status: string; paymentId: string }) => void
  onError: (msg: string) => void
  t: ThemeTranslations
}

// Inner form component — must be inside <Elements>
function CheckoutForm({ store, orderId, onPaymentComplete, onError, t }: {
  store: Store
  orderId: string
  onPaymentComplete: Props['onPaymentComplete']
  onError: Props['onError']
  t: ThemeTranslations
}) {
  const { theme } = useTheme()
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [ready, setReady] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required'
      })

      if (error) {
        onError(error.message || t.paymentRejected)
        setProcessing(false)
        return
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        // Verify server-side and update order
        const result = await confirmStripePayment(store.id, orderId, paymentIntent.id)
        onPaymentComplete(result)
      } else {
        onError(t.paymentRejected)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t.paymentRejected)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {!ready && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24" style={{ color: theme.colors.primary }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>{t.paymentProcessing}</p>
        </div>
      )}

      <div style={{ display: ready ? 'block' : 'none' }}>
        <PaymentElement onReady={() => setReady(true)} />

        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full mt-4 py-3.5 font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.textInverted,
            borderRadius: theme.radius.md
          }}
        >
          {processing ? (
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            t.payViaStripe
          )}
        </button>
      </div>
    </form>
  )
}

// Outer component — loads Stripe + creates PaymentIntent
export default function StripeElement({ store, orderId, amount, currency, onPaymentComplete, onError, t }: Props) {
  const { theme } = useTheme()
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const publishableKey = store.payments?.stripe?.publishableKey

  useEffect(() => {
    if (!publishableKey) {
      setError('Stripe publishable key not configured')
      return
    }

    setStripePromise(getStoreStripe(publishableKey))

    createPaymentIntent(store.id, orderId, amount, currency)
      .then(({ clientSecret }) => setClientSecret(clientSecret))
      .catch(err => {
        setError(err.message)
        onError(err.message)
      })
  }, [publishableKey, store.id, orderId, amount, currency]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="p-4 rounded-lg text-sm" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
        {error}
      </div>
    )
  }

  if (!stripePromise || !clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24" style={{ color: theme.colors.primary }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm" style={{ color: theme.colors.textMuted }}>{t.paymentProcessing}</p>
      </div>
    )
  }

  const isDark = theme.effects?.darkMode === true

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: isDark ? 'night' : 'stripe',
      variables: {
        colorPrimary: theme.colors.primary,
        borderRadius: theme.radius.md
      }
    }
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm
        store={store}
        orderId={orderId}
        onPaymentComplete={onPaymentComplete}
        onError={onError}
        t={t}
      />
    </Elements>
  )
}
