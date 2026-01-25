import { useTheme } from '../ThemeContext'
import type { Order } from '../../../types'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import BankTransferInfo from './BankTransferInfo'

interface Props {
  order: Order
  onBackToStore: () => void
  t: ThemeTranslations
}

export default function OrderConfirmation({ order, onBackToStore, t }: Props) {
  const { theme } = useTheme()

  const showBankTransfer = order.paymentMethod === 'transfer'

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
          {t.orderPlaced}
        </h2>
        <p style={{ color: theme.colors.textMuted }}>
          {order.paymentMethod === 'whatsapp'
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
            </span>
          )}
        </div>
      </div>

      {/* Back to store button */}
      <button
        type="button"
        onClick={onBackToStore}
        className="w-full py-3.5 font-medium transition-all"
        style={{
          backgroundColor: theme.colors.primary,
          color: theme.colors.textInverted,
          borderRadius: theme.radius.md
        }}
      >
        {t.backToStore}
      </button>
    </div>
  )
}
