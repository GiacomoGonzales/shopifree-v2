import { useTheme } from '../ThemeContext'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import type { Store } from '../../../types'

interface Props {
  store: Store
  loading: boolean
  onSelectWhatsApp: () => void
  onSelectMercadoPago: () => void
  onSelectTransfer: () => void
  onBack: () => void
  error?: string | null
  t: ThemeTranslations
}

export default function PaymentSelector({
  store,
  loading,
  onSelectWhatsApp,
  onSelectMercadoPago,
  onSelectTransfer: _onSelectTransfer,
  onBack,
  error,
  t
}: Props) {
  const { theme } = useTheme()

  const hasMercadoPago = store.payments?.mercadopago?.enabled

  const PaymentOption = ({
    icon,
    title,
    description,
    onClick,
    disabled
  }: {
    icon: React.ReactNode
    title: string
    description: string
    onClick: () => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-4 p-4 border-2 transition-all text-left w-full hover:border-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${theme.colors.primary}10` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium" style={{ color: theme.colors.text }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: theme.colors.textMuted }}>
          {description}
        </p>
      </div>
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{ color: theme.colors.textMuted }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      <h3
        className="text-lg font-semibold"
        style={{ color: theme.colors.text }}
      >
        {t.selectPayment}
      </h3>

      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* WhatsApp - always available */}
        <PaymentOption
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#25D366' }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          }
          title={t.payViaWhatsApp}
          description={t.whatsappPaymentDesc}
          onClick={onSelectWhatsApp}
        />

        {/* MercadoPago - if enabled */}
        {hasMercadoPago && (
          <PaymentOption
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" style={{ color: '#009EE3' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor"/>
                <path d="M15.5 8.5c-.83 0-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5zM8.5 8.5c-.83 0-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5z" fill="white"/>
              </svg>
            }
            title={t.payViaMercadoPago}
            description={t.mercadopagoPaymentDesc}
            onClick={onSelectMercadoPago}
          />
        )}

        {/* Bank Transfer - if configured (placeholder for future) */}
        {/*
        <PaymentOption
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.colors.primary }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          title={t.payViaTransfer}
          description={t.transferPaymentDesc}
          onClick={onSelectTransfer}
        />
        */}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          className="flex items-center justify-center gap-2 py-3"
          style={{ color: theme.colors.textMuted }}
        >
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Procesando...</span>
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="w-full py-3.5 font-medium border transition-all mt-2 disabled:opacity-50"
        style={{
          borderColor: theme.colors.border,
          color: theme.colors.text,
          borderRadius: theme.radius.md
        }}
      >
        {t.backBtn}
      </button>
    </div>
  )
}
