import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
import { useTranslation } from 'react-i18next'
import { apiUrl } from '../../utils/apiBase'
import type { Store, StorePaymentsPayPal } from '../../types'

interface Props {
  store: Store & { id: string }
  onUpdate?: () => void
}

/**
 * "Connect with PayPal" block for the merchant's Payments page. Wraps the
 * full Partner Referrals OAuth round-trip into a single inline UI:
 *
 *   1. Shows current connection state (none / pending / connected / limited / revoked).
 *   2. "Connect" button → POST /api/paypal-onboard-link → redirect to PayPal.
 *   3. On return PayPal lands at /dashboard/payments?paypal_callback=1&...
 *      with merchantIdInPayPal + permissionsGranted in query params.
 *      We POST those to /api/paypal-onboard-callback which fetches the
 *      canonical merchant status and writes it to Firestore.
 *   4. Sandbox toggle stays editable until the merchant connects.
 *
 * The callback effect runs once per query-string state thanks to the
 * `processedCallbackRef` guard — Strict Mode would otherwise fire it twice
 * and the second call fails the trackingId check.
 */
export default function PayPalConnect({ store, onUpdate }: Props) {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [connecting, setConnecting] = useState(false)
  const [callbackProcessing, setCallbackProcessing] = useState(false)
  const [sandboxToggle, setSandboxToggle] = useState<boolean>(store.payments?.paypal?.sandbox ?? true)
  const processedCallbackRef = useRef<string | null>(null)

  const pp: StorePaymentsPayPal | undefined = store.payments?.paypal
  const isConnected = pp?.onboardingStatus === 'connected'
  const isLimited = pp?.onboardingStatus === 'limited'
  const isPending = pp?.onboardingStatus === 'pending'
  const isRevoked = pp?.onboardingStatus === 'revoked'

  // Handle PayPal's redirect back to us. Reads query params, fires the
  // callback API, then strips the params from the URL so a refresh doesn't
  // re-fire it.
  useEffect(() => {
    const callbackFlag = searchParams.get('paypal_callback')
    if (callbackFlag !== '1' || !firebaseUser) return

    const trackingId = searchParams.get('tracking_id') || ''
    const merchantIdInPayPal = searchParams.get('merchantIdInPayPal') || ''
    const permissionsGranted = searchParams.get('permissionsGranted') || ''

    // De-dupe across React Strict Mode double-invocations
    const callbackKey = `${trackingId}:${merchantIdInPayPal}`
    if (processedCallbackRef.current === callbackKey) return
    processedCallbackRef.current = callbackKey

    if (!trackingId || !merchantIdInPayPal) {
      showToast(t('payments.paypal.callbackMissing'), 'error')
      const next = new URLSearchParams(searchParams)
      next.delete('paypal_callback')
      setSearchParams(next, { replace: true })
      return
    }

    let cancelled = false
    setCallbackProcessing(true)

    const finalize = async () => {
      try {
        const token = await firebaseUser.getIdToken()
        const res = await fetch(apiUrl('/api/paypal-onboard-callback'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            storeId: store.id,
            trackingId,
            merchantIdInPayPal,
            permissionsGranted,
            sandbox: pp?.sandbox ?? sandboxToggle,
          }),
        })
        const text = await res.text()
        const data = text ? JSON.parse(text) : {}
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        if (data.onboardingStatus === 'connected') {
          showToast(t('payments.paypal.connected'), 'success')
        } else if (data.onboardingStatus === 'limited') {
          showToast(t('payments.paypal.limited'), 'info')
        } else {
          showToast(t('payments.paypal.pending'), 'info')
        }
        onUpdate?.()
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Unknown error'
        showToast(`PayPal: ${msg}`, 'error')
      } finally {
        if (!cancelled) setCallbackProcessing(false)
        // Strip the callback params either way so the user can't re-trigger
        const next = new URLSearchParams(searchParams)
        next.delete('paypal_callback')
        next.delete('tracking_id')
        next.delete('merchantIdInPayPal')
        next.delete('permissionsGranted')
        next.delete('consentStatus')
        next.delete('productIntentId')
        next.delete('accountStatus')
        next.delete('isEmailConfirmed')
        setSearchParams(next, { replace: true })
      }
    }
    finalize()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, searchParams.get('paypal_callback')])

  const handleConnect = async () => {
    if (!firebaseUser) return
    setConnecting(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch(apiUrl('/api/paypal-onboard-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId: store.id, sandbox: sandboxToggle }),
      })
      const raw = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (!data.url) throw new Error('PayPal did not return an onboarding URL')
      // Hand off to PayPal — they'll redirect back to /dashboard/payments
      // with the params our useEffect picks up.
      window.location.href = data.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      showToast(`PayPal: ${msg}`, 'error')
      setConnecting(false)
    }
  }

  const statusBadge = (() => {
    if (callbackProcessing) {
      return { text: t('payments.paypal.statusProcessing'), cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    }
    if (isConnected) {
      return { text: t('payments.paypal.statusConnected'), cls: 'bg-green-50 text-green-700 border-green-200' }
    }
    if (isLimited) {
      return { text: t('payments.paypal.statusLimited'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    }
    if (isPending) {
      return { text: t('payments.paypal.statusPending'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    }
    if (isRevoked) {
      return { text: t('payments.paypal.statusRevoked'), cls: 'bg-red-50 text-red-700 border-red-200' }
    }
    return null
  })()

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003087' }}>
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.397 4.403-1.01 6.914-5.44 6.914h-2.19c-.524 0-.968.382-1.05.9l-1.63 10.342a.534.534 0 0 0 .527.618h3.065c.458 0 .85-.336.922-.788l.038-.194.73-4.622.047-.254c.072-.452.464-.788.922-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.489-4.641z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1e3a5f]">{t('payments.paypal.title')}</h3>
            <p className="text-sm text-gray-500">{t('payments.paypal.description')}</p>
          </div>
        </div>
        {statusBadge && (
          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusBadge.cls} flex-shrink-0`}>
            {statusBadge.text}
          </span>
        )}
      </div>

      {/* Sandbox toggle — locked once a real merchant has connected to avoid
          accidentally pointing a connected sandbox account at live and vice versa. */}
      {!pp?.merchantId && (
        <label className="flex items-start gap-3 mt-4 p-3 rounded-lg bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={sandboxToggle}
            onChange={e => setSandboxToggle(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-[#003087] border-gray-300 rounded focus:ring-[#003087]"
          />
          <div className="text-xs">
            <span className="font-medium text-[#1e3a5f]">{t('payments.paypal.sandbox')}</span>
            <p className="text-gray-500">{t('payments.paypal.sandboxDescription')}</p>
          </div>
        </label>
      )}

      {/* Connection details (shown once connected) */}
      {pp?.merchantId && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">{t('payments.paypal.merchantId')}</span>
            <span className="font-mono text-gray-900 truncate">{pp.merchantId}</span>
          </div>
          {pp.sandbox !== undefined && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">{t('payments.paypal.environment')}</span>
              <span className="text-gray-900">{pp.sandbox ? 'Sandbox' : 'Live'}</span>
            </div>
          )}
          {isLimited && (
            <p className="text-[11px] text-amber-700 mt-2">{t('payments.paypal.limitedHint')}</p>
          )}
        </div>
      )}

      {/* Action button */}
      <div className="mt-4">
        {!pp?.merchantId || isRevoked ? (
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting || callbackProcessing}
            className="w-full px-4 py-2.5 bg-[#003087] text-white rounded-xl text-sm font-semibold hover:bg-[#001f5b] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                </svg>
                {t('payments.paypal.redirecting')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/>
                </svg>
                {t('payments.paypal.connect')}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting || callbackProcessing}
            className="w-full px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('payments.paypal.reconnect')}
          </button>
        )}
      </div>
    </div>
  )
}
