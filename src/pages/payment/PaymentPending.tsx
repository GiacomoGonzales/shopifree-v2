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
  storeSubdomain?: string
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

export default function PaymentPending() {
  const [searchParams] = useSearchParams()
  const [orderData] = useState<PendingOrder | null>(() => recoverOrderData(searchParams))
  const [language, setLanguage] = useState<string>(orderData?.language || 'es')

  useEffect(() => {
    const processPayment = async () => {
      if (!orderData) return

      setLanguage(orderData.language || 'es')

      try {
        const paymentId = searchParams.get('payment_id')
        if (paymentId) {
          const orderRef = doc(db, 'stores', orderData.storeId, 'orders', orderData.orderId)
          await updateDoc(orderRef, {
            paymentId,
            updatedAt: new Date()
          })
        }
      } catch (error) {
        console.error('Error processing pending payment:', error)
      }
    }

    processPayment()
  }, [searchParams, orderData])

  const t = getThemeTranslations(language)

  const handleBackToStore = () => {
    const subdomain = (orderData as PendingOrder | null)?.storeSubdomain
    localStorage.removeItem('pendingOrder')
    if (subdomain) {
      window.location.href = `https://${subdomain}.shopifree.app`
    } else {
      window.location.href = '/'
    }
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
