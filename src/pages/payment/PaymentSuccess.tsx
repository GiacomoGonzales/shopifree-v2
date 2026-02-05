import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getThemeTranslations } from '../../themes/shared/translations'

interface PendingOrderData {
  orderId: string
  storeId: string
  orderNumber: string
  language?: string
  storeName?: string
  storeWhatsapp?: string
  currency?: string
  customer?: { name?: string; phone?: string; email?: string }
  deliveryMethod?: 'pickup' | 'delivery'
  deliveryAddress?: { street: string; city: string; state?: string; reference?: string }
  observations?: string
  items?: Array<{
    productName: string
    quantity: number
    itemTotal: number
    selectedModifiers?: Array<{ groupName: string; options: Array<{ name: string; price: number }> }>
    selectedVariations?: Array<{ name: string; value: string }>
  }>
  subtotal?: number
  shippingCost?: number
  total?: number
}

function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'PEN': return 'S/'
    case 'MXN': case 'COP': case 'ARS': case 'CLP': return '$'
    case 'BRL': return 'R$'
    default: return '$'
  }
}

/**
 * Try to recover pending order data from localStorage or URL params
 */
function recoverOrderData(searchParams: URLSearchParams): PendingOrderData | null {
  // Try localStorage first
  try {
    const stored = localStorage.getItem('pendingOrder')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch { /* ignore */ }

  // Fallback: read from URL query params (set by API route in back_urls)
  const orderId = searchParams.get('orderId')
  const storeId = searchParams.get('storeId')
  const orderNumber = searchParams.get('orderNumber')

  if (orderId && storeId) {
    return { orderId, storeId, orderNumber: orderNumber || '' }
  }

  return null
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [orderData, setOrderData] = useState<PendingOrderData | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  useEffect(() => {
    const processPayment = async () => {
      try {
        const data = recoverOrderData(searchParams)
        if (!data) {
          setStatus('error')
          return
        }

        setOrderData(data)

        // Get payment info from URL (MercadoPago adds these)
        const paymentId = searchParams.get('payment_id')
        const paymentStatus = searchParams.get('status')

        if (paymentStatus === 'approved' && paymentId) {
          // Update order in Firestore
          const orderRef = doc(db, 'stores', data.storeId, 'orders', data.orderId)
          await updateDoc(orderRef, {
            paymentStatus: 'paid',
            paymentId,
            status: 'confirmed',
            updatedAt: new Date()
          })
        }

        // If we don't have WhatsApp info, try to fetch store data
        let storeWhatsapp = data.storeWhatsapp
        let storeCurrency = data.currency
        let storeLanguage = data.language
        if (!storeWhatsapp) {
          try {
            const storeDoc = await getDoc(doc(db, 'stores', data.storeId))
            if (storeDoc.exists()) {
              const storeData = storeDoc.data()
              storeWhatsapp = storeData.whatsapp
              storeCurrency = storeData.currency || 'USD'
              storeLanguage = storeData.language || 'es'
              setOrderData(prev => prev ? { ...prev, storeWhatsapp, currency: storeCurrency, language: storeLanguage } : prev)
            }
          } catch { /* non-critical */ }
        }

        // Build WhatsApp URL
        if (storeWhatsapp && data.orderNumber) {
          const url = buildWhatsAppUrl(storeWhatsapp, {
            ...data,
            currency: storeCurrency,
            language: storeLanguage
          })
          setWhatsappUrl(url)
        }

        // Clean up localStorage
        localStorage.removeItem('pendingOrder')

        setStatus('success')
      } catch (error) {
        console.error('Error processing payment:', error)
        setStatus('error')
      }
    }

    processPayment()
  }, [searchParams])

  const t = getThemeTranslations(orderData?.language)

  const handleBackToStore = () => {
    window.history.go(-2)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-600">{t.paymentProcessing}</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.paymentFailure}</h1>
          <p className="text-gray-600 mb-6">{t.paymentFailureMessage}</p>
          <button
            onClick={handleBackToStore}
            className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            {t.backToStore}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md w-full">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t.paymentSuccess}
        </h1>
        <p className="text-gray-600 mb-6">
          {t.paymentSuccessMessage}
        </p>

        {/* Order number */}
        {orderData?.orderNumber && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">{t.orderNumber}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-wider">
              {orderData.orderNumber}
            </p>
          </div>
        )}

        {/* Info */}
        <p className="text-sm text-gray-500 mb-6">
          {t.paymentSuccessInfo}
        </p>

        {/* WhatsApp CTA button */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#20bd5a] transition-colors mb-3"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {orderData?.language === 'en' ? 'Send order via WhatsApp' : orderData?.language === 'pt' ? 'Enviar pedido pelo WhatsApp' : 'Enviar pedido por WhatsApp'}
          </a>
        )}

        {/* Back button */}
        <button
          onClick={handleBackToStore}
          className="w-full px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          {t.backToStore}
        </button>
      </div>
    </div>
  )
}

/**
 * Build WhatsApp URL with order details + PAID status
 */
function buildWhatsAppUrl(whatsapp: string, data: PendingOrderData): string {
  const phone = whatsapp.replace(/\D/g, '')
  const currency = data.currency || 'USD'
  const sym = getCurrencySymbol(currency)
  const lang = data.language || 'es'

  const labels = lang === 'en'
    ? { paid: 'PAID', order: 'Order', customer: 'Customer', phone: 'Phone', delivery: 'Delivery', pickup: 'Store pickup', homeDelivery: 'Home delivery', ref: 'Ref', items: 'Items', subtotal: 'Subtotal', shipping: 'Shipping', total: 'Total', notes: 'Notes', paidVia: 'Paid via MercadoPago' }
    : lang === 'pt'
    ? { paid: 'PAGO', order: 'Pedido', customer: 'Cliente', phone: 'Telefone', delivery: 'Entrega', pickup: 'Retirar na loja', homeDelivery: 'Entrega em domicilio', ref: 'Referencia', items: 'Itens', subtotal: 'Subtotal', shipping: 'Frete', total: 'Total', notes: 'Observacoes', paidVia: 'Pago com MercadoPago' }
    : { paid: 'PAGADO', order: 'Pedido', customer: 'Cliente', phone: 'Tel', delivery: 'Entrega', pickup: 'Retiro en tienda', homeDelivery: 'Delivery', ref: 'Ref', items: 'Productos', subtotal: 'Subtotal', shipping: 'Envio', total: 'Total', notes: 'Notas', paidVia: 'Pagado con MercadoPago' }

  let msg = `*${labels.order} ${data.orderNumber}*\n`
  msg += `*${labels.paidVia}*\n\n`

  // Customer
  if (data.customer) {
    msg += `*${labels.customer}:*\n`
    if (data.customer.name) msg += `${data.customer.name}\n`
    if (data.customer.phone) msg += `${labels.phone}: ${data.customer.phone}\n`
    msg += '\n'
  }

  // Delivery
  if (data.deliveryMethod) {
    msg += `*${labels.delivery}:*\n`
    if (data.deliveryMethod === 'pickup') {
      msg += `${labels.pickup}\n`
    } else if (data.deliveryAddress) {
      msg += `${labels.homeDelivery}\n`
      const parts = [data.deliveryAddress.street, data.deliveryAddress.city]
      if (data.deliveryAddress.state) parts.push(data.deliveryAddress.state)
      msg += `${parts.join(', ')}\n`
      if (data.deliveryAddress.reference) msg += `${labels.ref}: ${data.deliveryAddress.reference}\n`
    }
    msg += '\n'
  }

  // Items
  if (data.items?.length) {
    msg += `*${labels.items}:*\n`
    data.items.forEach(item => {
      msg += `${item.quantity}x ${item.productName} - ${sym}${item.itemTotal.toFixed(2)}\n`
    })
    msg += '\n'
  }

  // Totals
  if (data.shippingCost && data.shippingCost > 0) {
    msg += `${labels.subtotal}: ${sym}${(data.subtotal || 0).toFixed(2)}\n`
    msg += `${labels.shipping}: ${sym}${data.shippingCost.toFixed(2)}\n`
  }
  if (data.total) {
    msg += `*${labels.total}: ${sym}${data.total.toFixed(2)}*\n`
  }

  // Notes
  if (data.observations) {
    msg += `\n*${labels.notes}:* ${data.observations}\n`
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}
