import { useCallback } from 'react'
import { useTheme } from '../ThemeContext'
import type { Order } from '../../../types'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import BankTransferInfo from './BankTransferInfo'

interface Props {
  order: Order
  whatsapp: string
  storeName?: string
  currency?: string
  onBackToStore: () => void
  t: ThemeTranslations
}

export default function OrderConfirmation({ order, whatsapp, storeName, currency = 'USD', onBackToStore, t }: Props) {
  const { theme } = useTheme()

  const showBankTransfer = order.paymentMethod === 'transfer'
  const hasWhatsApp = !!whatsapp

  // Build WhatsApp URL with full order details
  const whatsappUrl = hasWhatsApp ? buildWhatsAppUrl(whatsapp, order, currency, t) : ''

  // Generate and download receipt
  const handleDownloadReceipt = useCallback(() => {
    const currencySymbol = currency === 'PEN' ? 'S/' : currency === 'MXN' ? 'MX$' : currency === 'BRL' ? 'R$' : '$'
    const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()
    const time = order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString()

    const itemsHtml = order.items.map(item => {
      const variations = item.selectedVariations?.map(v => v.value).join(', ')
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left">${item.productName}${variations ? ` - ${variations}` : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${currencySymbol}${item.price.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${currencySymbol}${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.orderNumber} ${order.orderNumber}</title>
<style>body{font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b}
h1{font-size:20px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:16px 0}
th{padding:8px 12px;border-bottom:2px solid #334155;text-align:left;font-size:13px;text-transform:uppercase;color:#64748b}
.total-row td{font-weight:700;border-top:2px solid #334155;border-bottom:none;padding-top:12px}
.header{text-align:center;margin-bottom:24px}.meta{display:flex;justify-content:space-between;font-size:14px;color:#64748b;margin-bottom:16px}
@media print{body{padding:0}}</style></head><body>
<div class="header"><h1>${storeName || t.orderNumber}</h1>
<p style="color:#64748b;margin:4px 0">${t.orderNumber}: <strong>${order.orderNumber}</strong></p>
<p style="color:#64748b;margin:4px 0">${date} - ${time}</p></div>
${order.customer?.name ? `<p style="font-size:14px;color:#64748b"><strong>${t.waCustomer}:</strong> ${order.customer.name}</p>` : ''}
<table><thead><tr>
<th style="text-align:left">Producto</th><th style="text-align:center">${t.waQuantity}</th>
<th style="text-align:right">${t.waUnitPrice}</th><th style="text-align:right">${t.waSubtotal}</th>
</tr></thead><tbody>${itemsHtml}
${order.shippingCost ? `<tr><td colspan="3" style="padding:8px 12px;text-align:right;color:#64748b">${t.shipping}</td><td style="padding:8px 12px;text-align:right">${currencySymbol}${order.shippingCost.toFixed(2)}</td></tr>` : ''}
<tr class="total-row"><td colspan="3" style="padding:8px 12px;text-align:right">${t.total}</td>
<td style="padding:8px 12px;text-align:right">${currencySymbol}${order.total.toFixed(2)}</td></tr>
</tbody></table>
${order.paymentStatus === 'paid' ? `<p style="text-align:center;color:#16a34a;font-weight:600">&#10003; ${t.paymentApproved}</p>` : ''}
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recibo-${order.orderNumber}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [order, currency, storeName, t])

  const currencySymbol = getCurrencySymbol(currency)

  return (
    <div className="flex flex-col items-center text-center gap-3 py-2">
      {/* Success icon + title inline */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#dcfce7' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-left">
          <h2 className="text-lg font-bold" style={{ color: theme.colors.text }}>
            {order.paymentStatus === 'paid' ? t.paymentSuccess : t.orderPlaced}
          </h2>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {order.paymentStatus === 'paid'
              ? t.paymentApproved
              : order.paymentMethod === 'whatsapp'
                ? t.orderProcessing
                : t.orderPending}
          </p>
        </div>
      </div>

      {/* Order number */}
      <div
        className="w-full px-4 py-3"
        style={{
          backgroundColor: `${theme.colors.primary}10`,
          borderRadius: theme.radius.md
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: theme.colors.textMuted }}>{t.orderNumber}</span>
          <span className="text-lg font-bold tracking-wider" style={{ color: theme.colors.primary }}>
            {order.orderNumber}
          </span>
        </div>
      </div>

      {/* Bank transfer info */}
      {showBankTransfer && (
        <BankTransferInfo t={t} />
      )}

      {/* Order summary - compact */}
      <div
        className="w-full text-left px-4 py-2 border text-sm"
        style={{
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md
        }}
      >
        <div className="flex justify-between py-1.5 border-b" style={{ borderColor: theme.colors.border }}>
          <span style={{ color: theme.colors.textMuted }}>Items</span>
          <span style={{ color: theme.colors.text }}>{order.items.length}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b" style={{ borderColor: theme.colors.border }}>
          <span style={{ color: theme.colors.textMuted }}>{t.total}</span>
          <span className="font-semibold" style={{ color: theme.colors.text }}>
            {currencySymbol}{order.total.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between py-1.5">
          <span style={{ color: theme.colors.textMuted }}>
            {order.deliveryMethod === 'pickup' ? t.pickupInStore : t.homeDelivery}
          </span>
          {order.deliveryMethod === 'delivery' && order.deliveryAddress && (
            <span className="text-right" style={{ color: theme.colors.text }}>
              {order.deliveryAddress.street}
              {order.deliveryAddress.state && `, ${order.deliveryAddress.state}`}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full flex flex-col gap-2.5">
        {/* WhatsApp - primary action when available */}
        {hasWhatsApp && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 font-semibold transition-all flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: '#25D366',
              color: '#ffffff',
              borderRadius: theme.radius.md,
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)'
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {t.sendOrderBtn}
          </a>
        )}

        {/* Download receipt + Back to store in a row */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="flex-1 py-3 font-medium transition-all flex items-center justify-center gap-2 hover:opacity-90"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.textInverted,
              borderRadius: theme.radius.md
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t.downloadReceipt}
          </button>

          <button
            type="button"
            onClick={onBackToStore}
            className="flex-1 py-3 font-medium transition-all"
            style={{
              backgroundColor: 'transparent',
              color: theme.colors.text,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            {t.backToStore}
          </button>
        </div>
      </div>
    </div>
  )
}

function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'PEN': return 'S/'
    case 'MXN': case 'COP': case 'ARS': case 'CLP': return '$'
    case 'BRL': return 'R$'
    default: return '$'
  }
}

function buildWhatsAppUrl(whatsapp: string, order: Order, currency: string, t: ThemeTranslations): string {
  const phone = whatsapp.replace(/\D/g, '')
  const sym = getCurrencySymbol(currency)
  const isPaid = order.paymentStatus === 'paid'

  let msg = `*${t.waOrderNumber} ${order.orderNumber}*\n`
  if (isPaid) {
    msg += `*${t.paymentApproved}*\n`
  }
  msg += '\n'

  // Customer
  if (order.customer) {
    msg += `*${t.waCustomer}:*\n`
    if (order.customer.name) msg += `${order.customer.name}\n`
    if (order.customer.phone) msg += `${order.customer.phone}\n`
    msg += '\n'
  }

  // Delivery
  if (order.deliveryMethod === 'pickup') {
    msg += `*${t.pickupInStore}*\n\n`
  } else if (order.deliveryMethod === 'delivery' && order.deliveryAddress) {
    msg += `*${t.homeDelivery}*\n`
    const parts = [order.deliveryAddress.street, order.deliveryAddress.city]
    if (order.deliveryAddress.state) parts.push(order.deliveryAddress.state)
    msg += `${parts.join(', ')}\n`
    if (order.deliveryAddress.reference) msg += `Ref: ${order.deliveryAddress.reference}\n`
    msg += '\n'
  }

  // Items
  if (order.items.length) {
    order.items.forEach(item => {
      msg += `${item.quantity}x ${item.productName} - ${sym}${item.itemTotal.toFixed(2)}\n`
      if (item.selectedVariations?.length) {
        msg += `   (${item.selectedVariations.map(v => v.value).join(', ')})\n`
      }
      if (item.selectedModifiers?.length) {
        item.selectedModifiers.forEach(mod => {
          mod.options.forEach(opt => {
            msg += `   + ${opt.name}${opt.price > 0 ? ` (+${sym}${opt.price.toFixed(2)})` : ''}\n`
          })
        })
      }
    })
    msg += '\n'
  }

  // Totals
  if (order.shippingCost && order.shippingCost > 0) {
    msg += `${t.waSubtotal}: ${sym}${order.subtotal.toFixed(2)}\n`
    msg += `${t.shipping}: ${sym}${order.shippingCost.toFixed(2)}\n`
  }
  msg += `*${t.total}: ${sym}${order.total.toFixed(2)}*\n`

  // Notes
  if (order.notes) {
    msg += `\n${order.notes}\n`
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}
