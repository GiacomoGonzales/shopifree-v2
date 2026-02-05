import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getThemeTranslations } from '../../themes/shared/translations'

interface PendingOrder {
  orderId: string
  storeId: string
  orderNumber: string
  language?: string
}

function recoverOrderData(searchParams: URLSearchParams): PendingOrder | null {
  try {
    const stored = localStorage.getItem('pendingOrder')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }

  const orderId = searchParams.get('orderId')
  const storeId = searchParams.get('storeId')
  const orderNumber = searchParams.get('orderNumber')
  if (orderId && storeId) {
    return { orderId, storeId, orderNumber: orderNumber || '' }
  }
  return null
}

export default function PaymentFailure() {
  const [searchParams] = useSearchParams()
  const [pendingOrder] = useState<PendingOrder | null>(() => recoverOrderData(searchParams))

  const t = getThemeTranslations(pendingOrder?.language)

  const handleBackToStore = () => {
    // Don't clear localStorage - user might retry
    window.history.go(-2)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        {/* Error icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t.paymentFailure}
        </h1>
        <p className="text-gray-600 mb-6">
          {t.paymentFailureMessage}
        </p>

        {/* Order number */}
        {pendingOrder?.orderNumber && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">{t.orderNumber}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-wider">
              {pendingOrder.orderNumber}
            </p>
          </div>
        )}

        {/* Actions */}
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
