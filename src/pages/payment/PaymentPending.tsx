import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getThemeTranslations } from '../../themes/shared/translations'

interface PendingOrder {
  orderId: string
  storeId: string
  orderNumber: string
  language?: string
}

export default function PaymentPending() {
  const [searchParams] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [language, setLanguage] = useState<string>('es')

  useEffect(() => {
    const processPayment = async () => {
      try {
        const pendingOrderData = sessionStorage.getItem('pendingOrder')
        if (!pendingOrderData) return

        const pendingOrder: PendingOrder = JSON.parse(pendingOrderData)
        setOrderNumber(pendingOrder.orderNumber)
        setLanguage(pendingOrder.language || 'es')

        // Store the payment ID if available
        const paymentId = searchParams.get('payment_id')
        if (paymentId) {
          const orderRef = doc(db, 'stores', pendingOrder.storeId, 'orders', pendingOrder.orderId)
          await updateDoc(orderRef, {
            paymentId,
            updatedAt: new Date()
          })
        }

        // Don't clear pendingOrder - user might come back
      } catch (error) {
        console.error('Error processing pending payment:', error)
      }
    }

    processPayment()
  }, [searchParams])

  const t = getThemeTranslations(language)

  const handleBackToStore = () => {
    sessionStorage.removeItem('pendingOrder')
    window.history.go(-2)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        {/* Pending icon */}
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t.paymentPending}
        </h1>
        <p className="text-gray-600 mb-6">
          {t.paymentPendingMessage}
        </p>

        {/* Order number */}
        {orderNumber && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">{t.orderNumber}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-wider">
              {orderNumber}
            </p>
          </div>
        )}

        {/* Info */}
        <p className="text-sm text-gray-500 mb-6">
          {t.paymentPendingInfo}
        </p>

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
