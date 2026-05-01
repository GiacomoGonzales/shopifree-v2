import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../ui/Toast'
import { useTranslation } from 'react-i18next'
import { apiUrl } from '../../utils/apiBase'
import { isPayPalSupportedCurrency } from '../../lib/paypal-currencies'
import type { Store } from '../../types'

interface Props {
  store: Store & { id: string }
  onUpdate?: () => void
}

/**
 * PayPal credentials block for the merchant's Payments page. Standard
 * Checkout flavor: the merchant pastes Client ID + Secret + chooses
 * sandbox / live, we validate against PayPal's OAuth endpoint, then
 * persist on store.payments.paypal so the storefront's checkout can
 * use them.
 *
 * Mirrors the MercadoPago and Stripe blocks in Payments.tsx for
 * consistency. No OAuth, no Partner Referrals — those needed
 * Commerce Platform partner approval which doesn't fit Shopifree's
 * current scale.
 */
export default function PayPalConnect({ store, onUpdate }: Props) {
  const { t } = useTranslation('dashboard')
  const { showToast } = useToast()

  const initial = store.payments?.paypal
  const [enabled, setEnabled] = useState<boolean>(!!initial?.enabled)
  const [clientId, setClientId] = useState<string>(initial?.clientId ?? '')
  const [clientSecret, setClientSecret] = useState<string>(initial?.clientSecret ?? '')
  const [sandbox, setSandbox] = useState<boolean>(initial?.sandbox ?? true)
  const [webhookId, setWebhookId] = useState<string>(initial?.webhookId ?? '')
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  // Re-sync when the parent store reloads (e.g. after onUpdate).
  useEffect(() => {
    if (!initial) return
    setEnabled(!!initial.enabled)
    setClientId(initial.clientId ?? '')
    setClientSecret(initial.clientSecret ?? '')
    setSandbox(initial.sandbox ?? true)
    setWebhookId(initial.webhookId ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.clientId, initial?.sandbox])

  // Try the credentials against PayPal's OAuth endpoint before saving — saves
  // the merchant a round-trip if they pasted a typo, and prevents enabled=true
  // configs from sneaking in with broken credentials.
  const validateCreds = async (): Promise<boolean> => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setValidationError(t('payments.paypal.missingCreds'))
      return false
    }
    setValidating(true)
    setValidationError(null)
    try {
      const res = await fetch(apiUrl('/api/paypal-validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          sandbox,
        }),
      })
      const text = await res.text()
      let data: { ok?: boolean; error?: string } = {}
      try { if (text) data = JSON.parse(text) } catch { /* leave empty */ }
      if (!data.ok) {
        const errMsg = data.error || `HTTP ${res.status}`
        // Strip PayPal's verbose stacks so the toast stays readable.
        const friendly = /invalid_client/i.test(errMsg)
          ? t('payments.paypal.invalidCreds')
          : errMsg.slice(0, 200)
        setValidationError(friendly)
        return false
      }
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setValidationError(msg)
      return false
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    if (!store.id) return
    // If toggle is on, verify credentials before persisting. If off, allow
    // saving without creds so the merchant can disable while keeping their
    // existing values for later.
    if (enabled) {
      const ok = await validateCreds()
      if (!ok) {
        showToast(t('payments.paypal.validationFailed'), 'error')
        return
      }
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        'payments.paypal': {
          enabled,
          sandbox,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          ...(webhookId.trim() ? { webhookId: webhookId.trim() } : {}),
          ...(enabled ? { validatedAt: new Date() } : {}),
        },
        updatedAt: new Date(),
      })
      showToast(t('payments.toast.saved'), 'success')
      onUpdate?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      showToast(`PayPal: ${msg}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-[#003087]/20 flex-shrink-0 bg-white border border-gray-100">
          <img src="/paypal-logo.svg" alt="PayPal" className="w-7 h-7 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1e3a5f]">PayPal</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#003087] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003087]"></div>
            </label>
          </div>
          <p className="text-sm text-gray-600 mt-1">{t('payments.paypal.description')}</p>
        </div>
      </div>

      {enabled && (
        <div className="space-y-4 pt-4 mt-4 border-t border-gray-200/60">
          {/* Currency-aware info banner. PayPal only accepts ~25 currencies;
              for everything else (most LatAm: PEN, COP, ARS, CLP, DOP, etc.)
              we auto-convert to USD via a daily ECB rate before sending the
              order to PayPal. The merchant should know they'll receive USD
              in their PayPal account regardless of their store's currency. */}
          {!isPayPalSupportedCurrency(store.currency || 'USD') ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
              <p className="text-xs text-blue-900 font-medium">
                {t('payments.paypal.currencyNoteTitle', { currency: store.currency || 'USD' })}
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                {t('payments.paypal.currencyNoteBody', { currency: store.currency || 'USD' })}
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>{t('payments.paypal.currencyNoteRecommend')}</strong>
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-900">
                {t('payments.paypal.currencySupportedNote', { currency: store.currency || 'USD' })}
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800">
              <strong>{t('payments.paypal.important')}</strong> {t('payments.paypal.needAccount')}{' '}
              <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noopener noreferrer" className="underline">
                {t('payments.paypal.getCredentials')}
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('payments.paypal.clientId')}</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="AfXxx...A1234"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003087]/10 focus:border-[#003087]/40 transition-all font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('payments.paypal.secret')}</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="EXxxx..."
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003087]/10 focus:border-[#003087]/40 transition-all font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                title={showSecret ? t('payments.paypal.hideSecret') : t('payments.paypal.showSecret')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showSecret ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={sandbox}
              onChange={e => setSandbox(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-[#003087] border-gray-300 rounded focus:ring-[#003087]"
            />
            <div className="text-xs">
              <span className="font-medium text-[#1e3a5f]">{t('payments.paypal.sandbox')}</span>
              <p className="text-gray-500">{t('payments.paypal.sandboxDescription')}</p>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
              {t('payments.paypal.webhookId')} <span className="text-gray-400 font-normal">({t('payments.paypal.optional')})</span>
            </label>
            <input
              type="text"
              value={webhookId}
              onChange={(e) => setWebhookId(e.target.value)}
              placeholder="WH-..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003087]/10 focus:border-[#003087]/40 transition-all font-mono text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              {t('payments.paypal.webhookHint')}{' '}
              <code className="bg-gray-100 px-1 rounded text-[10px]">
                https://shopifree.app/api/paypal-webhook?storeId={store.id}
              </code>
            </p>
          </div>

          {validationError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {validationError}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || validating}
            className="w-full px-4 py-2.5 bg-[#003087] text-white rounded-xl text-sm font-semibold hover:bg-[#001f5b] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {validating ? t('payments.paypal.validating') : saving ? t('payments.saving') : t('payments.paypal.saveAndValidate')}
          </button>
        </div>
      )}

      {!enabled && (clientId || clientSecret) && (
        <div className="mt-4 pt-4 border-t border-gray-200/60">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? t('payments.saving') : t('payments.saveChanges')}
          </button>
        </div>
      )}
    </div>
  )
}
