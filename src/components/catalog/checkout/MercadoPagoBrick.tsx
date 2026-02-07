import { useEffect, useState, useRef } from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { useTheme } from '../ThemeContext'
import type { Store } from '../../../types'
import type { ThemeTranslations } from '../../../themes/shared/translations'

interface Props {
  store: Store
  amount: number
  onSubmit: (formData: Record<string, unknown>) => Promise<void>
  onFallbackToRedirect: () => void
  onError: (msg: string) => void
  t: ThemeTranslations
}

// Map store country to MP locale, fallback to language
function getMpLocale(country?: string, lang?: string): 'es-AR' | 'es-MX' | 'es-PE' | 'es-CO' | 'es-CL' | 'es-UY' | 'pt-BR' | 'en-US' {
  switch (country?.toUpperCase()) {
    case 'AR': return 'es-AR'
    case 'MX': return 'es-MX'
    case 'PE': return 'es-PE'
    case 'CO': return 'es-CO'
    case 'CL': return 'es-CL'
    case 'UY': return 'es-UY'
    case 'BR': return 'pt-BR'
    case 'US': return 'en-US'
    default:
      // Fallback to language if no country
      if (lang === 'pt') return 'pt-BR'
      if (lang === 'en') return 'en-US'
      return 'es-AR'
  }
}

export default function MercadoPagoBrick({ store, amount, onSubmit, onFallbackToRedirect, onError, t }: Props) {
  const { theme } = useTheme()
  const [ready, setReady] = useState(false)
  const [sdkInitialized, setSdkInitialized] = useState(false)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasFallenBack = useRef(false)

  const publicKey = store.payments?.mercadopago?.publicKey

  // Initialize SDK
  useEffect(() => {
    if (!publicKey) {
      onFallbackToRedirect()
      return
    }

    try {
      initMercadoPago(publicKey, { locale: getMpLocale(store.location?.country, store.language) })
      setSdkInitialized(true)
    } catch {
      onFallbackToRedirect()
    }
  }, [publicKey, store.language]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback timer: if Brick doesn't become ready in 15s, redirect
  useEffect(() => {
    if (!sdkInitialized || ready) return

    fallbackTimer.current = setTimeout(() => {
      if (!hasFallenBack.current) {
        hasFallenBack.current = true
        onFallbackToRedirect()
      }
    }, 15000)

    return () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    }
  }, [sdkInitialized, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!sdkInitialized) {
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

  return (
    <div className="relative">
      {/* Loading overlay until brick is ready */}
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
        <Payment
          initialization={{ amount }}
          customization={{
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              mercadoPago: 'all',
              ticket: 'all',
              bankTransfer: 'all',
              atm: 'all',
            },
            visual: {
              style: {
                theme: isDark ? 'dark' : 'default',
                customVariables: {
                  formBackgroundColor: theme.colors.background,
                  baseColor: theme.colors.primary,
                },
              },
              hideFormTitle: true,
            },
          }}
          onSubmit={async ({ formData }) => {
            try {
              await onSubmit(formData as unknown as Record<string, unknown>)
            } catch (err) {
              onError(err instanceof Error ? err.message : 'Payment error')
            }
          }}
          onReady={() => {
            setReady(true)
            if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
          }}
          onError={() => {
            if (!hasFallenBack.current) {
              hasFallenBack.current = true
              setTimeout(() => onFallbackToRedirect(), 2000)
            }
          }}
        />
      </div>
    </div>
  )
}
