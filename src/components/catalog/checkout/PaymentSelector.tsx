import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import type { Store } from '../../../types'

type PaymentMethod = 'whatsapp' | 'mercadopago' | 'transfer'

interface Props {
  store: Store
  loading: boolean
  onSubmit: (method: PaymentMethod) => void
  onBack: () => void
  error?: string | null
  t: ThemeTranslations
}

export default function PaymentSelector({
  store,
  loading,
  onSubmit,
  onBack,
  error,
  t
}: Props) {
  const { theme } = useTheme()
  const [selected, setSelected] = useState<PaymentMethod>('whatsapp')

  const hasMercadoPago = store.payments?.mercadopago?.enabled

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(selected)
  }

  const PaymentOption = ({
    value,
    icon,
    title,
    description
  }: {
    value: PaymentMethod
    icon: React.ReactNode
    title: string
    description: string
  }) => {
    const isSelected = selected === value

    return (
      <button
        type="button"
        onClick={() => setSelected(value)}
        className="flex items-center gap-4 p-4 border-2 transition-all text-left w-full"
        style={{
          backgroundColor: isSelected ? `${theme.colors.primary}10` : theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md
        }}
      >
        {/* Radio circle */}
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          style={{ borderColor: isSelected ? theme.colors.primary : theme.colors.border }}
        >
          {isSelected && (
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
        </div>

        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${theme.colors.primary}10` }}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-medium" style={{ color: theme.colors.text }}>
            {title}
          </p>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {description}
          </p>
        </div>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          value="whatsapp"
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#25D366' }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          }
          title={t.payViaWhatsApp}
          description={t.whatsappPaymentDesc}
        />

        {/* MercadoPago - if enabled */}
        {hasMercadoPago && (
          <PaymentOption
            value="mercadopago"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" style={{ color: '#009EE3' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor"/>
                <path d="M15.5 8.5c-.83 0-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5zM8.5 8.5c-.83 0-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5z" fill="white"/>
              </svg>
            }
            title={t.payViaMercadoPago}
            description={t.mercadopagoPaymentDesc}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-3.5 font-medium border transition-all disabled:opacity-50"
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
            borderRadius: theme.radius.md
          }}
        >
          {t.backBtn}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3.5 font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.textInverted,
            borderRadius: theme.radius.md
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Procesando...
            </>
          ) : (
            t.sendOrderBtn
          )}
        </button>
      </div>
    </form>
  )
}
