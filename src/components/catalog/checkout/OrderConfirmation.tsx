import { useTheme } from '../ThemeContext'
import type { Order } from '../../../types'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import BankTransferInfo from './BankTransferInfo'

interface Props {
  order: Order
  whatsapp: string
  onBackToStore: () => void
  t: ThemeTranslations
}

export default function OrderConfirmation({ order, whatsapp, onBackToStore, t }: Props) {
  const { theme } = useTheme()

  const showBankTransfer = order.paymentMethod === 'transfer'
  const showWhatsAppButton = order.paymentMethod === 'whatsapp' && whatsapp

  // Build WhatsApp URL directly here - same pattern as floating WhatsApp button
  const phone = whatsapp?.replace(/\D/g, '') || ''
  const message = encodeURIComponent(`Hola, hice el pedido ${order.orderNumber}`)
  const whatsappUrl = `https://wa.me/${phone}?text=${message}`

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      {/* Success icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#dcfce7' }}
      >
        <svg
          className="w-10 h-10"
          fill="none"
          stroke="#16a34a"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Title */}
      <div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: theme.colors.text }}
        >
          {order.paymentStatus === 'paid' ? t.paymentSuccess : t.orderPlaced}
        </h2>
        <p style={{ color: theme.colors.textMuted }}>
          {order.paymentStatus === 'paid'
            ? t.paymentApproved
            : order.paymentMethod === 'whatsapp'
              ? t.orderProcessing
              : t.orderPending}
        </p>
      </div>

      {/* Order number */}
      <div
        className="w-full p-4"
        style={{
          backgroundColor: `${theme.colors.primary}10`,
          borderRadius: theme.radius.md
        }}
      >
        <p
          className="text-sm mb-1"
          style={{ color: theme.colors.textMuted }}
        >
          {t.orderNumber}
        </p>
        <p
          className="text-2xl font-bold tracking-wider"
          style={{ color: theme.colors.primary }}
        >
          {order.orderNumber}
        </p>
      </div>

      {/* Bank transfer info */}
      {showBankTransfer && (
        <BankTransferInfo t={t} />
      )}

      {/* Order details summary */}
      <div
        className="w-full text-left p-4 border"
        style={{
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md
        }}
      >
        <div className="flex justify-between py-2 border-b" style={{ borderColor: theme.colors.border }}>
          <span style={{ color: theme.colors.textMuted }}>Items</span>
          <span style={{ color: theme.colors.text }}>{order.items.length}</span>
        </div>
        <div className="flex justify-between py-2 border-b" style={{ borderColor: theme.colors.border }}>
          <span style={{ color: theme.colors.textMuted }}>{t.total}</span>
          <span className="font-semibold" style={{ color: theme.colors.text }}>
            ${order.total.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span style={{ color: theme.colors.textMuted }}>
            {order.deliveryMethod === 'pickup' ? t.pickupInStore : t.homeDelivery}
          </span>
          {order.deliveryMethod === 'delivery' && order.deliveryAddress && (
            <span className="text-sm text-right" style={{ color: theme.colors.text }}>
              {order.deliveryAddress.street}
              {order.deliveryAddress.state && `, ${order.deliveryAddress.state}`}
            </span>
          )}
        </div>
      </div>

      {/* WhatsApp section - for whatsapp orders */}
      {showWhatsAppButton && (
        <div className="w-full space-y-3">
          {/* Call to action message */}
          <p
            className="text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t.whatsappCTA}
          </p>

          {/* WhatsApp link - using <a> tag like the floating button for reliable behavior */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 font-semibold text-lg transition-all flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: '#25D366',
              color: '#ffffff',
              borderRadius: theme.radius.md,
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)'
            }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {t.payViaWhatsApp}
          </a>
        </div>
      )}

      {/* Back to store button */}
      <button
        type="button"
        onClick={onBackToStore}
        className="w-full py-3.5 font-medium transition-all"
        style={{
          backgroundColor: showWhatsAppButton ? 'transparent' : theme.colors.primary,
          color: showWhatsAppButton ? theme.colors.text : theme.colors.textInverted,
          borderRadius: theme.radius.md,
          border: showWhatsAppButton ? `1px solid ${theme.colors.border}` : 'none'
        }}
      >
        {t.backToStore}
      </button>
    </div>
  )
}
